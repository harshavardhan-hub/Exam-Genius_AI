const pool = require('../config/database');

/**
 * ExamGenius AI - Admin Controller
 * Administrative operations for managing platform
 */

class AdminController {
    // Upload questions (JSON/CSV format)
    static async uploadQuestions(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const questions = req.body;

            console.log(`📤 Admin uploading ${questions.length} questions to ExamGenius AI`);

            if (!Array.isArray(questions)) {
                throw new Error('Request body must be an array of questions');
            }

            const uploadedQuestions = [];

            for (const questionData of questions) {
                const { topic, question_text, options, correct_option, negative_mark, time_limit_seconds } = questionData;

                // Validate required fields
                if (!topic || !question_text || !options || !correct_option) {
                    throw new Error('Missing required fields: topic, question_text, options, correct_option');
                }

                // Get or create topic
                let topicResult = await client.query('SELECT id FROM topics WHERE name = $1', [topic]);
                if (topicResult.rows.length === 0) {
                    topicResult = await client.query(`
                        INSERT INTO topics (name, description)
                        VALUES ($1, $2)
                        RETURNING id
                    `, [topic, `Questions related to ${topic}`]);
                }

                const topicId = topicResult.rows[0].id;

                // ✅ FIX: Insert question with updated negative marking (2.0)
                const questionResult = await client.query(`
                    INSERT INTO questions (
                        topic_id, question_text, options, correct_option,
                        negative_mark, time_limit_seconds, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id, created_at
                `, [
                    topicId,
                    question_text,
                    JSON.stringify(options),
                    correct_option,
                    negative_mark || 2.0, // ✅ FIX: Default negative mark is 2.0
                    time_limit_seconds || 60,
                    req.user.userId
                ]);

                uploadedQuestions.push({
                    id: questionResult.rows[0].id,
                    topic,
                    question_text,
                    created_at: questionResult.rows[0].created_at
                });
            }

            await client.query('COMMIT');

            console.log(`✅ Successfully uploaded ${uploadedQuestions.length} questions`);

            res.json({
                message: `Successfully uploaded ${uploadedQuestions.length} questions to ExamGenius AI`,
                questions: uploadedQuestions
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error uploading questions:', error);
            res.status(400).json({ error: error.message || 'Failed to upload questions' });
        } finally {
            client.release();
        }
    }

    // Get all questions with topics
    static async getQuestions(req, res) {
        try {
            console.log('📚 Admin fetching all questions');

            const questionsResult = await pool.query(`
                SELECT
                    q.id,
                    q.question_text,
                    q.options,
                    q.correct_option,
                    q.negative_mark,
                    q.time_limit_seconds,
                    q.created_at,
                    t.name as topic_name,
                    u.name as created_by_name
                FROM questions q
                INNER JOIN topics t ON q.topic_id = t.id
                LEFT JOIN users u ON q.created_by = u.id
                ORDER BY q.created_at DESC
            `);

            console.log(`✅ Found ${questionsResult.rows.length} questions`);

            res.json({
                questions: questionsResult.rows,
                total: questionsResult.rows.length
            });

        } catch (error) {
            console.error('❌ Error fetching questions:', error);
            res.status(500).json({ error: 'Failed to fetch questions' });
        }
    }

    // Get all topics
    static async getTopics(req, res) {
        try {
            console.log('🏷️ Admin fetching all topics');

            const topicsResult = await pool.query(`
                SELECT
                    t.id,
                    t.name,
                    t.description,
                    t.created_at,
                    COUNT(q.id) as question_count
                FROM topics t
                LEFT JOIN questions q ON t.id = q.topic_id
                GROUP BY t.id, t.name, t.description, t.created_at
                ORDER BY t.name ASC
            `);

            console.log(`✅ Found ${topicsResult.rows.length} topics`);
            res.json(topicsResult.rows);

        } catch (error) {
            console.error('❌ Error fetching topics:', error);
            res.status(500).json({ error: 'Failed to fetch topics' });
        }
    }

    // Create new section
    static async createSection(req, res) {
        try {
            const { name, description, default_time_minutes } = req.body;

            console.log('📋 Admin creating new section:', name);

            if (!name) {
                return res.status(400).json({ error: 'Section name is required' });
            }

            const sectionResult = await pool.query(`
                INSERT INTO sections (name, description, default_time_minutes, created_by)
                VALUES ($1, $2, $3, $4)
                RETURNING id, name, description, default_time_minutes, created_at
            `, [name, description, default_time_minutes || 20, req.user.userId]);

            const section = sectionResult.rows[0];

            console.log('✅ Section created:', section.id);

            res.json({
                message: 'Section created successfully',
                section
            });

        } catch (error) {
            console.error('❌ Error creating section:', error);
            res.status(500).json({ error: 'Failed to create section' });
        }
    }

    // Get all sections
    static async getSections(req, res) {
        try {
            console.log('📋 Admin fetching all sections');

            const sectionsResult = await pool.query(`
                SELECT
                    id, name, description, default_time_minutes, created_at
                FROM sections
                ORDER BY name ASC
            `);

            console.log(`✅ Found ${sectionsResult.rows.length} sections`);
            res.json(sectionsResult.rows);

        } catch (error) {
            console.error('❌ Error fetching sections:', error);
            res.status(500).json({ error: 'Failed to fetch sections' });
        }
    }

    // Create new test with sections and questions
    static async createTest(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { title, description, duration_minutes, sections_data, question_sections } = req.body;

            console.log('🏗️ Admin creating new ExamGenius AI test:', title);

            if (!title || !question_sections || question_sections.length === 0) {
                throw new Error('Test title and questions are required');
            }

            // Create test
            const testResult = await client.query(`
                INSERT INTO tests (title, description, duration_minutes, created_by, is_active)
                VALUES ($1, $2, $3, $4, true)
                RETURNING id, created_at
            `, [title, description, duration_minutes, req.user.userId]);

            const testId = testResult.rows[0].id;

            // Add sections to test if provided
            if (sections_data && sections_data.length > 0) {
                for (const section of sections_data) {
                    await client.query(`
                        INSERT INTO test_sections (test_id, section_id, time_minutes, sequence_order)
                        VALUES ($1, $2, $3, $4)
                    `, [testId, section.section_id, section.time_minutes, section.sequence_order]);
                }
            }

            // Add questions to test
            for (const question of question_sections) {
                await client.query(`
                    INSERT INTO test_questions (test_id, question_id, sequence_order)
                    VALUES ($1, $2, $3)
                `, [testId, question.question_id, question.sequence_order]);

                // If question has section assignment
                if (question.section_id) {
                    await client.query(`
                        INSERT INTO test_question_sections (test_id, question_id, section_id, sequence_order)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (test_id, question_id) DO UPDATE SET
                            section_id = $3, sequence_order = $4
                    `, [testId, question.question_id, question.section_id, question.sequence_order]);
                }
            }

            await client.query('COMMIT');

            console.log(`✅ ExamGenius AI test created: ${testId} with ${question_sections.length} questions`);

            res.json({
                message: 'ExamGenius AI test created successfully',
                test_id: testId,
                title,
                questions_count: question_sections.length,
                sections_count: sections_data?.length || 0
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error creating test:', error);
            res.status(400).json({ error: error.message || 'Failed to create test' });
        } finally {
            client.release();
        }
    }

    // ✅ FIX: Get all users with updated performance statistics (score out of 100)
    static async getUsers(req, res) {
        try {
            console.log('👥 Admin fetching all users');

            const usersResult = await pool.query(`
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.phone,
                    u.college,
                    u.year,
                    u.target_exam_type,
                    u.class10_percent,
                    u.class12_percent,
                    u.created_at,
                    COUNT(a.id) as total_attempts,
                    COUNT(CASE WHEN a.completed THEN 1 END) as completed_attempts,
                    ROUND(AVG(CASE WHEN a.completed THEN a.score END), 1) as average_score,
                    ROUND(MAX(CASE WHEN a.completed THEN a.score END), 1) as highest_score,
                    SUM(CASE WHEN a.completed THEN a.correct_answers ELSE 0 END) as total_correct,
                    SUM(CASE WHEN a.completed THEN a.incorrect_answers ELSE 0 END) as total_incorrect,
                    SUM(CASE WHEN a.completed THEN a.total_questions ELSE 0 END) as total_questions_attempted
                FROM users u
                LEFT JOIN attempts a ON u.id = a.user_id
                WHERE u.is_admin = false
                GROUP BY u.id, u.name, u.email, u.phone, u.college, u.year, u.target_exam_type, u.class10_percent, u.class12_percent, u.created_at
                ORDER BY u.created_at DESC
            `);

            console.log(`✅ Found ${usersResult.rows.length} users`);
            res.json(usersResult.rows);

        } catch (error) {
            console.error('❌ Error fetching users:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    // ✅ FIX: Get detailed reports for a specific user with updated scoring
    static async getUserReports(req, res) {
        try {
            const { userId } = req.params;

            console.log('📊 Admin fetching reports for user:', userId);

            // Get user info
            const userResult = await pool.query(`
                SELECT id, name, email, phone, college, target_exam_type, created_at
                FROM users
                WHERE id = $1 AND is_admin = false
            `, [userId]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Get user attempts with updated scoring info
            const attemptsResult = await pool.query(`
                SELECT
                    a.id as attempt_id,
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
                    -- ✅ FIX: Calculate marks distribution
                    (a.correct_answers * (100.0 / NULLIF(a.total_questions, 0))) as positive_marks,
                    (a.incorrect_answers * 2.0) as negative_marks
                FROM attempts a
                INNER JOIN tests t ON a.test_id = t.id
                WHERE a.user_id = $1
                ORDER BY a.started_at DESC
            `, [userId]);

            // Get topic-wise performance
            const topicPerformanceResult = await pool.query(`
                SELECT
                    tp.name as topic_name,
                    COUNT(ua.question_id) as questions_attempted,
                    SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) as correct_answers,
                    SUM(CASE WHEN ua.is_correct = false AND ua.user_answer IS NOT NULL THEN 1 ELSE 0 END) as incorrect_answers,
                    SUM(ua.marks_obtained) as total_marks,
                    AVG(ua.time_taken_seconds) as avg_time_seconds
                FROM user_answers ua
                INNER JOIN questions q ON ua.question_id = q.id
                INNER JOIN topics tp ON q.topic_id = tp.id
                INNER JOIN attempts a ON ua.attempt_id = a.id
                WHERE a.user_id = $1 AND a.completed = true
                GROUP BY tp.name
                ORDER BY tp.name
            `, [userId]);

            console.log(`✅ User reports generated: ${attemptsResult.rows.length} attempts`);

            res.json({
                user: userResult.rows[0],
                attempts: attemptsResult.rows,
                topic_performance: topicPerformanceResult.rows
            });

        } catch (error) {
            console.error('❌ Error fetching user reports:', error);
            res.status(500).json({ error: 'Failed to fetch user reports' });
        }
    }
}

module.exports = AdminController;
