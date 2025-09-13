const pool = require('../config/database');

/**
 * ExamGenius AI - AI Practice Controller
 * Fixed: 30min timer, score calculation, finish early handling
 */

class AIPracticeController {
    // Get AI practice questions
    static async getQuestions(req, res) {
        try {
            const { aiAttemptId } = req.params;
            const userId = req.user.userId;

            console.log('📚 Fetching AI practice questions for attempt:', aiAttemptId);

            const aiAttemptResult = await pool.query(`
                SELECT apa.id, apa.session_id, apa.completed, aps.session_name, aps.generated_count
                FROM ai_practice_attempts apa
                INNER JOIN ai_practice_sessions aps ON apa.session_id = aps.id
                WHERE apa.id = $1 AND apa.user_id = $2
            `, [aiAttemptId, userId]);

            if (aiAttemptResult.rows.length === 0) {
                return res.status(404).json({ error: 'AI practice attempt not found' });
            }

            const { session_id, completed, session_name, generated_count } = aiAttemptResult.rows[0];

            if (completed) {
                return res.status(400).json({ error: 'AI practice session already completed' });
            }

            // Get AI generated questions from this specific session
            const questionsResult = await pool.query(`
                SELECT
                    id,
                    question_text,
                    options,
                    correct_option,
                    topic,
                    negative_mark,
                    time_limit_seconds,
                    sequence_order
                FROM ai_generated_questions
                WHERE session_id = $1
                ORDER BY sequence_order ASC
            `, [session_id]);

            console.log(`✅ Found ${questionsResult.rows.length} AI practice questions`);

            if (questionsResult.rows.length === 0) {
                return res.status(400).json({ 
                    error: 'No AI questions found in this session. Please generate questions first.' 
                });
            }

            res.json({
                questions: questionsResult.rows,
                ai_attempt_id: aiAttemptId,
                total_questions: questionsResult.rows.length,
                // ✅ FIX: Set default duration to 30 minutes (1800 seconds)
                default_duration_seconds: 1800,
                session_info: {
                    name: session_name,
                    generated_count: generated_count
                }
            });

        } catch (error) {
            console.error('❌ Error fetching AI practice questions:', error);
            res.status(500).json({ error: 'Failed to fetch AI practice questions' });
        }
    }

    // Submit answer to AI practice question
    static async submitAnswer(req, res) {
        try {
            const { aiAttemptId } = req.params;
            const { ai_question_id, selected_option, time_taken_seconds } = req.body;
            const userId = req.user.userId;

            console.log('💡 Submitting AI practice answer:', { aiAttemptId, ai_question_id, selected_option });

            // Verify AI attempt belongs to user and is not completed
            const aiAttemptResult = await pool.query(`
                SELECT id, completed
                FROM ai_practice_attempts
                WHERE id = $1 AND user_id = $2
            `, [aiAttemptId, userId]);

            if (aiAttemptResult.rows.length === 0) {
                return res.status(404).json({ error: 'AI practice attempt not found' });
            }

            if (aiAttemptResult.rows[0].completed) {
                return res.status(400).json({ error: 'AI practice session already completed' });
            }

            // Get AI question details
            const questionResult = await pool.query(`
                SELECT id, correct_option, negative_mark
                FROM ai_generated_questions
                WHERE id = $1
            `, [ai_question_id]);

            if (questionResult.rows.length === 0) {
                return res.status(404).json({ error: 'AI question not found' });
            }

            const question = questionResult.rows[0];
            const isCorrect = selected_option === question.correct_option;
            let marksObtained = 0;

            if (selected_option) {
                if (isCorrect) {
                    marksObtained = 1; // 1 mark for correct answer
                } else {
                    marksObtained = -2; // -2 marks for incorrect answer
                }
            }

            // Insert AI practice answer
            await pool.query(`
                INSERT INTO ai_practice_answers (
                    ai_attempt_id, ai_question_id, user_answer, is_correct,
                    marks_obtained, time_taken_seconds
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (ai_attempt_id, ai_question_id)
                DO UPDATE SET
                    user_answer = $3,
                    is_correct = $4,
                    marks_obtained = $5,
                    time_taken_seconds = $6,
                    answered_at = NOW()
            `, [aiAttemptId, ai_question_id, selected_option, isCorrect, marksObtained, time_taken_seconds]);

            console.log('✅ AI practice answer submitted:', { isCorrect, marksObtained });

            res.json({
                is_correct: isCorrect,
                correct_option: question.correct_option,
                marks_obtained: marksObtained,
                message: isCorrect ? 'Great! You got it right this time!' : 'Keep practicing this concept!'
            });

        } catch (error) {
            console.error('❌ Error submitting AI practice answer:', error);
            res.status(500).json({ error: 'Failed to submit AI practice answer' });
        }
    }

