/**
 * ExamGenius AI - Authentication Utilities
 * Centralized authentication state management
 */

export const getToken = () => localStorage.getItem('token');

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  console.log('✅ ExamGenius AI user authenticated:', user.name);
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('🔐 ExamGenius AI user logged out');
};

export const isAuthenticated = () => !!getToken();

export const isAdmin = () => getUser()?.is_admin || false;
