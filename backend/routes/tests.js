const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * ExamGenius AI - Tests Routes
 * Handles test management and retrieval
 */

// Get all available tests
router.get('/', auth, async (req, res) => {
  try {
    console.log('📚 Fetching ExamGenius AI tests for user:', req.user.userId);

    const testsResult = await pool.query(`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.duration_minutes,
        t.created_at,
        COUNT(DISTINCT tq.question_id) as question_count
      FROM tests t
      LEFT JOIN test_questions tq ON t.id = tq.test_id
      WHERE t.is_active = true
      GROUP BY t.id, t.title, t.description, t.duration_minutes, t.created_at
      ORDER BY t.created_at DESC
    `);

    console.log(`✅ Found ${testsResult.rows.length} active tests`);

    res.json(testsResult.rows);

  } catch (error) {
    console.error('❌ Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Get specific test with sections and questions
router.get('/:testId', auth, async (req, res) => {
  try {
    const { testId } = req.params;
    console.log('📋 Fetching test details for test:', testId);

    // Get test basic info
    const testResult = await pool.query(`
      SELECT id, title, description, duration_minutes, created_at, is_active
      FROM tests 
      WHERE id = $1 AND is_active = true
    `, [testId]);

    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
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
    }

    console.log(`✅ Test details loaded: ${sections.length} sections`);

    res.json({
      test,
      sections,
      has_sections: sections.length > 0
    });

  } catch (error) {
    console.error('❌ Error fetching test details:', error);
    res.status(500).json({ error: 'Failed to fetch test details' });
  }
});

module.exports = router;
