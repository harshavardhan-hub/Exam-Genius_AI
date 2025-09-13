-- =====================================================
-- EXAMGENIUS AI - COMPLETE DATABASE SCHEMA
-- Modern Test Prep Platform with AI Features
-- Compatible Version - No Advanced Functions
-- =====================================================

-- Enable UUID extension (optional, using SERIAL for simplicity)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table - Students and Admins
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    college VARCHAR(255),
    year VARCHAR(10),
    target_exam_type VARCHAR(50) DEFAULT 'Full Stack' CHECK (target_exam_type IN ('Frontend', 'Backend', 'Full Stack', 'Other')),
    class10_percent DECIMAL(5,2),
    class10_board VARCHAR(100),
    class12_percent DECIMAL(5,2),
    class12_board VARCHAR(100),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics table - Subject categories
CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table - Question bank
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    negative_mark NUMERIC(4,2) DEFAULT 2.0,
    time_limit_seconds INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Sections table - Test sections (like Quant, Reasoning, etc.)
CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_time_minutes INTEGER DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Tests table - Main test definitions
CREATE TABLE IF NOT EXISTS tests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- TEST STRUCTURE TABLES
-- =====================================================

-- Test Sections - Which sections are in each test
CREATE TABLE IF NOT EXISTS test_sections (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
    time_minutes INTEGER NOT NULL,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (test_id, section_id)
);

-- Test Questions - Which questions are in each test
CREATE TABLE IF NOT EXISTS test_questions (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (test_id, question_id)
);

-- Test Question Sections - Assigns questions to sections within tests
CREATE TABLE IF NOT EXISTS test_question_sections (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (test_id, question_id)
);

-- =====================================================
-- USER ATTEMPT TABLES
-- =====================================================

-- Attempts - User test attempts
CREATE TABLE IF NOT EXISTS attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    score NUMERIC(5,2) DEFAULT 0,
    total_questions INTEGER,
    correct_answers INTEGER DEFAULT 0,
    incorrect_answers INTEGER DEFAULT 0,
    unanswered INTEGER DEFAULT 0,
    total_marks NUMERIC(6,2) DEFAULT 0,
    avg_time_per_question NUMERIC(6,2),
    attempt_type VARCHAR(50) DEFAULT 'regular'
);

