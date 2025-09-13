import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import TestQuestion from '../components/TestQuestion';
import Timer from '../components/Timer';
import api from '../api/api';

const TestPage = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    
    // Test and Section State
    const [test, setTest] = useState(null);
    const [sections, setSections] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [hasSections, setHasSections] = useState(false);
    
    // Current Progress State
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [attemptId, setAttemptId] = useState(null);
    
    // Answers and Timing
    const [answers, setAnswers] = useState({});
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    
    // ✅ FIX: Single timer state for the entire test
    const [totalTestTimeLeft, setTotalTestTimeLeft] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [testFinished, setTestFinished] = useState(false);
    
    // Refs
    const startingTest = useRef(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (startingTest.current) return;
        startingTest.current = true;
        startTest();
    }, [testId]);

    // ✅ FIX: Single global timer for entire test
    useEffect(() => {
        if (!timerActive || totalTestTimeLeft <= 0) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        timerRef.current = setInterval(() => {
            setTotalTestTimeLeft(prev => {
                const newTime = prev - 1;
                
                if (newTime <= 0) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    setTimeout(() => {
                        handleTotalTimeUp();
                    }, 0);
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
    }, [timerActive, totalTestTimeLeft]);

    const startTest = async () => {
        console.log('=== STARTING EXAMGENIUS AI TEST ===');
        console.log('Test ID:', testId);
        
        try {
            // Start the attempt
            const response = await api.post('/attempts', { test_id: testId });
            console.log('Start attempt response:', response.data);
            
            setAttemptId(response.data.attempt_id);
            setQuestions(response.data.questions);
            
            // Fetch detailed test information including sections
            const testResponse = await api.get(`/tests/${testId}`);
            const testData = testResponse.data;
            console.log('Test data:', testData);
            
            setTest(testData.test);
            setSections(testData.sections || []);
            setHasSections(testData.has_sections || false);
            
            // ✅ FIX: Set total test time from test duration
            const totalMinutes = testData.test.duration_minutes || 60;
            const totalSeconds = totalMinutes * 60;
            setTotalTestTimeLeft(totalSeconds);
            setTimerActive(true);
            
            setQuestionStartTime(Date.now());
            setLoading(false);
            
            console.log('ExamGenius AI test started successfully with', {
                attemptId: response.data.attempt_id,
                sections: testData.sections?.length || 0,
                questions: response.data.questions.length,
                hasSections: testData.has_sections,
                totalTimeMinutes: totalMinutes
            });
            
        } catch (error) {
            console.error('Failed to start ExamGenius AI test:', error);
            alert('Failed to start test. Please try again.');
            navigate('/dashboard');
        }
    };

    const getCurrentSection = () => {
        if (!hasSections || sections.length === 0) {
            return null;
        }
        return sections[currentSectionIndex];
    };

    const getCurrentQuestion = () => {
        return questions[currentQuestionIndex];
    };

    const getQuestionsInCurrentSection = () => {
        if (!hasSections || sections.length === 0) {
            return questions;
        }
        const currentSection = getCurrentSection();
        if (!currentSection) return [];
        return currentSection.questions || [];
    };

    const handleAnswer = async (selectedOption, timeUsed) => {
        if (!attemptId || submitting || testFinished) return;
        
        setSubmitting(true);
        const currentQuestion = getCurrentQuestion();
        const actualTimeUsed = Math.floor((Date.now() - questionStartTime) / 1000);
        
        try {
            console.log('Submitting answer for question:', currentQuestion.id);
            
            const response = await api.post(`/attempts/${attemptId}/answer`, {
                question_id: currentQuestion.id,
                selected_option: selectedOption,
                time_taken_seconds: actualTimeUsed
            });

            // ✅ FIX: Store answer locally with proper state management
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
            moveToNextQuestion();
            
        } catch (error) {
            console.error('Failed to submit answer:', error);
            alert('Failed to submit answer. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const moveToNextQuestion = () => {
        const questionsInSection = getQuestionsInCurrentSection();
        const totalQuestions = hasSections ? questionsInSection.length : questions.length;
        
        if (currentQuestionIndex < totalQuestions - 1) {
            // ✅ FIX: Move to next question and reset question start time
            setCurrentQuestionIndex(prev => prev + 1);
            setQuestionStartTime(Date.now());
        } else {
            // End of section or test
            if (hasSections && currentSectionIndex < sections.length - 1) {
                // Move to next section
                moveToNextSection();
            } else {
                // End of test
                finishTest();
            }
        }
    };

    const moveToNextSection = () => {
        const nextSectionIndex = currentSectionIndex + 1;
        if (nextSectionIndex < sections.length) {
            setCurrentSectionIndex(nextSectionIndex);
            setCurrentQuestionIndex(0);
            setQuestionStartTime(Date.now());
            console.log(`Moved to section ${nextSectionIndex + 1} of ${sections.length}`);
        } else {
            finishTest();
        }
    };

    const handleTotalTimeUp = () => {
        console.log('Total test time is up!');
        finishTest();
    };

    const finishTest = async () => {
        if (testFinished) return;
        
        setTestFinished(true);
        setTimerActive(false);
        
        console.log('=== FINISHING EXAMGENIUS AI TEST ===');
        console.log('Attempt ID:', attemptId);
        
        if (!attemptId) {
            console.error('ERROR: No attempt ID available');
            alert('Error: No attempt ID found');
            setTestFinished(false);
            return;
        }

        try {
            console.log('Calling finish endpoint with attemptId:', attemptId);
            const response = await api.post(`/attempts/${attemptId}/finish`);
            console.log('Finish response:', response.data);
            
            navigate(`/report/${attemptId}`);
        } catch (error) {
            console.error('Failed to finish test:', error);
            setTestFinished(false);
            alert('Failed to finish test. Please try again.');
        }
    };

    const formatTime = (seconds) => {
        if (seconds <= 0) return "00:00";
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getOverallProgress = () => {
        if (hasSections) {
            let totalQuestionsAnswered = 0;
            let totalQuestions = 0;
            
            sections.forEach((section, sectionIdx) => {
                const sectionQuestions = section.questions || [];
                totalQuestions += sectionQuestions.length;
                
                if (sectionIdx < currentSectionIndex) {
                    totalQuestionsAnswered += sectionQuestions.length;
                } else if (sectionIdx === currentSectionIndex) {
                    totalQuestionsAnswered += currentQuestionIndex + (answers[getCurrentQuestion()?.id] ? 1 : 0);
                }
            });
            
            return { answered: totalQuestionsAnswered, total: totalQuestions };
        } else {
            return {
                answered: currentQuestionIndex + (answers[getCurrentQuestion()?.id] ? 1 : 0),
                total: questions.length
            };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Setting up intelligent testing environment</h2>
                        <p className="text-gray-500">ExamGenius AI is preparing your personalized test experience...</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = getCurrentQuestion();
    const currentSection = getCurrentSection();
    const progress = getOverallProgress();

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Test Header */}
                <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{test?.title}</h1>
                            {test?.description && (
                                <p className="text-gray-600 mt-1">{test.description}</p>
                            )}
                            {currentSection && (
                                <div className="mt-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                                        {currentSection.name}
                                    </span>
                                    {currentSection.description && (
                                        <p className="text-gray-500 text-sm mt-1">{currentSection.description}</p>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* ✅ FIX: Single global timer display */}
                        <div className="text-right">
                            <div className={`inline-flex items-center px-4 py-2 rounded-lg border font-mono text-lg font-semibold ${
                                totalTestTimeLeft <= 300 ? 'text-red-600 bg-red-50 border-red-200' :
                                totalTestTimeLeft <= 900 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                                'text-green-600 bg-green-50 border-green-200'
                            }`}>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatTime(totalTestTimeLeft)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Time Remaining</p>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Progress: {progress.answered}/{progress.total} questions</span>
                            <span>{Math.round((progress.answered / progress.total) * 100)}% complete</span>
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
                {currentQuestion ? (
                    <TestQuestion
                        question={currentQuestion}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={hasSections ? getQuestionsInCurrentSection().length : questions.length}
                        onAnswer={handleAnswer}
                        selectedAnswer={answers[currentQuestion.id]?.selected || null} // ✅ FIX: Pass current selection
                        showResult={false}
                    />
                ) : (
                    <div className="bg-white rounded-lg shadow-soft p-6 text-center">
                        <p className="text-gray-500">Loading question...</p>
                    </div>
                )}

                {/* Manual Finish Button */}
                <div className="mt-6 text-center">
                    <button
                        onClick={finishTest}
                        disabled={testFinished}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {testFinished ? 'Finishing...' : 'Finish Test Early'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestPage;
