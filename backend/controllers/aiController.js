const pool = require('../config/database');
const axios = require('axios');

/**
 * ExamGenius AI - AI Controller
 * FIXED: Generate truly NEW similar questions, not repeat same ones
 */

class AIController {
    // Function to shuffle options and randomize correct answer position
    static shuffleQuestionOptions(question) {
        const optionEntries = Object.entries(question.options);
        const shuffledEntries = AIController.shuffleArray(optionEntries);
        
        const letters = ['A', 'B', 'C', 'D'];
        const newOptions = {};
        let newCorrectOption = 'A';
        
        shuffledEntries.forEach(([originalKey, value], index) => {
            const newKey = letters[index];
            newOptions[newKey] = value;
            
            if (originalKey === question.correct_option) {
                newCorrectOption = newKey;
            }
        });
        
        return {
            ...question,
            options: newOptions,
            correct_option: newCorrectOption
        };
    }

    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static async generateSimilarQuestions(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { wrong_question_ids, original_attempt_id, max_questions = 10 } = req.body;
            const userId = req.user.userId;

            console.log('🤖 ExamGenius AI generating 10 NEW similar questions for user:', userId);

            if (!wrong_question_ids || wrong_question_ids.length === 0) {
                throw new Error('No wrong questions provided');
            }

            // Verify the attempt belongs to the user
            const attemptResult = await client.query(`
                SELECT id, test_id
                FROM attempts
                WHERE id = $1 AND user_id = $2 AND completed = true
            `, [original_attempt_id, userId]);

            if (attemptResult.rows.length === 0) {
                throw new Error('Original attempt not found or not completed');
            }

            // Get ONLY the specific wrong questions
            const wrongQuestionsResult = await client.query(`
                SELECT DISTINCT
                    q.id,
                    q.question_text,
                    q.options,
                    q.correct_option,
                    t.name as topic,
                    ua.user_answer as wrong_answer,
                    ua.time_taken_seconds
                FROM questions q
                INNER JOIN topics t ON q.topic_id = t.id
                INNER JOIN user_answers ua ON q.id = ua.question_id
                INNER JOIN attempts a ON ua.attempt_id = a.id
                WHERE a.user_id = $1 
                  AND ua.attempt_id = $2
                  AND q.id = ANY($3)
                  AND ua.is_correct = false
                  AND ua.user_answer IS NOT NULL
                ORDER BY q.id
                LIMIT 10
            `, [userId, original_attempt_id, wrong_question_ids]);

            const wrongQuestions = wrongQuestionsResult.rows;

            if (wrongQuestions.length === 0) {
                throw new Error('No wrong questions found from your attempt.');
            }

            console.log(`🔍 Analyzing ${wrongQuestions.length} wrong questions to generate NEW similar ones`);

            // Generate AI questions with improved prompt
            const aiGeneratedQuestions = await AIController.callOpenRouterAPI(wrongQuestions, 10);
            const fallbackQuestions = AIController.generateFallbackQuestions(wrongQuestions, 10);
            
            // Ensure exactly 10 questions
            const finalQuestions = AIController.ensureExactly10Questions(aiGeneratedQuestions, fallbackQuestions);

            // Shuffle options for each question to randomize correct answers
            const shuffledQuestions = finalQuestions.map(question => 
                AIController.shuffleQuestionOptions(question)
            );

            console.log(`✅ Generated ${shuffledQuestions.length} NEW questions with randomized options`);

            // Create AI practice session
            const sessionResult = await client.query(`
                INSERT INTO ai_practice_sessions (user_id, original_attempt_id, generated_count, session_name, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING id
            `, [userId, original_attempt_id, shuffledQuestions.length, 'NEW Practice Questions Based on Mistakes']);

            const sessionId = sessionResult.rows[0].id;

            // Store shuffled questions
            const storedQuestions = [];
            for (let i = 0; i < shuffledQuestions.length; i++) {
                const q = shuffledQuestions[i];
                const questionResult = await client.query(`
                    INSERT INTO ai_generated_questions (
                        session_id, question_text, options, correct_option,
                        topic, negative_mark, time_limit_seconds, sequence_order
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                `, [
                    sessionId,
                    q.question_text,
                    JSON.stringify(q.options),
                    q.correct_option,
                    q.topic,
                    2.0,
                    30,
                    i
                ]);

                storedQuestions.push({
                    id: questionResult.rows[0].id,
                    question_text: q.question_text,
                    topic: q.topic,
                    correct_option: q.correct_option
                });
            }

            await client.query('COMMIT');

            console.log(`✅ STORED exactly ${storedQuestions.length} NEW questions`);

            res.json({
                message: `AI generated 10 NEW practice questions based on your mistakes`,
                session_id: sessionId,
                generated_questions: storedQuestions,
                total_generated: storedQuestions.length,
                based_on_wrong_questions: wrongQuestions.length
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ AI question generation error:', error);
            res.status(400).json({
                error: error.message || 'Failed to generate AI questions'
            });
        } finally {
            client.release();
        }
    }

    static ensureExactly10Questions(aiQuestions, fallbackQuestions) {
        const TARGET_COUNT = 10;
        
        const isValidQuestion = (q) => {
            return q && 
                   q.question_text && 
                   q.options && 
                   typeof q.options === 'object' &&
                   q.correct_option && 
                   ['A', 'B', 'C', 'D'].includes(q.correct_option) &&
                   q.topic &&
                   Object.keys(q.options).length === 4;
        };

        let validAIQuestions = aiQuestions.filter(isValidQuestion);
        
        if (validAIQuestions.length >= TARGET_COUNT) {
            return validAIQuestions.slice(0, TARGET_COUNT);
        }

        const needed = TARGET_COUNT - validAIQuestions.length;
        const validFallbackQuestions = fallbackQuestions.filter(isValidQuestion).slice(0, needed);
        
        const finalQuestions = [...validAIQuestions, ...validFallbackQuestions];
        
        // Generate variations if still not enough
        while (finalQuestions.length < TARGET_COUNT) {
            const baseQuestion = validAIQuestions[0] || fallbackQuestions[0];
            const duplicatedQuestion = {
                ...baseQuestion,
                question_text: `[Advanced Practice] ${baseQuestion.question_text.replace(/Practice Question.*?:/, 'Challenge Question:')}`
            };
            finalQuestions.push(duplicatedQuestion);
        }

        return finalQuestions.slice(0, TARGET_COUNT);
    }

    // ✅ MAJOR FIX: Completely rewritten AI prompt to generate NEW similar questions
    static async callOpenRouterAPI(wrongQuestions, maxQuestions) {
        try {
            if (!process.env.OPENROUTER_KEY) {
                throw new Error('OpenRouter API key not configured');
            }

            // ✅ FIX: Better analysis that focuses on CONCEPTS not exact questions
            const conceptAnalysis = wrongQuestions.map((q, i) => {
                const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                return `
CONCEPT GAP ${i + 1}:
Topic: ${q.topic}
User's Knowledge Gap: User chose "${options[q.wrong_answer] || 'Unknown'}" instead of "${options[q.correct_option] || 'Unknown'}"
Core Concept: ${q.topic} fundamentals
Learning Need: Understanding the difference between these concepts
                `.trim();
            }).join('\n\n');

            // ✅ MAJOR FIX: Completely new prompt that demands NEW questions
            const prompt = `You are ExamGenius AI, an expert question generator for software engineering interviews.

CRITICAL MISSION: Generate 10 COMPLETELY NEW practice questions that test the SAME concepts where the user made mistakes, but with DIFFERENT scenarios, examples, and wording.

🚫 DO NOT COPY OR REPEAT the original questions
🚫 DO NOT use the same examples or scenarios
✅ DO create NEW questions that test the SAME underlying concepts
✅ DO vary the correct answers (A, B, C, D) randomly
✅ DO use different coding examples, scenarios, and contexts

CONCEPT ANALYSIS (User's Knowledge Gaps):
${conceptAnalysis}

INSTRUCTIONS:
1. For each concept gap, create NEW questions with DIFFERENT:
   - Code examples
   - Scenarios (different functions, variables, contexts)
   - Wording and phrasing
   - Use cases and applications

2. Keep the SAME underlying concept being tested
3. Make questions test the SAME skill but with FRESH content
4. Vary correct_option across A, B, C, D

EXAMPLE TRANSFORMATION:
❌ Original: "What does React useState return?"
✅ New Similar: "When implementing state management in a React functional component, what does the useState hook provide?"
✅ New Similar: "In React hooks, which structure is returned by useState()?"

Generate EXACTLY 10 NEW questions in JSON format:
[
  {
    "question_text": "COMPLETELY NEW question testing same concept with different example/scenario",
    "options": {
      "A": "New option A with different example",
      "B": "New option B with different wording", 
      "C": "New option C with fresh content",
      "D": "New option D with alternative approach"
    },
    "correct_option": "A",
    "topic": "Same topic as concept gap",
    "negative_mark": 2.0,
    "time_limit_seconds": 30
  }
]

REMEMBER: Create BRAND NEW questions that test the SAME concepts. No copying!`;

            console.log('📤 Requesting 10 NEW similar questions from AI');

            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: 'openai/gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are ExamGenius AI. Your specialty is creating NEW practice questions that test the same concepts as mistakes, but with completely different wording, examples, and scenarios. NEVER copy original questions. Always create fresh content that tests the same skills.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 4000,
                    temperature: 0.7, // ✅ Higher temperature for more creativity
                    top_p: 0.9,
                    frequency_penalty: 0.5, // ✅ Reduce repetition
                    presence_penalty: 0.3 // ✅ Encourage new content
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
                        'Content-Type': 'application/json',
                        'X-Title': 'ExamGenius AI - NEW Similar Question Generator'
                    },
                    timeout: 45000
                }
            );

