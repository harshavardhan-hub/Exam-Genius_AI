const pool = require('../config/database');

/**
 * ExamGenius AI - Attempt Controller
 * Handles test attempt lifecycle and scoring
 */

class AttemptController {
    // Start a new test attempt
    static async startAttempt(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { test_id } = req.body;
            const userId = req.user.userId;

            console.log('🚀 Starting ExamGenius AI test attempt:', { userId, test_id });

            // Validate test exists and is active
            const testResult = await client.query(`
                SELECT id, title, duration_minutes, is_active
                FROM tests
                WHERE id = $1 AND is_active = true
            `, [test_id]);

            if (testResult.rows.length === 0) {
                throw new Error('Test not found or inactive');
            }

            const test = testResult.rows[0];

            // Check for existing incomplete attempts
            const existingAttempt = await client.query(`
                SELECT id FROM attempts
                WHERE user_id = $1 AND test_id = $2 AND completed = false
            `, [userId, test_id]);

            if (existingAttempt.rows.length > 0) {
                throw new Error('You already have an active attempt for this test');
            }

            // Create attempt record
            const attemptResult = await client.query(`
                INSERT INTO attempts (user_id, test_id, started_at, attempt_type)
                VALUES ($1, $2, NOW(), 'regular')
                RETURNING id, started_at
            `, [userId, test_id]);

            const attempt = attemptResult.rows[0];

            // Get all questions for this test
            const questionsResult = await client.query(`
                SELECT
                    q.id,
                    q.question_text,
                    q.options,
                    q.correct_option,
                    q.negative_mark,
                    q.time_limit_seconds,
                    t.name as topic_name,
                    COALESCE(tq.sequence_order, 0) as sequence_order
                FROM questions q
                INNER JOIN topics t ON q.topic_id = t.id
                INNER JOIN test_questions tq ON q.id = tq.question_id
                WHERE tq.test_id = $1
                ORDER BY tq.sequence_order ASC
            `, [test_id]);

            await client.query('COMMIT');

            console.log(`✅ Test attempt ${attempt.id} started with ${questionsResult.rows.length} questions`);

            res.json({
                attempt_id: attempt.id,
                test_title: test.title,
                started_at: attempt.started_at,
                questions: questionsResult.rows,
                total_questions: questionsResult.rows.length
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error starting test attempt:', error);
            res.status(500).json({
                error: error.message || 'Failed to start test attempt'
            });
        } finally {
            client.release();
        }
    }

    // Submit answer for a question
    static async submitAnswer(req, res) {
        try {
            const { attemptId } = req.params;
            const { question_id, selected_option, time_taken_seconds } = req.body;
            const userId = req.user.userId;

            console.log('📝 Submitting answer:', { attemptId, question_id, selected_option });

            // Verify attempt belongs to user and is not completed
            const attemptResult = await pool.query(`
                SELECT id, completed, test_id
                FROM attempts
                WHERE id = $1 AND user_id = $2
            `, [attemptId, userId]);

            if (attemptResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'Attempt not found'
                });
            }

            const attempt = attemptResult.rows[0];
            if (attempt.completed) {
                return res.status(400).json({
                    error: 'Attempt already completed'
                });
            }

            // Get question details
            const questionResult = await pool.query(`
                SELECT q.id, q.correct_option, q.negative_mark
                FROM questions q
                INNER JOIN test_questions tq ON q.id = tq.question_id
                WHERE q.id = $1 AND tq.test_id = $2
            `, [question_id, attempt.test_id]);

            if (questionResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'Question not found in this test'
                });
            }

            const question = questionResult.rows[0];
            const isCorrect = selected_option === question.correct_option;
            let marksObtained = 0;

            // ✅ FIX: Updated scoring logic - each question worth equal weightage out of 100, -2 for wrong answers
            if (selected_option) {
                if (isCorrect) {
                    marksObtained = 1; // 1 mark for correct answer (will be scaled to 100 later)
                } else {
                    marksObtained = -2; // -2 marks for incorrect answer
                }
            }

            // Insert or update user answer
            await pool.query(`
                INSERT INTO user_answers (
                    attempt_id, question_id, user_answer, is_correct,
                    marks_obtained, time_taken_seconds
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (attempt_id, question_id)
                DO UPDATE SET
                    user_answer = $3,
                    is_correct = $4,
                    marks_obtained = $5,
                    time_taken_seconds = $6,
                    answered_at = NOW()
            `, [attemptId, question_id, selected_option, isCorrect, marksObtained, time_taken_seconds]);

            console.log('✅ Answer submitted:', { isCorrect, marksObtained });

            res.json({
                is_correct: isCorrect,
                correct_option: question.correct_option,
                marks_obtained: marksObtained,
                message: 'Answer submitted successfully'
            });

        } catch (error) {
            console.error('❌ Error submitting answer:', error);
            res.status(500).json({
                error: 'Failed to submit answer'
            });
        }
    }

    // Finish test attempt
    static async finishAttempt(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { attemptId } = req.params;
            const userId = req.user.userId;

            console.log('🏁 Finishing ExamGenius AI test attempt:', attemptId);

            // Verify attempt belongs to user and is not already completed
            const attemptResult = await client.query(`
                SELECT id, test_id, completed
                FROM attempts
                WHERE id = $1 AND user_id = $2
            `, [attemptId, userId]);

            if (attemptResult.rows.length === 0) {
                throw new Error('Attempt not found');
            }

            const attempt = attemptResult.rows[0];
            if (attempt.completed) {
                throw new Error('Attempt already completed');
            }

            // Calculate total score and statistics
            const scoreResult = await client.query(`
                SELECT
                    COUNT(*) as total_questions,
                    SUM(CASE WHEN ua.marks_obtained > 0 THEN 1 ELSE 0 END) as correct_answers,
                    SUM(CASE WHEN ua.user_answer IS NOT NULL AND ua.marks_obtained <= 0 THEN 1 ELSE 0 END) as incorrect_answers,
                    SUM(CASE WHEN ua.user_answer IS NULL THEN 1 ELSE 0 END) as unanswered,
                    COALESCE(SUM(ua.marks_obtained), 0) as total_marks,
                    COALESCE(AVG(ua.time_taken_seconds), 0) as avg_time_per_question
                FROM user_answers ua
                INNER JOIN test_questions tq ON ua.question_id = tq.question_id
                WHERE ua.attempt_id = $1 AND tq.test_id = $2
            `, [attemptId, attempt.test_id]);

            const stats = scoreResult.rows[0];

            // ✅ FIX: Calculate percentage score out of 100
            const totalQuestions = parseInt(stats.total_questions);
            const correctAnswers = parseInt(stats.correct_answers);
            const incorrectAnswers = parseInt(stats.incorrect_answers);
            
            // Each correct answer gets equal weightage out of 100
            const correctMarks = correctAnswers * (100 / totalQuestions);
            const negativeMarks = incorrectAnswers * 2; // -2 for each wrong answer
            const finalScore = Math.max(0, correctMarks - negativeMarks); // Ensure non-negative score

            // Update attempt as completed
            await client.query(`
                UPDATE attempts
                SET
                    completed = true,
                    finished_at = NOW(),
                    score = $2,
                    total_questions = $3,
                    correct_answers = $4,
                    incorrect_answers = $5,
                    unanswered = $6,
                    total_marks = $7,
                    avg_time_per_question = $8
                WHERE id = $1
            `, [
                attemptId, finalScore, stats.total_questions, stats.correct_answers,
                stats.incorrect_answers, stats.unanswered, stats.total_marks, stats.avg_time_per_question
            ]);

            await client.query('COMMIT');

            console.log(`✅ Test attempt completed: Score ${finalScore.toFixed(1)}/100`);

            res.json({
                message: 'ExamGenius AI test completed successfully',
                attempt_id: attemptId,
                score: parseFloat(finalScore.toFixed(1)),
                statistics: {
                    total_questions: parseInt(stats.total_questions),
                    correct_answers: parseInt(stats.correct_answers),
                    incorrect_answers: parseInt(stats.incorrect_answers),
                    unanswered: parseInt(stats.unanswered),
                    total_marks: parseFloat(stats.total_marks),
                    avg_time_per_question: parseFloat(stats.avg_time_per_question)
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error finishing test attempt:', error);
            res.status(500).json({
                error: error.message || 'Failed to finish test attempt'
            });
        } finally {
            client.release();
        }
    }

    // Get detailed report for an attempt
    static async getAttemptReport(req, res) {
        try {
            const { attemptId } = req.params;
            const userId = req.user.userId;

            console.log('📊 Generating ExamGenius AI report for attempt:', attemptId);

            // Get attempt details
            const attemptResult = await pool.query(`
                SELECT
                    a.id,
                    a.score,
                    a.total_questions,
                    a.correct_answers,
                    a.incorrect_answers,
                    a.unanswered,
                    a.total_marks,
                    a.avg_time_per_question,
                    a.started_at,
                    a.finished_at,
                    a.attempt_type,
                    t.title as test_title,
                    t.description as test_description,
                    u.name as user_name
                FROM attempts a
                INNER JOIN tests t ON a.test_id = t.id
                INNER JOIN users u ON a.user_id = u.id
                WHERE a.id = $1 AND a.user_id = $2 AND a.completed = true
            `, [attemptId, userId]);

            if (attemptResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'Completed attempt not found'
                });
            }

            const attempt = attemptResult.rows[0];

            // Get detailed answers with question information
            const answersResult = await pool.query(`
                SELECT
                    ua.question_id,
                    ua.user_answer,
                    ua.is_correct,
                    ua.marks_obtained,
                    ua.time_taken_seconds,
                    q.question_text,
                    q.options,
                    q.correct_option,
                    tp.name as topic_name,
                    ROW_NUMBER() OVER (ORDER BY tq.sequence_order) as question_number
                FROM user_answers ua
                INNER JOIN questions q ON ua.question_id = q.id
                INNER JOIN topics tp ON q.topic_id = tp.id
                INNER JOIN test_questions tq ON q.id = tq.question_id AND tq.test_id = (
                    SELECT test_id FROM attempts WHERE id = $1
                )
                WHERE ua.attempt_id = $1
                ORDER BY tq.sequence_order
            `, [attemptId]);

            // Format options for display
            const formattedAnswers = answersResult.rows.map(answer => ({
                ...answer,
                formatted_options: answer.options || {},
                correct_answer: answer.correct_option,
                time_used: answer.time_taken_seconds
            }));

            // Get topic-wise summary
            const topicSummaryResult = await pool.query(`
                SELECT
                    tp.name as topic,
                    COUNT(*) as total_questions,
                    SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) as correct_count,
                    SUM(CASE WHEN ua.user_answer IS NOT NULL AND NOT ua.is_correct THEN 1 ELSE 0 END) as incorrect_count,
                    SUM(CASE WHEN ua.user_answer IS NULL THEN 1 ELSE 0 END) as unanswered_count,
                    COALESCE(SUM(ua.marks_obtained), 0) as total_marks,
                    COALESCE(AVG(ua.time_taken_seconds), 0) as avg_time_seconds
                FROM user_answers ua
                INNER JOIN questions q ON ua.question_id = q.id
                INNER JOIN topics tp ON q.topic_id = tp.id
                WHERE ua.attempt_id = $1
                GROUP BY tp.name
                ORDER BY tp.name
            `, [attemptId]);

            console.log(`✅ Report generated: ${formattedAnswers.length} questions, ${topicSummaryResult.rows.length} topics`);

            res.json({
                attempt,
                answers: formattedAnswers,
                topic_summary: topicSummaryResult.rows
            });

        } catch (error) {
            console.error('❌ Error generating report:', error);
            res.status(500).json({
                error: 'Failed to generate report'
            });
        }
    }

    // Get all attempts for current user
    static async getAllAttempts(req, res) {
        try {
            const userId = req.user.userId;
            const { limit = 50, offset = 0 } = req.query;

            console.log('📋 Fetching all attempts for user:', userId);

            const attemptsResult = await pool.query(`
                SELECT
                    a.id as attempt_id,
                    a.test_id,
                    a.score,
                    a.total_questions,
                    a.correct_answers,
                    a.incorrect_answers,
                    a.unanswered,
                    a.started_at,
                    a.finished_at,
                    a.completed,
                    a.attempt_type,
                    a.avg_time_per_question,
                    t.title as test_title,
                    t.duration_minutes
                FROM attempts a
                INNER JOIN tests t ON a.test_id = t.id
                WHERE a.user_id = $1 AND a.completed = true
                ORDER BY a.started_at DESC
                LIMIT $2 OFFSET $3
            `, [userId, parseInt(limit), parseInt(offset)]);

            console.log(`✅ Found ${attemptsResult.rows.length} attempts`);

            // ✅ FIX: Ensure proper response format that frontend expects
            res.json({
                attempts: attemptsResult.rows // Frontend expects 'attempts' key
            });

        } catch (error) {
            console.error('❌ Error fetching attempts:', error);
            res.status(500).json({ error: 'Failed to fetch attempts' });
        }
    }
}

module.exports = AttemptController;
