import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clearAuth, getUser, isAdmin } from '../utils/auth';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getUser();

    const handleLogout = () => {
        clearAuth();
        navigate('/login');
    };

    const isActiveRoute = (path) => {
        return location.pathname === path;
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/dashboard" className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-orange-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">AI</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">ExamGenius AI</h1>
                                {/* ✅ FIX: Updated tagline for Full Stack focus */}
                                <p className="text-xs text-gray-500">Full Stack Interview Prep</p>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <Link
                            to="/dashboard"
                            className={`text-sm font-medium transition-colors ${
                                isActiveRoute('/dashboard')
                                    ? 'text-primary-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🏠 Dashboard
                        </Link>
                        
                        <Link
                            to="/attempts"
                            className={`text-sm font-medium transition-colors ${
                                isActiveRoute('/attempts')
                                    ? 'text-primary-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            📊 My Attempts
                        </Link>

                        {isAdmin() && (
                            <Link
                                to="/admin"
                                className={`text-sm font-medium transition-colors ${
                                    isActiveRoute('/admin')
                                        ? 'text-primary-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                ⚙️ Admin Panel
                            </Link>
                        )}
                    </nav>

                    {/* User Menu */}
                    <div className="flex items-center space-x-4">
                        {user && (
                            <div className="flex items-center space-x-3">
                                <div className="hidden md:block text-right">
                                    <p className="text-sm font-medium text-gray-700">{user.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {isAdmin() ? '👑 Admin' : '👨‍💻 Developer'}
                                    </p>
                                </div>
                                
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                                    <span className="text-primary-600 font-semibold text-sm">
                                        {user.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden bg-gray-50 border-t border-gray-200">
                <div className="px-4 py-2 space-y-1">
                    <Link
                        to="/dashboard"
                        className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            isActiveRoute('/dashboard')
                                ? 'bg-primary-100 text-primary-600'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        🏠 Dashboard
                    </Link>
                    
                    <Link
                        to="/attempts"
                        className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            isActiveRoute('/attempts')
                                ? 'bg-primary-100 text-primary-600'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        📊 My Attempts
                    </Link>

                    {isAdmin() && (
                        <Link
                            to="/admin"
                            className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                isActiveRoute('/admin')
                                    ? 'bg-primary-100 text-primary-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            ⚙️ Admin Panel
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