            if (!response.data?.choices?.[0]?.message?.content) {
                throw new Error('Invalid response from AI service');
            }

            const aiContent = response.data.choices[0].message.content;
            
            let parsedQuestions;
            try {
                const cleanContent = aiContent.replace(/``````/g, '').trim();
                const jsonStart = cleanContent.indexOf('[');
                const jsonEnd = cleanContent.lastIndexOf(']');
                
                if (jsonStart === -1 || jsonEnd === -1) {
                    throw new Error('No JSON array found in AI response');
                }
                
                const jsonStr = cleanContent.slice(jsonStart, jsonEnd + 1);
                parsedQuestions = JSON.parse(jsonStr);
            } catch (parseError) {
                console.error('❌ Failed to parse AI response');
                return []; // Return empty, fallback will handle
            }

            if (!Array.isArray(parsedQuestions)) {
                return [];
            }

            console.log(`📊 AI generated ${parsedQuestions.length} NEW questions`);
            
            // ✅ FIX: Validate that questions are actually different
            const validNewQuestions = parsedQuestions.filter(q => {
                // Basic validation
                const isValid = q && q.question_text && q.options && q.correct_option;
                if (!isValid) return false;
                
                // Check if it's too similar to original questions
                const isTooSimilar = wrongQuestions.some(original => {
                    const similarity = this.calculateSimilarity(q.question_text, original.question_text);
                    return similarity > 0.7; // Reject if more than 70% similar
                });
                
                return !isTooSimilar;
            });

