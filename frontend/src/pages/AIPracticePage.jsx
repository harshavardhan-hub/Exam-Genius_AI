import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import TestQuestion from '../components/TestQuestion';
import api from '../api/api';

const AIPracticePage = () => {
    const { aiAttemptId } = useParams();
    const navigate = useNavigate();
    
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [totalTimeLeft, setTotalTimeLeft] = useState(1800); // 30 minutes
    const [timerActive, setTimerActive] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        fetchAIQuestions();
    }, [aiAttemptId]);

    // ✅ FIX: Proper countdown timer implementation
    useEffect(() => {
        if (!timerActive || totalTimeLeft <= 0) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        timerRef.current = setInterval(() => {
            setTotalTimeLeft(prevTime => {
                const newTime = prevTime - 1;
                
                if (newTime <= 0) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    setTimeout(() => handleTimeUp(), 100);
                    return 0;
                }
                
                return newTime;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [timerActive]);

    const fetchAIQuestions = async () => {
        try {
            const response = await api.get(`/ai-practice/${aiAttemptId}/questions`);
            const aiQuestions = response.data.questions || [];
            
            if (aiQuestions.length === 0) {
                setError('No AI questions found. Please generate questions first.');
                return;
            }
            
            setQuestions(aiQuestions);
            const duration = response.data.default_duration_seconds || 1800;
            setTotalTimeLeft(duration);
            setTimerActive(true);
            setQuestionStartTime(Date.now());
            
            console.log(`✅ Timer started: ${Math.floor(duration/60)} minutes`);
        } catch (error) {
            setError('Failed to load AI questions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = async (selectedOption, timeUsed) => {
        if (submitting) return;
        
        setSubmitting(true);
        const currentQuestion = questions[currentQuestionIndex];
        const actualTimeUsed = Math.floor((Date.now() - questionStartTime) / 1000);
        
        try {
            const response = await api.post(`/ai-practice/${aiAttemptId}/answer`, {
                ai_question_id: currentQuestion.id,
                selected_option: selectedOption,
                time_taken_seconds: actualTimeUsed
            });

            setAnswers(prev => ({
                ...prev,
                [currentQuestion.id]: {
                    selected: selectedOption,
                    is_correct: response.data.is_correct,
                    correct_option: response.data.correct_option,
                    time_used: actualTimeUsed
                }
            }));

            // Move to next question
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setQuestionStartTime(Date.now());
            } else {
                finishAIPractice();
            }
        } catch (error) {
            console.error('Failed to submit AI answer:', error);
            alert('Failed to submit answer. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTimeUp = () => {
        console.log('⏰ Time up!');
        finishAIPractice();
    };

    // ✅ FIX: Improved finish function with proper navigation
    const finishAIPractice = async () => {
        if (loading) return;
        
        try {
            setLoading(true);
            setTimerActive(false);
            
            console.log('🏁 Finishing AI practice:', aiAttemptId);
            
            const response = await api.post(`/ai-practice/${aiAttemptId}/finish`);
            console.log('✅ AI practice completed:', response.data);
            
            // ✅ FIX: Navigate immediately with proper ID
            navigate(`/ai-practice-report/${aiAttemptId}`);
            
        } catch (error) {
            console.error('❌ Failed to finish:', error);
            setError('Failed to complete practice session');
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        if (seconds <= 0) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgress = () => {
        const answered = Object.keys(answers).length;
        const total = questions.length;
        return { answered, total };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading AI Practice Session</h2>
                        <p className="text-gray-500">Setting up your personalized questions...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-2xl mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = getProgress();

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header with Live Timer */}
                <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">🤖 AI Practice Session</h1>
                            <p className="text-gray-600 mt-1">Questions based on your mistakes</p>
                        </div>
                        
                        {/* ✅ FIX: Working countdown timer */}
                        <div className={`inline-flex items-center px-4 py-2 rounded-lg border font-mono text-lg font-semibold ${
                            totalTimeLeft <= 300 ? 'text-red-600 bg-red-50 border-red-200' :
                            totalTimeLeft <= 900 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                            'text-green-600 bg-green-50 border-green-200'
                        }`}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTime(totalTimeLeft)}
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                            <span>Progress: {progress.answered}/{progress.total} answered</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${(progress.answered / progress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Current Question */}
                {currentQuestion && (
                    <TestQuestion
                        question={currentQuestion}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={questions.length}
                        onAnswer={handleAnswer}
                        selectedAnswer={answers[currentQuestion.id]?.selected || null}
                        showResult={false}
                    />
                )}

                {/* Finish Early Button */}
                <div className="mt-6 text-center">
                    <button
                        onClick={finishAIPractice}
                        disabled={loading}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Finishing...' : 'Finish Practice Early'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIPracticePage;
