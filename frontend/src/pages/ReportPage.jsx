import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import TopicSummary from '../components/TopicSummary';
import api from '../api/api';

const ReportPage = () => {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generatingQuestions, setGeneratingQuestions] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [attemptId]);

    const fetchReport = async () => {
        try {
            const response = await api.get(`/attempts/${attemptId}/report`);
            setReport(response.data);
        } catch (error) {
            console.error('Failed to fetch report:', error);
            alert('Failed to fetch report. Please try again.');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIX: Generate AI practice questions (limit to current test's wrong answers, max 10)
    const generateSimilarQuestions = async () => {
        if (!report) return;
        
        const wrongAnswers = report.answers.filter(answer => 
            !answer.is_correct && answer.user_answer
        );
        
        if (wrongAnswers.length === 0) {
            alert('Excellent! You answered all questions correctly. No additional practice needed.');
            return;
        }
        
        setGeneratingQuestions(true);
        
        try {
            const response = await api.post('/ai/generate-similar', {
                wrong_question_ids: wrongAnswers.map(answer => answer.question_id),
                original_attempt_id: attemptId,
                max_questions: Math.min(wrongAnswers.length * 2, 10) // ✅ FIX: Limit to max 10
            });
            
            alert(`ExamGenius AI generated ${response.data.generated_questions.length} practice questions for you!`);
            
            // Start AI practice session
            const practiceResponse = await api.post('/ai-practice', {
                original_attempt_id: attemptId
            });
            
            navigate(`/ai-practice/${practiceResponse.data.ai_attempt_id}`);
            
        } catch (error) {
            console.error('Failed to generate questions:', error);
            alert(error.response?.data?.error || 'Failed to generate similar questions. Please try again.');
        } finally {
            setGeneratingQuestions(false);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds || seconds < 60) {
            return `${Math.round(seconds || 0)}s`;
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${Math.round(secs)}s`;
    };

    const getOptionText = (optionValue) => {
        if (typeof optionValue === 'string') {
            return optionValue;
        }
        if (typeof optionValue === 'object' && optionValue !== null) {
            if (optionValue.text) return optionValue.text;
            if (optionValue.value) return optionValue.value;
            const values = Object.values(optionValue);
            if (values.length > 0 && typeof values[0] === 'string') {
                return values[0];
            }
            return JSON.stringify(optionValue);
        }
        return String(optionValue);
    };

    const formatQuestionOptions = (answer) => {
        const options = answer.formatted_options || answer.options || {};
        
        if (Array.isArray(options)) {
            const optionsObj = {};
            options.forEach((option, index) => {
                const key = String.fromCharCode(65 + index);
                optionsObj[key] = getOptionText(option);
            });
            return optionsObj;
        }
        
        if (typeof options === 'object' && options !== null) {
            const formattedOptions = {};
            Object.entries(options).forEach(([key, value]) => {
                formattedOptions[key] = getOptionText(value);
            });
            return formattedOptions;
        }
        
        return {};
    };

    const getPerformanceMetrics = () => {
        if (!report || !report.answers) return null;
        
        const totalQuestions = report.answers.length;
        const correctAnswers = report.answers.filter(a => a.is_correct).length;
        const incorrectAnswers = report.answers.filter(a => !a.is_correct && a.user_answer).length;
        const unansweredQuestions = report.answers.filter(a => !a.user_answer).length;
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        
        return {
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            unansweredQuestions,
            accuracy
        };
    };

    // ✅ FIX: Calculate topic-wise performance correctly
    const getTopicWisePerformance = () => {
        if (!report || !report.answers) return [];
        
        const topicMap = new Map();
        
        report.answers.forEach(answer => {
            const topic = answer.topic_name;
            if (!topicMap.has(topic)) {
                topicMap.set(topic, {
                    topic: topic,
                    total_questions: 0,
                    correct_count: 0,
                    incorrect_count: 0,
                    unanswered_count: 0,
                    total_marks: 0,
                    avg_time_seconds: 0,
                    total_time: 0
                });
            }
            
            const topicData = topicMap.get(topic);
            topicData.total_questions++;
            topicData.total_time += (answer.time_used || 0);
            
            if (answer.user_answer) {
                if (answer.is_correct) {
                    topicData.correct_count++;
                    topicData.total_marks += 1;
                } else {
                    topicData.incorrect_count++;
                    topicData.total_marks -= 2; // ✅ FIX: -2 for wrong answers
                }
            } else {
                topicData.unanswered_count++;
            }
        });
        
        // Calculate averages
        const topicArray = Array.from(topicMap.values()).map(topic => ({
            ...topic,
            avg_time_seconds: topic.total_questions > 0 ? topic.total_time / topic.total_questions : 0
        }));
        
        return topicArray;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-700">Analyzing your performance with AI insights</h2>
                    </div>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                    <h2 className="text-xl font-semibold text-red-600">Error</h2>
                    <p className="text-gray-600 mt-2">There was an error loading your performance data.</p>
                </div>
            </div>
        );
    }

    const metrics = getPerformanceMetrics();
    const topicPerformance = getTopicWisePerformance();

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Test Performance Report</h1>
                    <p className="text-gray-600">{report.attempt.test_title}</p>
                    
                    {/* Score Display */}
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-primary-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-primary-600">{report.attempt.score}%</div>
                            <div className="text-sm text-primary-600">Final Score</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{metrics.correctAnswers}</div>
                            <div className="text-sm text-green-600">Correct</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-red-600">{metrics.incorrectAnswers}</div>
                            <div className="text-sm text-red-600">Incorrect</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-gray-600">{metrics.unansweredQuestions}</div>
                            <div className="text-sm text-gray-600">Unanswered</div>
                        </div>
                    </div>
                </div>

                {/* Topic-wise Performance */}
                <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Topic-wise Performance</h2>
                    <TopicSummary topicData={topicPerformance} />
                </div>

                {/* AI Recommendations */}
                {metrics.incorrectAnswers > 0 && (
                    <div className="bg-gradient-to-r from-primary-50 to-orange-50 rounded-lg p-6 mb-6 border border-primary-200">
                        <h2 className="text-xl font-bold text-primary-800 mb-2">🤖 AI Recommendations</h2>
                        <p className="text-primary-700 mb-4">
                            Generate similar questions for topics you got wrong and practice again with ExamGenius AI's intelligent system.
                        </p>
                        
                        <button
                            onClick={generateSimilarQuestions}
                            disabled={generatingQuestions}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                            {generatingQuestions ? '🔄 Generating...' : '🎯 Generate AI Practice Questions'}
                        </button>
                        
                        {generatingQuestions && (
                            <p className="text-primary-600 text-sm mt-2">
                                ExamGenius AI is analyzing your mistakes and creating personalized practice questions...
                            </p>
                        )}
                    </div>
                )}

                {/* Question-wise Breakdown */}
                <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Detailed Breakdown</h2>
                    <p className="text-gray-600 mb-4">Detailed breakdown of each question</p>
                    
                    <div className="space-y-6">
                        {report.answers.map((answer, index) => {
                            const formattedOptions = formatQuestionOptions(answer);
                            const isCorrect = answer.is_correct;
                            const isAnswered = answer.user_answer;
                            
                            return (
                                <div key={answer.question_id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-semibold text-gray-800">
                                            Question {index + 1}
                                        </h3>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm text-gray-500">
                                                {answer.topic_name}
                                            </span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                isCorrect ? 'bg-green-100 text-green-800' :
                                                isAnswered ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {isCorrect ? '✓ Correct' : isAnswered ? '✗ Incorrect' : '⊘ Skipped'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <p className="text-gray-700 mb-3">{answer.question_text}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                                        {Object.entries(formattedOptions).map(([key, value]) => (
                                            <div
                                                key={key}
                                                className={`p-2 rounded border ${
                                                    answer.user_answer === key && isCorrect
                                                        ? 'bg-green-50 border-green-200'
                                                    : answer.user_answer === key && !isCorrect
                                                        ? 'bg-red-50 border-red-200'
                                                    : answer.correct_answer === key
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-gray-50 border-gray-200'
                                                }`}
                                            >
                                                <span className="font-semibold">{key}.</span> {value}
                                                {answer.correct_answer === key && (
                                                    <span className="ml-2 text-blue-600 text-sm">✓ Correct</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-sm text-gray-500">
                                        <span>Time taken: {formatTime(answer.time_used)}</span>
                                        {/* ✅ FIX: Show -2 marks only for incorrect answers */}
                                        <span>
                                            Marks: {
                                                isCorrect ? '+1' : 
                                                isAnswered ? '-2' : '0'
                                            }
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ✅ FIX: Required buttons at bottom */}
                <div className="bg-white rounded-lg shadow-soft p-6">
                    <div className="flex flex-wrap gap-4 justify-center">
                        
                        <button
                            onClick={generateSimilarQuestions}
                            disabled={generatingQuestions || metrics.incorrectAnswers === 0}
                            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                            🤖 Generate AI Practice Questions
                        </button>
                        
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            🏠 Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportPage;
