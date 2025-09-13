const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * ExamGenius AI - Authentication Controller
 * Handles user registration, login, and token management
 */

class AuthController {
    // Register new user
    static async register(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const {
                name, phone, whatsapp, email, college, year, target_exam_type,
                class10_percent, class10_board, class12_percent, class12_board, password
            } = req.body;

            console.log('🔐 ExamGenius AI Registration attempt:', email);

            // Validation
            if (!name || !email || !password) {
                return res.status(400).json({
                    error: 'Name, email, and password are required'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    error: 'Password must be at least 6 characters long'
                });
            }

            // ✅ FIX: Validate target_exam_type
            const validExamTypes = ['Frontend', 'Backend', 'Full Stack', 'Other'];
            if (target_exam_type && !validExamTypes.includes(target_exam_type)) {
                return res.status(400).json({
                    error: 'Invalid target exam type. Must be one of: Frontend, Backend, Full Stack, Other'
                });
            }

            // Check if user already exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    error: 'User already exists with this email'
                });
            }

            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // ✅ FIX: Insert user with target_exam_type instead of bank_exam_type
            const userResult = await client.query(`
                INSERT INTO users (
                    name, phone, whatsapp, email, college, year, target_exam_type,
                    class10_percent, class10_board, class12_percent, class12_board, password_hash
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id, name, email, is_admin, created_at
            `, [
                name, phone, whatsapp, email, college, year, target_exam_type || 'Full Stack',
                parseFloat(class10_percent) || null, class10_board,
                parseFloat(class12_percent) || null, class12_board, hashedPassword
            ]);

            const user = userResult.rows[0];

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    isAdmin: user.is_admin
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            await client.query('COMMIT');

            console.log('✅ ExamGenius AI user registered successfully:', user.email);

            res.status(201).json({
                message: 'Welcome to ExamGenius AI! Registration successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    is_admin: user.is_admin,
                    created_at: user.created_at
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Registration error:', error);
            res.status(500).json({
                error: 'Registration failed. Please try again.'
            });
        } finally {
            client.release();
        }
    }

    // Login user
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            console.log('🔐 ExamGenius AI Login attempt:', email);

            // Validation
            if (!email || !password) {
                return res.status(400).json({
                    error: 'Email and password are required'
                });
            }

            // Get user from database
            const userResult = await pool.query(`
                SELECT id, name, email, password_hash, is_admin, is_active, created_at
                FROM users WHERE email = $1
            `, [email.toLowerCase()]);

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            const user = userResult.rows[0];

            // Check if user is active
            if (!user.is_active) {
                return res.status(401).json({
                    error: 'Account is deactivated. Please contact support.'
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    isAdmin: user.is_admin
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            // Update last login
            await pool.query(`
                UPDATE users SET updated_at = NOW() WHERE id = $1
            `, [user.id]);

            console.log('✅ ExamGenius AI user logged in successfully:', user.email);

            res.json({
                message: 'Welcome back to ExamGenius AI!',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    is_admin: user.is_admin,
                    created_at: user.created_at
                }
            });

        } catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({
                error: 'Login failed. Please try again.'
            });
        }
    }

    // Refresh token
    static async refreshToken(req, res) {
        try {
            const userId = req.user.userId;

            // Get fresh user data
            const userResult = await pool.query(`
                SELECT id, name, email, is_admin, is_active
                FROM users WHERE id = $1
            `, [userId]);

            if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
                return res.status(401).json({
                    error: 'User not found or inactive'
                });
            }

            const user = userResult.rows[0];

            // Generate new token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    isAdmin: user.is_admin
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.json({
                message: 'Token refreshed successfully',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    is_admin: user.is_admin
                }
            });

        } catch (error) {
            console.error('❌ Token refresh error:', error);
            res.status(500).json({
                error: 'Token refresh failed'
            });
        }
    }

    // Get current user profile
    static async getProfile(req, res) {
        try {
            const userId = req.user.userId;

            const userResult = await pool.query(`
                SELECT
                    id, name, phone, whatsapp, email, college, year, target_exam_type,
                    class10_percent, class10_board, class12_percent, class12_board,
                    is_admin, created_at, updated_at
                FROM users WHERE id = $1
            `, [userId]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'User profile not found'
                });
            }

            res.json({
                user: userResult.rows[0]
            });

        } catch (error) {
            console.error('❌ Get profile error:', error);
            res.status(500).json({
                error: 'Failed to fetch profile'
            });
        }
    }
}

module.exports = AuthController;
