const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * ExamGenius AI - AI Practice Routes
 * Handles AI practice sessions and question answering
 */

// Start AI practice session
router.post('/', auth, async (req, res) => {
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

    // Find existing AI practice session for this attempt
    const sessionResult = await client.query(`
      SELECT id 
      FROM ai_practice_sessions 
      WHERE user_id = $1 AND original_attempt_id = $2 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [userId, original_attempt_id]);

    if (sessionResult.rows.length === 0) {
      throw new Error('No AI practice session found. Please generate AI questions first.');
    }

    const sessionId = sessionResult.rows[0].id;

    // Create AI attempt
    const aiAttemptResult = await client.query(`
      INSERT INTO ai_practice_attempts (user_id, session_id, started_at, attempt_type)
      VALUES ($1, $2, NOW(), 'ai_practice')
      RETURNING id, started_at
    `, [userId, sessionId]);

    const aiAttempt = aiAttemptResult.rows[0];

    await client.query('COMMIT');

    console.log(`✅ AI practice attempt started: ${aiAttempt.id} for session ${sessionId}`);

    res.json({
      message: 'AI practice session started',
      ai_attempt_id: aiAttempt.id,
      session_id: sessionId,
      started_at: aiAttempt.started_at
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error starting AI practice:', error);
    res.status(400).json({ error: error.message || 'Failed to start AI practice session' });
  } finally {
    client.release();
  }
});

// Get AI practice questions
router.get('/:aiAttemptId/questions', auth, async (req, res) => {
  try {
    const { aiAttemptId } = req.params;
    const userId = req.user.userId;

    console.log('📚 Fetching AI practice questions for attempt:', aiAttemptId);

    // Verify AI attempt belongs to user
    const aiAttemptResult = await pool.query(`
      SELECT id, session_id, completed 
      FROM ai_practice_attempts 
      WHERE id = $1 AND user_id = $2
    `, [aiAttemptId, userId]);

    if (aiAttemptResult.rows.length === 0) {
      return res.status(404).json({ error: 'AI practice attempt not found' });
    }

    const { session_id, completed } = aiAttemptResult.rows[0];

    if (completed) {
      return res.status(400).json({ error: 'AI practice session already completed' });
    }

    // Get AI generated questions for this session
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

    res.json({
      questions: questionsResult.rows,
      ai_attempt_id: aiAttemptId,
      total_questions: questionsResult.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching AI practice questions:', error);
    res.status(500).json({ error: 'Failed to fetch AI practice questions' });
  }
});

// Submit answer to AI practice question
router.post('/:aiAttemptId/answer', auth, async (req, res) => {
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
        marksObtained = -question.negative_mark; // Negative marking
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
      marks_obtained: marksObtained
    });

  } catch (error) {
    console.error('❌ Error submitting AI practice answer:', error);
    res.status(500).json({ error: 'Failed to submit AI practice answer' });
  }
});

// Finish AI practice session - UPDATED WITH FIXES
router.post('/:aiAttemptId/finish', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { aiAttemptId } = req.params;
    const userId = req.user.userId;

    console.log('🏁 Finishing AI practice session:', aiAttemptId);

    // Verify AI attempt belongs to user and is not already completed
    const aiAttemptResult = await client.query(`
      SELECT id, session_id, completed 
      FROM ai_practice_attempts 
      WHERE id = $1 AND user_id = $2
    `, [aiAttemptId, userId]);

    if (aiAttemptResult.rows.length === 0) {
      throw new Error('AI practice attempt not found');
    }

    if (aiAttemptResult.rows[0].completed) {
      throw new Error('AI practice session already completed');
    }

    // Calculate AI practice score
    const scoreResult = await client.query(`
      SELECT 
        COUNT(*) as total_questions,
        SUM(CASE WHEN marks_obtained > 0 THEN 1 ELSE 0 END) as correct_answers,
        SUM(CASE WHEN user_answer IS NOT NULL AND marks_obtained <= 0 THEN 1 ELSE 0 END) as incorrect_answers,
        SUM(CASE WHEN user_answer IS NULL THEN 1 ELSE 0 END) as unanswered,
        COALESCE(SUM(marks_obtained), 0) as total_marks,
        COALESCE(AVG(time_taken_seconds), 0) as avg_time_per_question
      FROM ai_practice_answers apa
      INNER JOIN ai_generated_questions agq ON apa.ai_question_id = agq.id
      WHERE apa.ai_attempt_id = $1
    `, [aiAttemptId]);

    const stats = scoreResult.rows[0];
    
    // Calculate percentage score
    const maxPossibleMarks = parseInt(stats.total_questions);
    const actualMarks = parseFloat(stats.total_marks);
    const percentageScore = maxPossibleMarks > 0 ? (actualMarks / maxPossibleMarks) * 100 : 0;
    const finalScore = Math.max(0, percentageScore);

    // ✅ FIX: Ensure all fields are updated and committed
    const updateResult = await client.query(`
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
      RETURNING id, completed, score, finished_at
    `, [
      aiAttemptId, finalScore, stats.total_questions, stats.correct_answers,
      stats.incorrect_answers, stats.unanswered, stats.total_marks, stats.avg_time_per_question
    ]);

    // ✅ FIX: Verify update was successful
    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update AI practice attempt');
    }

    // ✅ FIX: Force commit before sending response
    await client.query('COMMIT');

    console.log(`✅ AI practice session completed successfully:`, {
      attemptId: aiAttemptId,
      score: finalScore.toFixed(1),
      completed: updateResult.rows[0].completed,
      finishedAt: updateResult.rows[0].finished_at
    });

    res.json({
      message: 'AI practice session completed successfully',
      attempt_id: aiAttemptId,
      score: parseFloat(finalScore.toFixed(1)),
      completed: true,
      finished_at: updateResult.rows[0].finished_at,
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
    console.error('❌ Error finishing AI practice:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to finish AI practice session' 
    });
  } finally {
    client.release();
  }
});

// Get AI practice report - UPDATED WITH FIXES
router.get('/:aiAttemptId/report', auth, async (req, res) => {
  try {
    const { aiAttemptId } = req.params;
    const userId = req.user.userId;

    console.log('📊 Generating AI practice report for attempt:', aiAttemptId);

    // ✅ FIX: Add explicit check for completed attempts
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
        aps.original_attempt_id
      FROM ai_practice_attempts apa
      INNER JOIN ai_practice_sessions aps ON apa.session_id = aps.id
      WHERE apa.id = $1 AND apa.user_id = $2
    `, [aiAttemptId, userId]);

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'AI practice attempt not found' 
      });
    }

    const attempt = attemptResult.rows[0];

    // ✅ FIX: Check if attempt is completed before generating report
    if (!attempt.completed) {
      return res.status(400).json({ 
        error: 'AI practice session not yet completed',
        status: 'incomplete',
        attempt_id: aiAttemptId
      });
    }

    // Get detailed AI practice answers
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

    const formattedAnswers = answersResult.rows.map(answer => ({
      ...answer,
      formatted_options: answer.options || {},
      correct_answer: answer.correct_option,
      time_used: answer.time_taken_seconds
    }));

    console.log(`✅ AI practice report generated: ${formattedAnswers.length} questions`);

    res.json({
      attempt,
      answers: formattedAnswers,
      status: 'completed',
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating AI practice report:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI practice report' 
    });
  }
});

// ✅ UPDATED ROUTE: Get all AI practice attempts for current user (Simplified)
router.get('/user/all', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
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
        'AI Practice Session' as test_title,
        '10' as duration_minutes
      FROM ai_practice_attempts apa
      WHERE apa.user_id = $1 AND apa.completed = true
      ORDER BY apa.started_at DESC
    `, [userId]);
    
    console.log(`✅ Found ${attemptsResult.rows.length} AI practice attempts`);
    
    res.json({
      attempts: attemptsResult.rows
    });
    
  } catch (error) {
    console.error('❌ Error fetching AI practice attempts:', error);
    res.status(500).json({ error: 'Failed to fetch AI practice attempts' });
  }
});

module.exports = router;
