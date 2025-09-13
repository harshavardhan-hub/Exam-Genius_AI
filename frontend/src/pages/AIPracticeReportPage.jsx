import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import api from '../api/api';

const AIPracticeReportPage = () => {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log('🔄 Report page loaded with attemptId:', attemptId);
        
        if (!attemptId || attemptId === 'undefined') {
            setError('Invalid attempt ID');
            setLoading(false);
            return;
        }
        
        fetchReport();
    }, [attemptId]);

    // ✅ FIX: Simplified report fetching without infinite retries
    const fetchReport = async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('📊 Fetching AI practice report for:', attemptId);
            
            // Simple fetch without complex retry logic
            const response = await api.get(`/ai-practice/${attemptId}/report`);
            
            console.log('✅ Report data received:', response.data);
            
            if (response.data && response.data.attempt) {
                setReport(response.data);
            } else {
                throw new Error('Invalid report data received');
            }
            
        } catch (error) {
            console.error('❌ Failed to fetch report:', error);
            
            if (error.response?.status === 400) {
                setError('AI practice session is not completed yet. Please try again in a moment.');
            } else if (error.response?.status === 404) {
                setError('AI practice report not found.');
            } else {
                setError('Failed to load report. Please try again.');
            }
        } finally {
            setLoading(false);
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
        if (typeof optionValue === 'string') return optionValue;
        if (typeof optionValue === 'object' && optionValue !== null) {
            return optionValue.text || optionValue.value || JSON.stringify(optionValue);
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

    const generateAIReportTitle = () => {
        if (!report?.answers || report.answers.length === 0) return 'AI Practice Session';
        
        const topicCounts = {};
        report.answers.forEach(answer => {
            const topic = answer.topic_name;
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
        
        if (Object.keys(topicCounts).length === 0) return 'AI Practice Session';
        
        const predominantTopic = Object.keys(topicCounts).reduce((a, b) => 
            topicCounts[a] > topicCounts[b] ? a : b
        );
        
        return `${predominantTopic} by AI`;
    };

    // ✅ FIX: Simplified loading screen
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold text-gray-700">Loading Your AI Practice Report</h2>
                        <p className="text-gray-500 mt-2">Please wait while we analyze your performance...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-red-800 mb-2">Unable to Load Report</h2>
                        <p className="text-red-600 mb-4">{error}</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={fetchReport}
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
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
                    <h2 className="text-xl font-semibold text-gray-600">No report data available.</h2>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const { attempt, answers } = report;
    const aiReportTitle = generateAIReportTitle();

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header with Score */}
                <div className="bg-gradient-to-r from-primary-50 to-orange-50 rounded-lg shadow-soft p-6 mb-6 border border-primary-200">
                    <h1 className="text-3xl font-bold text-primary-800 mb-2">🤖 {aiReportTitle}</h1>
                    <p className="text-primary-700">AI-generated practice session results</p>
                    
                    {/* ✅ FIX: Proper score display */}
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 text-center border border-primary-200">
                            <div className="text-2xl font-bold text-primary-600">
                                {attempt?.score !== null && attempt?.score !== undefined 
                                    ? `${parseFloat(attempt.score).toFixed(2)}%` 
                                    : '0.00%'}
                            </div>
                            <div className="text-sm text-primary-600">AI Practice Score</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                            <div className="text-2xl font-bold text-green-600">{attempt?.correct_answers || 0}</div>
                            <div className="text-sm text-green-600">Correct</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                            <div className="text-2xl font-bold text-red-600">{attempt?.incorrect_answers || 0}</div>
                            <div className="text-sm text-red-600">Incorrect</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                            <div className="text-2xl font-bold text-gray-600">{attempt?.unanswered || 0}</div>
                            <div className="text-sm text-gray-600">Unanswered</div>
                        </div>
                    </div>
                </div>

                {/* Questions Analysis */}
                {answers && answers.length > 0 ? (
                    <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Question Analysis</h2>
                        
                        <div className="space-y-6">
                            {answers.map((answer, index) => {
                                const formattedOptions = formatQuestionOptions(answer);
                                const isCorrect = answer.is_correct;
                                const isAnswered = answer.user_answer;
                                
                                return (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-semibold text-gray-800">Question {index + 1}</h3>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                                    🤖 {answer.topic_name}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                    isCorrect ? 'bg-green-100 text-green-800' :
                                                    isAnswered ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {isCorrect ? '✓ Correct' : isAnswered ? '✗ Wrong' : '⊘ Skipped'}
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
                                            <span>Time: {formatTime(answer.time_used)}</span>
                                            <span>Points: {isCorrect ? '+1' : isAnswered ? '-2' : '0'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
                        <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-4">📝</div>
                            <p>No questions were answered in this session.</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="bg-white rounded-lg shadow-soft p-6">
                    <div className="flex flex-wrap gap-4 justify-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            🏠 Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/attempts')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            📊 All Attempts
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIPracticeReportPage;
