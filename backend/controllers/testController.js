const pool = require('../config/database');

/**
 * ExamGenius AI - Test Controller
 * Manages test operations and data retrieval
 */

class TestController {
  // Get all available tests
  static async getAllTests(req, res) {
    try {
      console.log('📚 Fetching ExamGenius AI tests for user:', req.user.userId);

      const testsResult = await pool.query(`
        SELECT 
          t.id,
          t.title,
          t.description,
          t.duration_minutes,
          t.created_at,
          COUNT(DISTINCT tq.question_id) as question_count,
          COUNT(DISTINCT ts.section_id) as section_count,
          u.name as created_by_name
        FROM tests t
        LEFT JOIN test_questions tq ON t.id = tq.test_id
        LEFT JOIN test_sections ts ON t.id = ts.test_id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.is_active = true
        GROUP BY t.id, t.title, t.description, t.duration_minutes, t.created_at, u.name
        ORDER BY t.created_at DESC
      `);

      const tests = testsResult.rows.map(test => ({
        ...test,
        question_count: parseInt(test.question_count) || 0,
        section_count: parseInt(test.section_count) || 0
      }));

      console.log(`✅ Found ${tests.length} active tests`);

      res.json(tests);

    } catch (error) {
      console.error('❌ Error fetching tests:', error);
      res.status(500).json({ 
        error: 'Failed to fetch tests' 
      });
    }
  }

  // Get specific test with sections and questions
  static async getTestById(req, res) {
    try {
      const { testId } = req.params;
      console.log('📋 Fetching test details for test:', testId);

      // Get test basic info
      const testResult = await pool.query(`
        SELECT 
          t.id, t.title, t.description, t.duration_minutes, t.created_at, t.is_active,
          u.name as created_by_name
        FROM tests t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = $1 AND t.is_active = true
      `, [testId]);

      if (testResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Test not found or inactive' 
        });
      }

      const test = testResult.rows[0];

      // Get sections for this test
      const sectionsResult = await pool.query(`
        SELECT 
          s.id,
          s.name,
          s.description,
          ts.time_minutes,
          ts.sequence_order
        FROM sections s
        INNER JOIN test_sections ts ON s.id = ts.section_id
        WHERE ts.test_id = $1
        ORDER BY ts.sequence_order ASC
      `, [testId]);

      const sections = sectionsResult.rows;

      // If test has sections, get questions for each section
      if (sections.length > 0) {
        for (let section of sections) {
          const questionsResult = await pool.query(`
            SELECT 
              q.id,
              q.question_text,
              q.options,
              q.correct_option,
              q.negative_mark,
              q.time_limit_seconds,
              t.name as topic_name,
              tqs.sequence_order
            FROM questions q
            INNER JOIN topics t ON q.topic_id = t.id
            INNER JOIN test_question_sections tqs ON q.id = tqs.question_id
            WHERE tqs.test_id = $1 AND tqs.section_id = $2
            ORDER BY tqs.sequence_order ASC
          `, [testId, section.id]);

          section.questions = questionsResult.rows;
        }
      } else {
        // Get all questions for tests without sections
        const allQuestionsResult = await pool.query(`
          SELECT 
            q.id,
            q.question_text,
            q.options,
            q.correct_option,
            q.negative_mark,
            q.time_limit_seconds,
            t.name as topic_name,
            tq.sequence_order
          FROM questions q
          INNER JOIN topics t ON q.topic_id = t.id
          INNER JOIN test_questions tq ON q.id = tq.question_id
          WHERE tq.test_id = $1
          ORDER BY tq.sequence_order ASC
        `, [testId]);

        test.questions = allQuestionsResult.rows;
      }

      console.log(`✅ Test details loaded: ${sections.length} sections`);

      res.json({
        test,
        sections,
        has_sections: sections.length > 0
      });

    } catch (error) {
      console.error('❌ Error fetching test details:', error);
      res.status(500).json({ 
        error: 'Failed to fetch test details' 
      });
    }
  }

  // Get test statistics
  static async getTestStats(req, res) {
    try {
      const { testId } = req.params;

      const statsResult = await pool.query(`
        SELECT 
          t.title,
          COUNT(a.id) as total_attempts,
          COUNT(CASE WHEN a.completed THEN 1 END) as completed_attempts,
          ROUND(AVG(CASE WHEN a.completed THEN a.score END), 2) as average_score,
          ROUND(MAX(CASE WHEN a.completed THEN a.score END), 2) as highest_score,
          ROUND(MIN(CASE WHEN a.completed THEN a.score END), 2) as lowest_score,
          COUNT(DISTINCT a.user_id) as unique_users
        FROM tests t
        LEFT JOIN attempts a ON t.id = a.test_id
        WHERE t.id = $1
        GROUP BY t.id, t.title
      `, [testId]);

      if (statsResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Test not found' 
        });
      }

      res.json(statsResult.rows[0]);

    } catch (error) {
      console.error('❌ Error fetching test statistics:', error);
      res.status(500).json({ 
        error: 'Failed to fetch test statistics' 
      });
    }
  }
}

module.exports = TestController;
