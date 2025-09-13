import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import api from '../api/api';

const Dashboard = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentAttempts, setRecentAttempts] = useState([]);

  useEffect(() => {
    fetchTests();
    fetchRecentAttempts();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await api.get('/tests');
      setTests(response.data);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
  };

  const fetchRecentAttempts = async () => {
    try {
      console.log('📊 Dashboard: Fetching recent attempts...');
      
      // ✅ FIX: Fetch both types of attempts
      const [regularResponse, aiResponse] = await Promise.allSettled([
        api.get('/attempts/user/all?limit=5'),
        api.get('/ai-practice/user/all?limit=5')
      ]);

      let recentAttempts = [];

      // ✅ FIX: Add debugging for regular attempts
      if (regularResponse.status === 'fulfilled') {
        console.log('🔍 Dashboard regular response:', regularResponse.value.data);
        const regularAttempts = regularResponse.value.data.attempts || regularResponse.value.data || [];
        console.log('✅ Dashboard loaded', regularAttempts.length, 'regular attempts');
        
        const formattedRegular = regularAttempts.map(a => ({ 
          ...a, 
          is_ai_practice: false,
          attempt_id: a.attempt_id || a.id // Ensure attempt_id exists
        }));
        recentAttempts = [...formattedRegular];
      } else {
        console.error('❌ Dashboard regular attempts failed:', regularResponse.reason);
      }

      // ✅ FIX: Add debugging for AI attempts  
      if (aiResponse.status === 'fulfilled') {
        console.log('🔍 Dashboard AI response:', aiResponse.value.data);
        const aiAttempts = aiResponse.value.data.attempts || aiResponse.value.data || [];
        console.log('✅ Dashboard loaded', aiAttempts.length, 'AI practice attempts');
        
        const formattedAi = aiAttempts.map(a => ({
          ...a,
          test_title: '🤖 AI Practice',
          is_ai_practice: true,
          attempt_id: a.attempt_id || a.id // Ensure attempt_id exists
        }));
        recentAttempts = [...recentAttempts, ...formattedAi];
      } else {
        console.error('❌ Dashboard AI attempts failed:', aiResponse.reason);
      }

      // Sort and take recent 5
      recentAttempts.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
      const finalAttempts = recentAttempts.slice(0, 5);
      
      console.log('✅ Dashboard total recent attempts:', finalAttempts.length);
      console.log('✅ Dashboard regular attempts:', finalAttempts.filter(a => !a.is_ai_practice).length);
      console.log('✅ Dashboard AI attempts:', finalAttempts.filter(a => a.is_ai_practice).length);
      
      setRecentAttempts(finalAttempts);
      
    } catch (error) {
      console.error('❌ Dashboard failed to fetch recent attempts:', error);
    } finally {
      setLoading(false); // ✅ FIX: Move setLoading here so it always runs
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-warning-600';
    return 'text-danger-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-soft">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Welcome to ExamGenius AI</h1>
            <p className="text-primary-100 text-lg">
              Your intelligent test preparation companion. Choose a test below to begin your journey.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Available Tests</h2>
              <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                {tests.length} tests available
              </span>
            </div>

            {tests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-soft p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tests available</h3>
                <p className="text-gray-500">Check back later for new tests or contact your administrator.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tests.map((test) => (
                  <div key={test.id} className="bg-white rounded-xl shadow-soft hover:shadow-medium transition-all duration-200 border border-gray-100 overflow-hidden group">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {test.title}
                        </h3>
                        <div className="bg-primary-50 text-primary-700 px-2 py-1 rounded-lg text-xs font-medium">
                          {test.question_count} questions
                        </div>
                      </div>
                      
                      {test.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {test.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {test.duration_minutes} min
                          </span>
                          {test.sections && test.sections.length > 0 && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              {test.sections.length} sections
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/test/${test.id}`}
                        className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 px-4 rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 text-center block"
                      >
                        Start Test
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-soft p-6 mb-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Total Tests</span>
                  <span className="font-semibold text-gray-900">{tests.length}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold text-success-600">
                    {recentAttempts.filter(a => a.completed).length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">In Progress</span>
                  <span className="font-semibold text-warning-600">
                    {recentAttempts.filter(a => !a.completed).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Attempts */}
            <div className="bg-white rounded-xl shadow-soft p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Attempts</h3>
                <Link 
                  to="/attempts"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View all
                </Link>
              </div>

              {recentAttempts.length === 0 ? (
                <p className="text-gray-500 text-sm">No attempts yet</p>
              ) : (
                <div className="space-y-3">
                  {recentAttempts.map((attempt) => (
                    <div key={`${attempt.is_ai_practice ? 'ai' : 'reg'}-${attempt.attempt_id}`} 
                         className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          attempt.is_ai_practice ? 'bg-purple-100' : 'bg-primary-100'
                        }`}>
                          {attempt.is_ai_practice ? '🤖' : '📝'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{attempt.test_title}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(attempt.started_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${getScoreColor(attempt.score)}`}>
                          {attempt.score}%
                        </span>
                        {/* ✅ FIX: Correct navigation links */}
                        <Link
                          to={attempt.is_ai_practice 
                            ? `/ai-practice-report/${attempt.attempt_id}` 
                            : `/report/${attempt.attempt_id}`}
                          className="text-xs text-primary-600 hover:text-primary-800"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