-- User Answers - Individual question responses
CREATE TABLE IF NOT EXISTS user_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES attempts(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    user_answer CHAR(1) CHECK (user_answer IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN,
    marks_obtained NUMERIC(5,2) DEFAULT 0,
    time_taken_seconds INTEGER,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (attempt_id, question_id)
);

-- =====================================================
-- AI PRACTICE SYSTEM
-- =====================================================

-- AI Practice Sessions - Groups AI questions into practice rounds
CREATE TABLE IF NOT EXISTS ai_practice_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_attempt_id INTEGER REFERENCES attempts(id) ON DELETE CASCADE,
    generated_count INTEGER DEFAULT 0,
    session_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Generated Questions - Questions created by AI
CREATE TABLE IF NOT EXISTS ai_generated_questions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES ai_practice_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    topic VARCHAR(255),
    negative_mark NUMERIC(4,2) DEFAULT 2.0,
    time_limit_seconds INTEGER DEFAULT 30,
    sequence_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Practice Attempts - AI practice session attempts
CREATE TABLE IF NOT EXISTS ai_practice_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES ai_practice_sessions(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    score NUMERIC(5,2) DEFAULT 0,
    total_questions INTEGER,
    correct_answers INTEGER DEFAULT 0,
    incorrect_answers INTEGER DEFAULT 0,
    unanswered INTEGER DEFAULT 0,
    total_marks NUMERIC(6,2) DEFAULT 0,
    avg_time_per_question NUMERIC(6,2),
    attempt_type VARCHAR(50) DEFAULT 'ai_practice'
);

-- AI Practice Answers - User responses to AI questions
CREATE TABLE IF NOT EXISTS ai_practice_answers (
    id SERIAL PRIMARY KEY,
    ai_attempt_id INTEGER REFERENCES ai_practice_attempts(id) ON DELETE CASCADE,
    ai_question_id INTEGER REFERENCES ai_generated_questions(id) ON DELETE CASCADE,
    user_answer CHAR(1) CHECK (user_answer IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN,
    marks_obtained NUMERIC(5,2) DEFAULT 0,
    time_taken_seconds INTEGER,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ai_attempt_id, ai_question_id)
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = true;

-- Question indexes
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at);
CREATE INDEX IF NOT EXISTS idx_questions_options ON questions USING GIN (options);

-- Test indexes
CREATE INDEX IF NOT EXISTS idx_tests_active ON tests(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_test_sections_test ON test_sections(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);

-- Attempt indexes
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test ON attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_completed ON attempts(completed);
CREATE INDEX IF NOT EXISTS idx_attempts_started ON attempts(started_at);

-- Answer indexes
CREATE INDEX IF NOT EXISTS idx_user_answers_attempt ON user_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question ON user_answers(question_id);

-- AI system indexes
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_attempt ON ai_practice_sessions(original_attempt_id);
CREATE INDEX IF NOT EXISTS idx_ai_questions_session ON ai_generated_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_attempts_user ON ai_practice_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_attempts_session ON ai_practice_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_answers_attempt ON ai_practice_answers(ai_attempt_id);

-- =====================================================
-- REPORTING VIEWS
-- =====================================================

-- User Performance Summary
CREATE OR REPLACE VIEW user_performance_summary AS
SELECT
    u.id as user_id,
    u.name,
    u.email,
    u.college,
    u.target_exam_type,
    COUNT(a.id) as total_attempts,
    COUNT(CASE WHEN a.completed THEN 1 END) as completed_attempts,
    ROUND(AVG(CASE WHEN a.completed THEN a.score END), 2) as average_score,
    ROUND(MAX(CASE WHEN a.completed THEN a.score END), 2) as highest_score,
    COUNT(CASE WHEN a.attempt_type = 'ai_practice' THEN 1 END) as ai_practice_attempts,
    u.created_at as registration_date
FROM users u
LEFT JOIN attempts a ON u.id = a.user_id
WHERE u.is_admin = false
GROUP BY u.id, u.name, u.email, u.college, u.target_exam_type, u.created_at;

-- Test Statistics
CREATE OR REPLACE VIEW test_statistics AS
SELECT
    t.id as test_id,
    t.title,
    t.duration_minutes,
    COUNT(a.id) as total_attempts,
    COUNT(CASE WHEN a.completed THEN 1 END) as completed_attempts,
    ROUND(AVG(CASE WHEN a.completed THEN a.score END), 2) as average_score,
    COUNT(DISTINCT a.user_id) as unique_users,
    t.created_at
FROM tests t
LEFT JOIN attempts a ON t.id = a.test_id
WHERE t.is_active = true
GROUP BY t.id, t.title, t.duration_minutes, t.created_at;

-- Topic Performance Analysis
CREATE OR REPLACE VIEW topic_performance AS
SELECT
    t.id as topic_id,
    t.name as topic_name,
    COUNT(DISTINCT q.id) as total_questions,
    COUNT(DISTINCT ua.user_answer) as times_attempted,
    ROUND(
        (COUNT(CASE WHEN ua.is_correct THEN 1 END) * 100.0 /
         NULLIF(COUNT(ua.is_correct), 0)), 2
    ) as success_rate,
    ROUND(AVG(ua.time_taken_seconds), 2) as avg_time_seconds
FROM topics t
LEFT JOIN questions q ON t.id = q.topic_id
LEFT JOIN user_answers ua ON q.id = ua.question_id
GROUP BY t.id, t.name;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (name, email, password_hash, is_admin, created_at)
VALUES (
    'ExamGenius AI Admin',
    'admin@examgenius-ai.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewgWu4NexDx2mh3y',
    true,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Insert default topics for full-stack development
INSERT INTO topics (name, description) VALUES
('Quantitative Aptitude', 'Mathematical calculations and logical problem solving'),
('Reasoning Ability', 'Logical and analytical reasoning questions'),
('SQL', 'Database queries, joins, and data manipulation'),
('Python', 'Python programming concepts and problem solving'),
('ReactJS', 'React framework components, hooks, and state management')
ON CONFLICT (name) DO NOTHING;

-- Insert default sections
INSERT INTO sections (name, description, default_time_minutes) VALUES
('Quantitative Aptitude', 'Mathematical problem solving section', 25),
('Reasoning Ability', 'Logical reasoning section', 20),
('SQL', 'Database and SQL queries section', 20),
('Python', 'Python programming section', 25),
('ReactJS', 'React framework section', 20)
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION AND COMPLETION
-- =====================================================

-- Check all tables were created successfully
SELECT
    table_name,
    (SELECT COUNT(*)
     FROM information_schema.columns
     WHERE table_name = t.table_name AND table_schema = 'public'
    ) as column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY table_name;

-- Increase the year column length to accommodate "Postgraduate"
ALTER TABLE users ALTER COLUMN year TYPE VARCHAR(50);

-- ✅ AUTO-ADMIN ASSIGNMENT TRIGGER
CREATE OR REPLACE FUNCTION auto_assign_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if email matches preset admin emails
    IF NEW.email IN ('aiadmin@gmail.com', 'harsha@gmail.com') THEN
        NEW.is_admin := TRUE;
        RAISE NOTICE 'Auto-assigned admin role to: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before insert
CREATE TRIGGER trigger_auto_assign_admin
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_admin();

-- Success message
SELECT 'ExamGenius AI Database Schema Created Successfully!' as status;