    // ✅ FIX: Finish AI practice session - handles early finish and proper score calculation
    static async finishSession(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { aiAttemptId } = req.params;
            const userId = req.user.userId;

            console.log('🏁 Finishing AI practice session:', aiAttemptId);

            // Verify AI attempt belongs to user
            const aiAttemptResult = await client.query(`
                SELECT apa.id, apa.session_id, apa.completed
                FROM ai_practice_attempts apa
                WHERE apa.id = $1 AND apa.user_id = $2
            `, [aiAttemptId, userId]);

            if (aiAttemptResult.rows.length === 0) {
                throw new Error('AI practice attempt not found');
            }

            if (aiAttemptResult.rows[0].completed) {
                // If already completed, return current stats
                const completedAttempt = await client.query(`
                    SELECT score, total_questions, correct_answers, incorrect_answers, unanswered
                    FROM ai_practice_attempts
                    WHERE id = $1
                `, [aiAttemptId]);

                await client.query('COMMIT');
                
                return res.json({
                    message: 'AI practice session already completed',
                    score: parseFloat(completedAttempt.rows[0].score || 0),
                    already_completed: true,
                    statistics: {
                        total_questions: parseInt(completedAttempt.rows[0].total_questions || 0),
                        correct_answers: parseInt(completedAttempt.rows[0].correct_answers || 0),
                        incorrect_answers: parseInt(completedAttempt.rows[0].incorrect_answers || 0),
                        unanswered: parseInt(completedAttempt.rows[0].unanswered || 0)
                    }
                });
            }

            const sessionId = aiAttemptResult.rows[0].session_id;

            // ✅ FIX: Get all questions in this session (not just answered ones)
            const allQuestionsResult = await client.query(`
                SELECT COUNT(*) as total_questions
                FROM ai_generated_questions
                WHERE session_id = $1
            `, [sessionId]);

            const totalQuestions = parseInt(allQuestionsResult.rows[0].total_questions || 0);

            // ✅ FIX: Calculate score based on actual answers submitted
            const scoreResult = await client.query(`
                SELECT
                    COUNT(*) as answered_questions,
                    SUM(CASE WHEN apa.marks_obtained > 0 THEN 1 ELSE 0 END) as correct_answers,
                    SUM(CASE WHEN apa.user_answer IS NOT NULL AND apa.marks_obtained <= 0 THEN 1 ELSE 0 END) as incorrect_answers,
                    COALESCE(SUM(apa.marks_obtained), 0) as total_marks,
                    COALESCE(AVG(apa.time_taken_seconds), 0) as avg_time_per_question
                FROM ai_practice_answers apa
                INNER JOIN ai_generated_questions agq ON apa.ai_question_id = agq.id
                WHERE apa.ai_attempt_id = $1 AND agq.session_id = $2
            `, [aiAttemptId, sessionId]);

            const stats = scoreResult.rows[0];
            
            const answeredQuestions = parseInt(stats.answered_questions || 0);
            const correctAnswers = parseInt(stats.correct_answers || 0);
            const incorrectAnswers = parseInt(stats.incorrect_answers || 0);
            const unansweredQuestions = totalQuestions - answeredQuestions;

            // ✅ FIX: Calculate percentage score out of 100
            let finalScore = 0;
            if (totalQuestions > 0) {
                const correctMarks = correctAnswers * (100 / totalQuestions);
                const negativeMarks = incorrectAnswers * 2; // -2 for each wrong answer
                finalScore = Math.max(0, correctMarks - negativeMarks); // Ensure non-negative score
            }

            console.log(`📊 AI Practice Stats: ${correctAnswers}/${totalQuestions} correct, ${incorrectAnswers} wrong, ${unansweredQuestions} unanswered`);
            console.log(`📊 Final Score: ${finalScore.toFixed(2)}%`);

            // ✅ FIX: Update AI attempt as completed with proper stats
            await client.query(`
                UPDATE ai_practice_attempts
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
                aiAttemptId, 
                finalScore, 
                totalQuestions, 
                correctAnswers,
                incorrectAnswers, 
                unansweredQuestions, 
                stats.total_marks, 
                stats.avg_time_per_question
            ]);

            await client.query('COMMIT');

            console.log(`✅ AI practice session completed: Score ${finalScore.toFixed(1)}/100`);

            res.json({
                message: 'AI practice session completed successfully',
                score: parseFloat(finalScore.toFixed(2)), // ✅ FIX: Return with 2 decimal places
                improvement_message: finalScore >= 70 
                    ? 'Excellent! You\'ve improved significantly on these concepts!' 
                    : finalScore > 0 
                    ? 'Good practice! Keep working on these topics for better understanding.'
                    : 'No answers submitted. Practice more to improve your skills!',
                statistics: {
                    total_questions: totalQuestions,
                    correct_answers: correctAnswers,
                    incorrect_answers: incorrectAnswers,
                    unanswered: unansweredQuestions,
                    total_marks: parseFloat(stats.total_marks || 0),
                    avg_time_per_question: parseFloat(stats.avg_time_per_question || 0)
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error finishing AI practice:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to finish AI practice session' 
            });
        } finally {
            client.release();
        }
    }

    // Get AI practice report
    static async getReport(req, res) {
        try {
            const { aiAttemptId } = req.params;
            const userId = req.user.userId;

            console.log('📊 Generating AI practice report for attempt:', aiAttemptId);

            // Get AI attempt details with session info
            const attemptResult = await pool.query(`
                SELECT
                    apa.id,
                    apa.score,
                    apa.total_questions,
                    apa.correct_answers,
                    apa.incorrect_answers,
                    apa.unanswered,
                    apa.total_marks,
                    apa.avg_time_per_question,
                    apa.started_at,
                    apa.finished_at,
                    apa.completed,
                    aps.original_attempt_id,
                    aps.session_name,
                    aps.generated_count
                FROM ai_practice_attempts apa
                INNER JOIN ai_practice_sessions aps ON apa.session_id = aps.id
                WHERE apa.id = $1 AND apa.user_id = $2
            `, [aiAttemptId, userId]);

            if (attemptResult.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'AI practice attempt not found',
                    status: 'not_found'
                });
            }

            const attempt = attemptResult.rows[0];

            // ✅ FIX: Check if attempt is completed
            if (!attempt.completed) {
                return res.status(400).json({ 
                    error: 'AI practice session is not completed yet',
                    status: 'incomplete'
                });
            }

            // Get detailed AI practice answers for THIS session only
            const answersResult = await pool.query(`
                SELECT
                    apa.ai_question_id,
                    apa.user_answer,
                    apa.is_correct,
                    apa.marks_obtained,
                    apa.time_taken_seconds,
                    agq.question_text,
                    agq.options,
                    agq.correct_option,
                    agq.topic as topic_name,
                    ROW_NUMBER() OVER (ORDER BY agq.sequence_order) as question_number
                FROM ai_practice_answers apa
                INNER JOIN ai_generated_questions agq ON apa.ai_question_id = agq.id
                WHERE apa.ai_attempt_id = $1
                ORDER BY agq.sequence_order
            `, [aiAttemptId]);

            // Format options for display
            const formattedAnswers = answersResult.rows.map(answer => ({
                ...answer,
                formatted_options: typeof answer.options === 'string' 
                    ? JSON.parse(answer.options) 
                    : answer.options,
                correct_answer: answer.correct_option,
                time_used: answer.time_taken_seconds
            }));

            console.log(`✅ AI practice report generated: ${formattedAnswers.length} questions, score: ${attempt.score}%`);

            res.json({
                attempt: {
                    ...attempt,
                    session_type: 'Targeted Practice Based on Your Mistakes'
                },
                answers: formattedAnswers
            });

        } catch (error) {
            console.error('❌ Error generating AI practice report:', error);
            res.status(500).json({ error: 'Failed to generate AI practice report' });
        }
    }

    // Get all AI practice attempts for user
    static async getAllAttempts(req, res) {
        try {
            const userId = req.user.userId;
            const { limit = 50, offset = 0 } = req.query;

            console.log('📋 Fetching AI practice attempts for user:', userId);

            const attemptsResult = await pool.query(`
                SELECT
                    apa.id as attempt_id,
                    apa.score,
                    apa.total_questions,
                    apa.correct_answers,
                    apa.incorrect_answers,
                    apa.unanswered,
                    apa.started_at,
                    apa.finished_at,
                    apa.completed,
                    apa.attempt_type,
                    apa.avg_time_per_question,
                    aps.session_name,
                    aps.generated_count
                FROM ai_practice_attempts apa
                INNER JOIN ai_practice_sessions aps ON apa.session_id = aps.id
                WHERE apa.user_id = $1 AND apa.completed = true
                ORDER BY apa.started_at DESC
                LIMIT $2 OFFSET $3
            `, [userId, parseInt(limit), parseInt(offset)]);

            console.log(`✅ Found ${attemptsResult.rows.length} AI practice attempts`);

            res.json({
                attempts: attemptsResult.rows.map(attempt => ({
                    ...attempt,
                    test_title: `🤖 AI Practice: ${attempt.session_name || 'Based on Mistakes'}`,
                    is_ai_practice: true
                }))
            });

        } catch (error) {
            console.error('❌ Error fetching AI practice attempts:', error);
            res.status(500).json({ error: 'Failed to fetch AI practice attempts' });
        }
    }

    // Start AI practice session
    static async startSession(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { original_attempt_id } = req.body;
            const userId = req.user.userId;

            console.log('🎯 Starting AI practice session for user:', userId);

            // Verify original attempt exists and belongs to user
            const attemptResult = await client.query(`
                SELECT id, test_id
                FROM attempts
                WHERE id = $1 AND user_id = $2 AND completed = true
            `, [original_attempt_id, userId]);

            if (attemptResult.rows.length === 0) {
                throw new Error('Original attempt not found or not accessible');
            }

            // Find LATEST AI practice session for this attempt
            const sessionResult = await client.query(`
                SELECT id, generated_count, session_name
                FROM ai_practice_sessions
                WHERE user_id = $1 AND original_attempt_id = $2
                ORDER BY created_at DESC
                LIMIT 1
            `, [userId, original_attempt_id]);

            if (sessionResult.rows.length === 0) {
                throw new Error('No AI practice session found. Please generate AI questions first from your test report.');
            }

            const session = sessionResult.rows[0];

            // Create AI attempt
            const aiAttemptResult = await client.query(`
                INSERT INTO ai_practice_attempts (user_id, session_id, started_at, attempt_type)
                VALUES ($1, $2, NOW(), 'ai_practice')
                RETURNING id, started_at
            `, [userId, session.id]);

            const aiAttempt = aiAttemptResult.rows[0];

            await client.query('COMMIT');

            console.log(`✅ AI practice attempt started: ${aiAttempt.id} for session ${session.id}`);

            res.json({
                message: `AI practice session started with ${session.generated_count} targeted questions`,
                ai_attempt_id: aiAttempt.id,
                session_id: session.id,
                started_at: aiAttempt.started_at,
                questions_count: session.generated_count
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error starting AI practice:', error);
            res.status(400).json({ 
                error: error.message || 'Failed to start AI practice session' 
            });
        } finally {
            client.release();
        }
    }
}

module.exports = AIPracticeController;
