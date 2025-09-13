const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const router = express.Router();

/**
 * ExamGenius AI - Authentication Routes
 * Handles user registration and login
 */

// Register new user
router.post('/register', async (req, res) => {
    try {
        const {
            name, phone, whatsapp, email, college, year, target_exam_type,
            class10_percent, class10_board, class12_percent, class12_board, password
        } = req.body;

        console.log('🔐 ExamGenius AI Registration attempt:', email);

        // ✅ FIX: Validate target_exam_type
        const validExamTypes = ['Frontend', 'Backend', 'Full Stack', 'Other'];
        if (target_exam_type && !validExamTypes.includes(target_exam_type)) {
            return res.status(400).json({ 
                error: 'Invalid target exam type. Must be one of: Frontend, Backend, Full Stack, Other' 
            });
        }

        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // ✅ FIX: Insert user with target_exam_type
        const userResult = await pool.query(`
            INSERT INTO users (
                name, phone, whatsapp, email, college, year, target_exam_type,
                class10_percent, class10_board, class12_percent, class12_board, password_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, name, email, is_admin, created_at
        `, [
            name, phone, whatsapp, email, college, year, target_exam_type || 'Full Stack',
            class10_percent, class10_board, class12_percent, class12_board, hashedPassword
        ]);

        const user = userResult.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, isAdmin: user.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

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
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 ExamGenius AI Login attempt:', email);

        // Get user from database
        const userResult = await pool.query(`
            SELECT id, name, email, password_hash, is_admin, created_at
            FROM users WHERE email = $1
        `, [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = userResult.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, isAdmin: user.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

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
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

module.exports = router;
