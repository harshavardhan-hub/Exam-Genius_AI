const axios = require('axios');

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * ExamGenius AI - OpenRouter Service
 * Generates similar questions based on student's incorrect answers
 * Using AI to create personalized practice content for Software Engineering
 */

async function generateSimilarQuestions(wrongQuestions, maxQuestions = 10) {
    console.log('=== EXAMGENIUS AI QUESTION GENERATION FOR SOFTWARE INTERVIEWS ===');
    console.log('Processing wrong questions:', wrongQuestions.length);
    
    if (!OPENROUTER_KEY) {
        throw new Error('OpenRouter API key not configured for ExamGenius AI');
    }

    try {
        // Limit to 5 questions to avoid token limits
        const limitedWrongQuestions = wrongQuestions.slice(0, 5);
        const questionsToGenerate = Math.min(maxQuestions, 10); // ✅ FIX: Limit to 10 questions max

        const promptParts = limitedWrongQuestions.map((q, i) =>
            `${i + 1}) Topic: ${q.topic}, Question: "${q.question_text.substring(0, 100)}..."`
        );

        // ✅ FIX: Updated prompt for software engineering focus
        const prompt = `As ExamGenius AI, generate ${questionsToGenerate} multiple choice questions for SOFTWARE ENGINEERING and FULL STACK DEVELOPER interview preparation. Based on these wrong questions the candidate missed:

${promptParts.join('\n')}

Create similar technical questions testing the same programming concepts to help the candidate improve their software development skills. Focus on:
- Frontend Technologies (React, JavaScript, HTML, CSS)
- Backend Development (Node.js, Python, APIs)
- Database Concepts (SQL, NoSQL, Queries)
- Data Structures & Algorithms
- System Design Basics
- Full Stack Integration

Return ONLY a valid JSON array with this exact format:
[
  {
    "question_text": "Technical question here",
    "options": [
      {"key": "A", "text": "Option A"},
      {"key": "B", "text": "Option B"}, 
      {"key": "C", "text": "Option C"},
      {"key": "D", "text": "Option D"}
    ],
    "correct_option": "A",
    "negative_mark": 2.0,
    "time_limit_seconds": 30,
    "topic": "Programming Topic"
  }
]

Return exactly ${questionsToGenerate} questions with 30 seconds per question. No additional text, just the JSON array.`;

        console.log(`Generating ${questionsToGenerate} AI questions for software interviews...`);

        const response = await axios.post(OPENROUTER_URL, {
            model: "gpt-4o-mini",
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 3000,
            temperature: 0.2
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
                'X-Title': 'ExamGenius AI - Software Interview Prep'
            }
        });

        console.log('OpenRouter response received, status:', response.status);
        
        const text = response.data.choices?.[0]?.message?.content;
        const finishReason = response.data.choices?.[0]?.finish_reason;
        
        if (!text) {
            throw new Error('No response content from OpenRouter');
        }

        // Clean the response and extract JSON
        let cleanedText = text.trim();
        
        // Remove markdown code blocks if present
        const backtick = String.fromCharCode(96); // `
        const codeBlockMarker = backtick + backtick + backtick; // ```
        const jsonCodeBlockMarker = backtick + backtick + backtick + 'json'; // ```json

        if (cleanedText.startsWith(jsonCodeBlockMarker)) {
            cleanedText = cleanedText
                .replace(new RegExp('^' + jsonCodeBlockMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*'), '')
                .replace(new RegExp(codeBlockMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$'), '');
        } else if (cleanedText.startsWith(codeBlockMarker)) {
            cleanedText = cleanedText
                .replace(new RegExp('^' + codeBlockMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*'), '')
                .replace(new RegExp(codeBlockMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$'), '');
        }

        // Find JSON array boundaries
        const jsonStart = cleanedText.indexOf('[');
        const jsonEnd = cleanedText.lastIndexOf(']');
        
        if (jsonStart === -1 || jsonEnd === -1) {
            console.log('Full response text:', text);
            throw new Error('No valid JSON array found in AI response');
        }

        let jsonStr = cleanedText.slice(jsonStart, jsonEnd + 1);

        // Handle truncated JSON
        if (finishReason === 'length') {
            console.log('Response was truncated, attempting to fix JSON...');
            const lastCompleteQuestion = jsonStr.lastIndexOf('},');
            if (lastCompleteQuestion > 0) {
                jsonStr = jsonStr.substring(0, lastCompleteQuestion + 1) + ']';
            }
        }

        let questions;
        try {
            questions = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError.message);
            questions = extractQuestionsManually(jsonStr);
        }

        if (!Array.isArray(questions)) {
            throw new Error('AI response is not an array');
        }

        // Validate and filter questions
        const validQuestions = questions.filter(q => {
            return q.question_text &&
                   q.options &&
                   Array.isArray(q.options) &&
                   q.options.length === 4 &&
                   q.correct_option &&
                   ['A', 'B', 'C', 'D'].includes(q.correct_option) &&
                   q.topic;
        });

        console.log(`Generated ${questions.length} questions, ${validQuestions.length} valid`);
        
        if (validQuestions.length === 0) {
            throw new Error('No valid questions generated by AI');
        }

        return validQuestions.slice(0, maxQuestions);

    } catch (error) {
        console.error('ExamGenius AI Question Generation Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }

        throw new Error('Failed to generate similar questions: ' + error.message);
    }
}

// Fallback function for manual question extraction
function extractQuestionsManually(jsonStr) {
    console.log('Attempting manual question extraction...');
    const questions = [];
    const questionPattern = /"question_text":\s*"([^"]+)"/g;
    const matches = [...jsonStr.matchAll(questionPattern)];
    
    if (matches.length > 0) {
        matches.slice(0, 5).forEach((match, index) => {
            questions.push({
                question_text: match[1],
                options: [
                    {"key": "A", "text": "Option A"},
                    {"key": "B", "text": "Option B"},
                    {"key": "C", "text": "Option C"}, 
                    {"key": "D", "text": "Option D"}
                ],
                correct_option: "B",
                negative_mark: 2.0,
                time_limit_seconds: 30,
                topic: "Programming Fundamentals"
            });
        });
    }

    return questions;
}

module.exports = { generateSimilarQuestions };
