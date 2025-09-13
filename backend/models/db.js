const pool = require('../config/database');

/**
 * ExamGenius AI - Database Models
 * Centralized database operations and query helpers
 */

class DatabaseModel {
  constructor() {
    this.pool = pool;
  }

  // Generic query method with error handling
  async query(text, params = []) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Query executed:', { 
          duration: `${duration}ms`, 
          rows: result.rowCount,
          command: text.substring(0, 50) + '...'
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Database query error:', {
        query: text.substring(0, 100) + '...',
        params: params,
        error: error.message
      });
      throw error;
    }
  }

  // Transaction helper
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // User operations
  async findUserByEmail(email) {
    const result = await this.query(`
      SELECT id, name, email, password_hash, is_admin, is_active, created_at
      FROM users 
      WHERE email = $1
    `, [email.toLowerCase()]);
    
    return result.rows[0] || null;
  }

  async findUserById(id) {
    const result = await this.query(`
      SELECT 
        id, name, phone, whatsapp, email, college, year, bank_exam_type,
        class10_percent, class10_board, class12_percent, class12_board,
        is_admin, is_active, created_at, updated_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [id]);
    
    return result.rows[0] || null;
  }

  async createUser(userData) {
    const {
      name, phone, whatsapp, email, college, year, bank_exam_type,
      class10_percent, class10_board, class12_percent, class12_board, 
      password_hash
    } = userData;

    const result = await this.query(`
      INSERT INTO users (
        name, phone, whatsapp, email, college, year, bank_exam_type,
        class10_percent, class10_board, class12_percent, class12_board, password_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, email, is_admin, created_at
    `, [
      name, phone, whatsapp, email.toLowerCase(), college, year, bank_exam_type,
      class10_percent, class10_board, class12_percent, class12_board, password_hash
    ]);

    return result.rows[0];
  }

  // Test operations
  async findActiveTests() {
    const result = await this.query(`
      SELECT 
        t.id, t.title, t.description, t.duration_minutes, t.created_at,
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

    return result.rows.map(test => ({
      ...test,
      question_count: parseInt(test.question_count) || 0,
      section_count: parseInt(test.section_count) || 0
    }));
  }

  async findTestById(testId) {
    const result = await this.query(`
      SELECT 
        t.id, t.title, t.description, t.duration_minutes, t.created_at, t.is_active,
        u.name as created_by_name
      FROM tests t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1 AND t.is_active = true
    `, [testId]);

    return result.rows[0] || null;
  }

  // Question operations
  async findQuestionsByTestId(testId) {
    const result = await this.query(`
      SELECT 
        q.id, q.question_text, q.options, q.correct_option, 
        q.negative_mark, q.time_limit_seconds,
        t.name as topic_name,
        tq.sequence_order
      FROM questions q
      INNER JOIN topics t ON q.topic_id = t.id
      INNER JOIN test_questions tq ON q.id = tq.question_id
      WHERE tq.test_id = $1
      ORDER BY tq.sequence_order ASC
    `, [testId]);

    return result.rows;
  }

  async findQuestionById(questionId) {
    const result = await this.query(`
      SELECT 
        q.id, q.question_text, q.options, q.correct_option,
        q.negative_mark, q.time_limit_seconds, q.topic_id,
        t.name as topic_name
      FROM questions q
      INNER JOIN topics t ON q.topic_id = t.id
      WHERE q.id = $1
    `, [questionId]);

    return result.rows[0] || null;
  }

  // Topic operations
  async findAllTopics() {
    const result = await this.query(`
      SELECT 
        t.id, t.name, t.description, t.created_at,
        COUNT(q.id) as question_count
      FROM topics t
      LEFT JOIN questions q ON t.id = q.topic_id
      GROUP BY t.id, t.name, t.description, t.created_at
      ORDER BY t.name ASC
    `);

    return result.rows;
  }

  async findTopicByName(name) {
    const result = await this.query(`
      SELECT id, name, description, created_at
      FROM topics 
      WHERE LOWER(name) = LOWER($1)
    `, [name]);

    return result.rows[0] || null;
  }

  async createTopic(name, description) {
    const result = await this.query(`
      INSERT INTO topics (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at
    `, [name, description]);

    return result.rows[0];
  }

  // Attempt operations
  async findActiveAttempt(userId, testId) {
    const result = await this.query(`
      SELECT id, started_at, completed
      FROM attempts 
      WHERE user_id = $1 AND test_id = $2 AND completed = false
    `, [userId, testId]);

    return result.rows[0] || null;
  }

  async createAttempt(userId, testId, attemptType = 'regular') {
    const result = await this.query(`
      INSERT INTO attempts (user_id, test_id, started_at, attempt_type)
      VALUES ($1, $2, NOW(), $3)
      RETURNING id, started_at
    `, [userId, testId, attemptType]);

    return result.rows[0];
  }

  async findAttemptById(attemptId, userId = null) {
    let query = `
      SELECT 
        a.id, a.user_id, a.test_id, a.started_at, a.finished_at,
        a.completed, a.score, a.total_questions, a.correct_answers,
        a.incorrect_answers, a.unanswered, a.total_marks,
        a.avg_time_per_question, a.attempt_type,
        t.title as test_title
      FROM attempts a
      INNER JOIN tests t ON a.test_id = t.id
      WHERE a.id = $1
    `;
    
    const params = [attemptId];
    
    if (userId) {
      query += ' AND a.user_id = $2';
      params.push(userId);
    }

    const result = await this.query(query, params);
    return result.rows[0] || null;
  }

  // Answer operations
  async saveUserAnswer(attemptId, questionId, userAnswer, isCorrect, marksObtained, timeToken) {
    const result = await this.query(`
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
      RETURNING id
    `, [attemptId, questionId, userAnswer, isCorrect, marksObtained, timeToken]);

    return result.rows[0];
  }

  // Statistics operations
  async getUserStatistics(userId) {
    const result = await this.query(`
      SELECT 
        COUNT(a.id) as total_attempts,
        COUNT(CASE WHEN a.completed THEN 1 END) as completed_attempts,
        ROUND(AVG(CASE WHEN a.completed THEN a.score END), 2) as average_score,
        ROUND(MAX(CASE WHEN a.completed THEN a.score END), 2) as highest_score,
        COUNT(CASE WHEN a.attempt_type = 'ai_practice' THEN 1 END) as ai_practice_attempts
      FROM attempts a
      WHERE a.user_id = $1
    `, [userId]);

    return result.rows[0] || {
      total_attempts: 0,
      completed_attempts: 0,
      average_score: null,
      highest_score: null,
      ai_practice_attempts: 0
    };
  }

  async getTestStatistics(testId) {
    const result = await this.query(`
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

    return result.rows[0] || null;
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as current_time, version() as pg_version');
      return {
        status: 'healthy',
        database: 'connected',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].pg_version.split(',')[0]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message
      };
    }
  }

  // Cleanup methods
  async cleanupExpiredSessions() {
    // Clean up sessions older than 24 hours that are incomplete
    const result = await this.query(`
      DELETE FROM attempts 
      WHERE started_at < NOW() - INTERVAL '24 hours' 
        AND completed = false
    `);
    
    return result.rowCount;
  }
}

// Export singleton instance
const db = new DatabaseModel();
module.exports = db;
