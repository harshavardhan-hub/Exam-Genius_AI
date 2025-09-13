import React from 'react';

const TopicSummary = ({ topicData }) => {
    if (!topicData || topicData.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <p>Complete some tests to see your topic-wise performance.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed breakdown of your performance by topic</h3>
            
            {/* ✅ FIX: Improved topic-wise performance table */}
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Topic</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Correct</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Incorrect</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Unanswered</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Accuracy</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Avg Time</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topicData.map((topic, index) => {
                            const totalQuestions = topic.total_questions || 0;
                            const correctCount = topic.correct_count || 0;
                            const incorrectCount = topic.incorrect_count || 0;
                            const unansweredCount = topic.unanswered_count || 0;
                            
                            // ✅ FIX: Calculate accuracy properly
                            const answeredQuestions = correctCount + incorrectCount;
                            const accuracy = answeredQuestions > 0 ? (correctCount / answeredQuestions) * 100 : 0;
                            const avgTime = Math.round(topic.avg_time_seconds || 0);
                            
                            return (
                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3 ${
                                                accuracy >= 80 ? 'bg-green-500' :
                                                accuracy >= 60 ? 'bg-yellow-500' :
                                                accuracy >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                            }`}>
                                                {(topic.topic || topic.topic_name || 'T').charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-800">
                                                    {topic.topic || topic.topic_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {totalQuestions} questions
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {correctCount}
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            {incorrectCount}
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {unansweredCount}
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        <div className="flex flex-col items-center">
                                            <span className={`text-sm font-semibold ${
                                                accuracy >= 70 ? 'text-green-600' :
                                                accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                                {accuracy.toFixed(1)}%
                                            </span>
                                            <div className="w-12 bg-gray-200 rounded-full h-1.5 mt-1">
                                                <div 
                                                    className={`h-1.5 rounded-full ${
                                                        accuracy >= 70 ? 'bg-green-500' :
                                                        accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${Math.min(accuracy, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        <span className="text-sm text-gray-600">
                                            {avgTime}s
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        <span className={`text-sm font-semibold ${
                                            (topic.total_marks || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {parseFloat(topic.total_marks || 0).toFixed(1)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TopicSummary;
