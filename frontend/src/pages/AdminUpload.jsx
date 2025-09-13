import React, { useState, useEffect } from 'react';
import { isAdmin } from '../utils/auth';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header';
import QuestionUploader from '../components/QuestionUploader';
import AdminTestCreator from '../components/AdminTestCreator';
import UserReportsDashboard from '../components/UserReportsDashboard';
import api from '../api/api';

const AdminUpload = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [questionsRes, topicsRes, testsRes] = await Promise.all([
        api.get('/admin/questions'),
        api.get('/admin/topics'),
        api.get('/tests')
      ]);

      setQuestions(questionsRes.data.questions || []);
      setTopics(topicsRes.data || []);
      setTests(testsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionsUploaded = (newQuestions) => {
    setQuestions([...questions, ...newQuestions]);
    fetchData(); // Refresh all data
  };

  const handleTestCreated = (newTest) => {
    setTests([newTest, ...tests]);
    fetchData(); // Refresh all data
  };

  const getTopicQuestionCounts = () => {
    const counts = {};
    questions.forEach(q => {
      counts[q.topic_name] = (counts[q.topic_name] || 0) + 1;
    });
    return counts;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topicCounts = getTopicQuestionCounts();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">ExamGenius AI Admin Panel</h1>
            <p className="text-primary-100 text-lg">
              Manage questions, tests, and content for the intelligent test preparation platform
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{questions.length}</div>
                <div className="text-sm text-gray-600">Total Questions</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-success-600">{topics.length}</div>
                <div className="text-sm text-gray-600">Topics Covered</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{tests.length}</div>
                <div className="text-sm text-gray-600">Tests Created</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">AI</div>
                <div className="text-sm text-gray-600">Powered</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { key: 'upload', name: 'Upload Questions', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
                { key: 'create', name: 'Create Tests', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
                { key: 'overview', name: 'Content Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { key: 'reports', name: 'User Reports', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'upload' && (
            <QuestionUploader onQuestionsUploaded={handleQuestionsUploaded} topics={topics} />
          )}

          {activeTab === 'create' && (
            <AdminTestCreator 
              questions={questions} 
              topics={topics} 
              onTestCreated={handleTestCreated}
            />
          )}

          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Topics Overview */}
              <div className="bg-white rounded-xl shadow-soft p-6 border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Topics Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topics.map((topic) => (
                    <div key={topic.id} className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900">{topic.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {topicCounts[topic.name] || 0} questions
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Questions */}
              <div className="bg-white rounded-xl shadow-soft p-6 border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Questions</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {questions.slice(0, 10).map((question) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
                          {question.topic_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(question.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium">
                        {question.question_text.length > 100 
                          ? question.question_text.substring(0, 100) + '...'
                          : question.question_text
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tests Overview */}
              <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Tests Overview</h3>
                </div>

                {tests.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No tests created yet</h4>
                    <p className="text-gray-500">Create your first test using the 'Create Tests' tab.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Details</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Questions & Sections</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Duration</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {tests.map((test) => (
                          <tr key={test.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{test.title}</div>
                                <div className="text-sm text-gray-500 mt-1">{test.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {test.question_count} questions
                                </div>
                                {test.sections && test.sections.length > 0 ? (
                                  <div className="text-xs text-gray-500">
                                    {test.sections.length} sections
                                    <div className="mt-1 space-y-1">
                                      {test.sections.map((section, idx) => (
                                        <div key={idx} className="bg-gray-100 rounded px-2 py-1">
                                          {section.section_name}: {section.time_minutes}m
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">No sections</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {test.sections && test.sections.length > 0 ? (
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {test.sections.reduce((sum, s) => sum + s.time_minutes, 0)} min total
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm font-medium text-gray-900">
                                  {test.duration_minutes} minutes
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-500">
                              {new Date(test.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <UserReportsDashboard />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUpload;
