import React, { useState, useEffect } from 'react';
import api from '../api/api';

const UserReportsDashboard = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userReports, setUserReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingReports, setLoadingReports] = useState(false);
    const [showUserReports, setShowUserReports] = useState(false);

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (error) {
            alert('Failed to fetch users: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchUserReports = async (userId, userName) => {
        setLoadingReports(true);
        setSelectedUser({ id: userId, name: userName });
        setShowUserReports(true);
        
        try {
            const response = await api.get(`/admin/users/${userId}/reports`);
            setUserReports(response.data);
        } catch (error) {
            alert('Failed to fetch user reports: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoadingReports(false);
        }
    };

    const closeUserReports = () => {
        setShowUserReports(false);
        setSelectedUser(null);
        setUserReports(null);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatScore = (score) => {
        return typeof score === 'number' ? score.toFixed(1) : 'N/A';
    };

    const formatAccuracy = (correct, total) => {
        if (total === 0) return '0%';
        return ((correct / total) * 100).toFixed(1) + '%';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (showUserReports && selectedUser) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800">
                        📊 Detailed analytics powered by ExamGenius AI
                    </h2>
                    <button
                        onClick={closeUserReports}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        ← Back to Users
                    </button>
                </div>

                {loadingReports ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                            <p className="text-gray-600">Loading comprehensive reports...</p>
                        </div>
                    </div>
                ) : userReports ? (
                    <>
                        {/* User Info */}
                        <div className="bg-white rounded-lg shadow-soft p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                Student Profile: {userReports.user.name}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Email:</span>
                                    <p className="font-medium">{userReports.user.email}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">College:</span>
                                    <p className="font-medium">{userReports.user.college}</p>
                                </div>
                                {/* ✅ FIX: Updated field name */}
                                <div>
                                    <span className="text-gray-500">Target:</span>
                                    <p className="font-medium">{userReports.user.target_exam_type || 'Full Stack'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Joined:</span>
                                    <p className="font-medium">{formatDate(userReports.user.created_at)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Topic Performance */}
                        {userReports.topic_performance && userReports.topic_performance.length > 0 && (
                            <div className="bg-white rounded-lg shadow-soft p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Topic-wise Performance</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-2 px-4 font-medium text-gray-700">Topic</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700">Questions</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700">Correct</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700">Accuracy</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700">Avg Time</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700">Marks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userReports.topic_performance.map((topic, index) => (
                                                <tr key={index} className="border-b border-gray-100">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3 ${
                                                                formatAccuracy(topic.correct_answers, topic.questions_attempted).replace('%', '') >= 70 ? 'bg-green-500' : 
                                                                formatAccuracy(topic.correct_answers, topic.questions_attempted).replace('%', '') >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}>
                                                                {topic.topic_name?.charAt(0) || 'T'}
                                                            </div>
                                                            {topic.topic_name}
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-4">{topic.questions_attempted}</td>
                                                    <td className="text-center py-3 px-4">{topic.correct_answers}</td>
                                                    <td className="text-center py-3 px-4">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`text-sm font-semibold ${
                                                                formatAccuracy(topic.correct_answers, topic.questions_attempted).replace('%', '') >= 70 ? 'text-green-600' :
                                                                formatAccuracy(topic.correct_answers, topic.questions_attempted).replace('%', '') >= 50 ? 'text-yellow-600' : 'text-red-600'
                                                            }`}>
                                                                {formatAccuracy(topic.correct_answers, topic.questions_attempted)}
                                                            </span>
                                                            <div className="w-12 bg-gray-200 rounded-full h-1.5 mt-1">
                                                                <div 
                                                                    className={`h-1.5 rounded-full ${
                                                                        formatAccuracy(topic.correct_answers, topic.questions_attempted).replace('%', '') >= 70 ? 'bg-green-500' :
                                                                        formatAccuracy(topic.correct_answers, topic.questions_attempted).replace('%', '') >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min(parseFloat(formatAccuracy(topic.correct_answers, topic.questions_attempted).replace('%', '')), 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-4">{Math.round(topic.avg_time_seconds)}s</td>
                                                    <td className="text-center py-3 px-4">
                                                        <span className={`font-semibold ${
                                                            topic.total_marks >= 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                            {formatScore(topic.total_marks)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Attempt History */}
                        <div className="bg-white rounded-lg shadow-soft p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Attempt History</h3>
                            {userReports.attempts && userReports.attempts.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-2 px-4 font-medium text-gray-700">Test</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700">Type</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700">Date</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700">Score</th>
                                                <th className="text-center py-2 px-4 font-medium text-gray-700">Performance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userReports.attempts.map((attempt, index) => (
                                                <tr key={index} className="border-b border-gray-100">
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <div className="font-medium">{attempt.test_title}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {attempt.total_questions} questions
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            attempt.attempt_type === 'ai_practice' 
                                                                ? 'bg-purple-100 text-purple-800' 
                                                                : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {attempt.attempt_type === 'ai_practice' ? 'AI Practice' : 'Regular'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-3 px-4 text-sm">
                                                        {formatDate(attempt.started_at)}
                                                    </td>
                                                    <td className="text-center py-3 px-4">
                                                        {attempt.completed ? (
                                                            <span className={`font-semibold ${
                                                                attempt.score >= 70 ? 'text-green-600' :
                                                                attempt.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                                                            }`}>
                                                                {formatScore(attempt.score)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500 text-sm">In Progress</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center py-3 px-4 text-sm">
                                                        {/* ✅ FIX: Updated performance display with new scoring */}
                                                        <div className="flex justify-center space-x-2">
                                                            <span className="text-green-600">✓ {attempt.correct_answers}</span>
                                                            <span className="text-red-600">✗ {attempt.incorrect_answers}</span>
                                                            <span className="text-gray-500">⊘ {attempt.unanswered}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Avg: {Math.round(attempt.avg_time_per_question || 0)}s/q
                                                        </div>
                                                        {/* Show positive/negative marks */}
                                                        <div className="text-xs mt-1">
                                                            <span className="text-green-600">+{attempt.correct_answers}</span>
                                                            <span className="text-red-600 ml-1">-{attempt.incorrect_answers * 2}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    This student hasn't taken any tests on ExamGenius AI yet.
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <p className="text-red-600">There was an error loading the student's performance data.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-soft p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    👥 Comprehensive analytics for all ExamGenius AI students
                </h2>
                
                {users.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Student Details</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Academic Info</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Test Performance</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-800">{user.name}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                    {user.phone && (
                                                        <div className="text-sm text-gray-500">{user.phone}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="text-sm">
                                                <div><strong>College:</strong> {user.college}</div>
                                                <div><strong>Year:</strong> {user.year}</div>
                                                {/* ✅ FIX: Updated field name */}
                                                <div><strong>Target:</strong> {user.target_exam_type}</div>
                                                <div className="mt-1 text-xs text-gray-500">
                                                    10th: {user.class10_percent}% | 12th: {user.class12_percent}%
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="text-sm">
                                                <div><strong>Attempts:</strong> {user.completed_attempts}/{user.total_attempts}</div>
                                                <div><strong>Avg:</strong> {formatScore(user.average_score)}%</div>
                                                <div><strong>Best:</strong> {formatScore(user.highest_score)}%</div>
                                                {/* ✅ FIX: Show correct/incorrect counts if available */}
                                                {user.total_correct > 0 && (
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        ✓{user.total_correct} ✗{user.total_incorrect}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <button
                                                onClick={() => fetchUserReports(user.id, user.name)}
                                                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                📊 View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-4">👥</div>
                        <p>Students will appear here once they register for ExamGenius AI.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserReportsDashboard;
