const express = require('express');
const AIController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

/**
 * ExamGenius AI - AI Routes
 * Handles AI-powered question generation based on user mistakes
 */

// Generate similar questions based on wrong answers
router.post('/generate-similar', authMiddleware, async (req, res) => {
    try {
        console.log('🎯 AI Route: Generate similar questions request');
        console.log('📊 Request body:', {
            wrong_question_ids: req.body.wrong_question_ids?.length || 0,
            original_attempt_id: req.body.original_attempt_id,
            max_questions: req.body.max_questions || 10,
            user_id: req.user?.userId
        });
        
        // Validate required fields
        if (!req.body.wrong_question_ids || !Array.isArray(req.body.wrong_question_ids)) {
            return res.status(400).json({
                error: 'wrong_question_ids array is required',
                details: 'Please provide an array of question IDs that were answered incorrectly'
            });
        }
        
        if (!req.body.original_attempt_id) {
            return res.status(400).json({
                error: 'original_attempt_id is required',
                details: 'Please provide the ID of the completed test attempt'
            });
        }
        
        if (req.body.wrong_question_ids.length === 0) {
            return res.status(400).json({
                error: 'No wrong questions provided',
                message: 'Congratulations! You may have answered all questions correctly!',
                details: 'AI question generation requires at least one incorrectly answered question'
            });
        }

        // Validate max_questions parameter
        const maxQuestions = parseInt(req.body.max_questions) || 10;
        if (maxQuestions < 1 || maxQuestions > 50) {
            return res.status(400).json({
                error: 'Invalid max_questions value',
                details: 'max_questions must be between 1 and 50'
            });
        }

        // Ensure user is authenticated
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                error: 'Authentication required',
                details: 'Please log in to generate AI questions'
            });
        }

        // Add max_questions to request body if not present or invalid
        req.body.max_questions = maxQuestions;
        
        console.log('✅ AI Route: Validation passed, forwarding to controller');
        
        await AIController.generateSimilarQuestions(req, res);
        
    } catch (error) {
        console.error('❌ AI Route error:', error);
        
        // Handle specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.message
            });
        }
        
        if (error.name === 'AuthenticationError') {
            return res.status(401).json({
                error: 'Authentication failed',
                details: error.message
            });
        }
        
        // Generic error response
        res.status(500).json({
            error: 'Failed to process AI request',
            details: 'ExamGenius AI encountered an unexpected error. Please try again.',
            message: error.message
        });
    }
});

// Get AI practice session details
router.get('/session/:sessionId', authMiddleware, async (req, res) => {
    try {
        console.log('🔍 AI Route: Get session details for ID:', req.params.sessionId);
        
        if (!req.params.sessionId || isNaN(parseInt(req.params.sessionId))) {
            return res.status(400).json({
                error: 'Invalid session ID',
                details: 'Please provide a valid numeric session ID'
            });
        }

        await AIController.getSessionDetails(req, res);
        
    } catch (error) {
        console.error('❌ AI Route session error:', error);
        res.status(500).json({
            error: 'Failed to retrieve session details',
            details: error.message
        });
    }
});

// Get user's AI practice history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        console.log('📚 AI Route: Get practice history for user:', req.user?.userId);
        
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);
        
        req.query.limit = limit;
        req.query.offset = offset;
        
        await AIController.getPracticeHistory(req, res);
        
    } catch (error) {
        console.error('❌ AI Route history error:', error);
        res.status(500).json({
            error: 'Failed to retrieve practice history',
            details: error.message
        });
    }
});

module.exports = router;