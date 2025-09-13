import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import api from '../api/api';

const AttemptsPage = () => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllAttempts();
  }, []);

  const fetchAllAttempts = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching all attempts...');
      
      // Fetch both regular and AI practice attempts
      const [regularResponse, aiResponse] = await Promise.allSettled([
        api.get('/attempts/user/all'),
        api.get('/ai-practice/user/all')
      ]);

      let allAttempts = [];

      // ✅ FIX: Add detailed debugging for regular attempts
      if (regularResponse.status === 'fulfilled') {
        console.log('🔍 Raw regular response:', regularResponse.value.data); // Debug log
        const regularAttempts = regularResponse.value.data.attempts || regularResponse.value.data || [];
        console.log('✅ Loaded', regularAttempts.length, 'regular attempts');
        console.log('🔍 First regular attempt:', regularAttempts[0]); // Debug log
        
        const formattedRegularAttempts = regularAttempts.map(attempt => ({
          ...attempt,
          is_ai_practice: false
        }));
        allAttempts = [...formattedRegularAttempts];
      } else {
        console.error('❌ Regular attempts failed:', regularResponse.reason);
      }

      // ✅ FIX: Add detailed debugging for AI attempts
      if (aiResponse.status === 'fulfilled') {
        console.log('🔍 Raw AI response:', aiResponse.value.data); // Debug log
        const aiAttempts = aiResponse.value.data.attempts || aiResponse.value.data || [];
        console.log('✅ Loaded', aiAttempts.length, 'AI practice attempts');
        
        const formattedAiAttempts = aiAttempts.map(attempt => ({
          ...attempt,
          test_title: '🤖 AI Practice Session',
          is_ai_practice: true,
          attempt_id: attempt.attempt_id || attempt.id
        }));
        
        allAttempts = [...allAttempts, ...formattedAiAttempts];
      } else {
        console.error('❌ AI attempts failed:', aiResponse.reason);
      }

      // Sort by most recent first
      allAttempts.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
      
      setAttempts(allAttempts);
      console.log('✅ Total attempts loaded:', allAttempts.length);
      console.log('✅ Regular attempts:', allAttempts.filter(a => !a.is_ai_practice).length);
      console.log('✅ AI practice attempts:', allAttempts.filter(a => a.is_ai_practice).length);
    } catch (error) {
      console.error('❌ Failed to fetch attempts:', error);
    } finally {
      setLoading(false);
    }
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

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-warning-600';
    return 'text-danger-600';
  };

  // ✅ FIX: Add function to handle report navigation with validation
  const handleViewReport = (attempt) => {
    console.log('🔗 Navigating to report for attempt:', attempt);
    
    if (!attempt.attempt_id && !attempt.id) {
      console.error('❌ No valid attempt ID found:', attempt);
      alert('Unable to view report: Invalid attempt ID');
      return;
    }
    
    const attemptId = attempt.attempt_id || attempt.id;
    
    if (attempt.is_ai_practice) {
      console.log('🤖 Navigating to AI practice report:', attemptId);
      navigate(`/ai-practice-report/${attemptId}`);
    } else {
      console.log('📊 Navigating to regular report:', attemptId);
      navigate(`/report/${attemptId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your attempts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Test History</h1>
          <p className="text-gray-600 mt-2">View all your test attempts and AI practice sessions</p>
        </div>

        {attempts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No attempts yet</h2>
            <p className="text-gray-600 mb-4">Take your first test to see your progress here</p>
            <Link
              to="/dashboard"
              className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Take a Test
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attempts.map((attempt, index) => {
                    const attemptId = attempt.attempt_id || attempt.id;
                    const uniqueKey = `${attempt.is_ai_practice ? 'ai' : 'regular'}-${attemptId}-${index}`;
                    
                    return (
                      <tr key={uniqueKey} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                              attempt.is_ai_practice ? 'bg-purple-100' : 'bg-primary-100'
                            }`}>
                              {attempt.is_ai_practice ? (
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{attempt.test_title}</div>
                              <div className="text-sm text-gray-500">
                                {attempt.is_ai_practice ? 'AI Practice' : `${attempt.duration_minutes} minutes`}
                              </div>
                              {/* Debug info */}
                              <div className="text-xs text-gray-400">ID: {attemptId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-bold ${getScoreColor(attempt.score)}`}>
                            {attempt.score}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{attempt.correct_answers}/{attempt.total_questions}</div>
                          <div className="text-xs text-gray-500">
                            {attempt.incorrect_answers} wrong, {attempt.unanswered} skipped
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(attempt.started_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {/* ✅ FIX: Use button with proper navigation */}
                          <button
                            onClick={() => handleViewReport(attempt)}
                            className="text-primary-600 hover:text-primary-900 font-medium hover:underline"
                            disabled={!attemptId}
                          >
                            View Report
                          </button>
                          {/* ✅ FIX: Show debug info if no valid ID */}
                          {!attemptId && (
                            <div className="text-xs text-red-500 mt-1">No valid ID</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttemptsPage;
