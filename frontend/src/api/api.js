import axios from 'axios';

/**
 * ExamGenius AI - API Configuration
 * Centralized axios instance for all API communications
 */

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // In production (Render), use the backend URL from env var
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In development, use local backend
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }

  // Production fallback - adjust this to your Render backend URL
  return 'https://your-examgenius-ai-backend.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log('🔗 ExamGenius AI API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for Render cold starts
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (import.meta.env.DEV) {
      console.log('🚀 ExamGenius AI API Request:', config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error) => {
    console.error('❌ ExamGenius AI Request Error:', error);
    return Promise.reject(error);
  }
);

// Handle auth errors and response logging
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log('✅ ExamGenius AI Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
    }

    return response;
  },
  (error) => {
    console.error('❌ ExamGenius AI API Error:', error.response?.status, error.response?.data || error.message);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('🔐 Authentication required - redirecting to ExamGenius AI login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Handle network errors (common with Render cold starts)
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
      console.log('🌐 Network error - this might be a cold start, retrying...');
    }

    return Promise.reject(error);
  }
);

export default api;