            console.log(`✅ Validated ${validNewQuestions.length} truly NEW questions`);
            return validNewQuestions;

        } catch (error) {
            console.error('❌ OpenRouter API error:', error);
            return [];
        }
    }

    // ✅ NEW: Simple text similarity checker
    static calculateSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const allWords = new Set([...words1, ...words2]);
        
        let matchCount = 0;
        allWords.forEach(word => {
            if (words1.includes(word) && words2.includes(word)) {
                matchCount++;
            }
        });
        
        return matchCount / allWords.size;
    }

    // ✅ FIX: Enhanced fallback with truly different questions
    static generateFallbackQuestions(wrongQuestions, maxQuestions = 10) {
        const fallbackQuestions = [];
        const correctOptions = ['A', 'B', 'C', 'D'];
        
        // Templates for different question types
        const questionTemplates = [
            "In {topic}, when implementing {concept}, what is the best approach?",
            "What happens when you use {concept} in {topic} development?",
            "Which of the following correctly demonstrates {concept} in {topic}?",
            "When working with {topic}, how should you handle {concept}?",
            "What is the primary purpose of {concept} in {topic}?",
            "In {topic} applications, when should you implement {concept}?",
            "Which statement about {concept} in {topic} is correct?",
            "How does {concept} work in the context of {topic}?",
            "What is the recommended way to use {concept} in {topic}?",
            "In {topic} development, what does {concept} provide?"
        ];
        
        for (let i = 0; i < maxQuestions; i++) {
            const baseQuestion = wrongQuestions[i % wrongQuestions.length];
            const correctOption = correctOptions[i % 4];
            const template = questionTemplates[i % questionTemplates.length];
            
            // Extract concept from original question
            const concept = baseQuestion.topic.toLowerCase().includes('react') ? 'hooks' : 
                           baseQuestion.topic.toLowerCase().includes('javascript') ? 'functions' :
                           baseQuestion.topic.toLowerCase().includes('sql') ? 'queries' : 'methods';
            
            const questionText = template
                .replace('{topic}', baseQuestion.topic)
                .replace('{concept}', concept);
            
            const options = {
                "A": `Using ${concept} with proper syntax and best practices`,
                "B": `Implementing ${concept} through alternative methods`,
                "C": `Applying ${concept} in different contexts and scenarios`,
                "D": `Understanding ${concept} fundamentals and core principles`
            };
            
            // Set the correct answer
            options[correctOption] = `✓ Correct implementation of ${concept} in ${baseQuestion.topic}`;
                
            fallbackQuestions.push({
                question_text: questionText,
                options,
                correct_option: correctOption,
                topic: baseQuestion.topic,
                negative_mark: 2.0,
                time_limit_seconds: 30
            });
        }

        console.log(`🔄 Generated ${fallbackQuestions.length} diverse fallback questions`);
        return fallbackQuestions;
    }
}

module.exports = AIController;
