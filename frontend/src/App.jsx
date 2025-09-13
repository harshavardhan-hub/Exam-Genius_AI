import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './utils/auth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TestPage from './pages/TestPage';
import ReportPage from './pages/ReportPage';
import AdminUpload from './pages/AdminUpload';
import AttemptsPage from './pages/AttemptsPage';
import AIPracticePage from './pages/AIPracticePage';
import AIPracticeReportPage from './pages/AIPracticeReportPage';

/**
 * ExamGenius AI - Main Application Component
 * Handles routing and authentication flow
 */

// Protected Route component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

// Public Route component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  return !isAuthenticated() ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Router>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />

          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/test/:testId" 
            element={
              <ProtectedRoute>
                <TestPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/report/:attemptId" 
            element={
              <ProtectedRoute>
                <ReportPage />
              </ProtectedRoute>
            } 
          />

          {/* AI Practice routes */}
          <Route 
            path="/ai-practice/:aiAttemptId" 
            element={
              <ProtectedRoute>
                <AIPracticePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-practice/:aiAttemptId/report" 
            element={
              <ProtectedRoute>
                <AIPracticeReportPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/attempts" 
            element={
              <ProtectedRoute>
                <AttemptsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminUpload />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/ai-practice-report/:attemptId"
            element={
              <ProtectedRoute>
                <AIPracticeReportPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
