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
        <div className="w-12 h-12 rounded-lg flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor: '#FF8C42'}} />
                        <stop offset="100%" style={{stopColor: '#FF6B1A'}} />
                    </linearGradient>
                </defs>
                <path d="M32 8 L48 14 Q50 15 50 18 L50 32 C50 38 42 44 32 48 C22 44 14 38 14 32 L14 18 Q14 15 16 14 L32 8 Z" fill="url(#orangeGrad)" stroke="#E55A00" strokeWidth="2"/>
                <rect x="24" y="24" width="16" height="16" rx="2" fill="#FFF4E6" stroke="#FF6B1A" strokeWidth="1"/>
                <circle cx="28" cy="28" r="1.5" fill="#FF6B1A"/>
                <circle cx="36" cy="28" r="1.5" fill="#FF6B1A"/>
                <circle cx="28" cy="36" r="1.5" fill="#FF6B1A"/>
                <circle cx="36" cy="36" r="1.5" fill="#FF6B1A"/>
                <line x1="20" y1="32" x2="24" y2="32" stroke="#FF6B1A" strokeWidth="1.5"/>
                <line x1="40" y1="32" x2="44" y2="32" stroke="#FF6B1A" strokeWidth="1.5"/>
                <line x1="32" y1="20" x2="32" y2="24" stroke="#FF6B1A" strokeWidth="1.5"/>
                <line x1="32" y1="40" x2="32" y2="44" stroke="#FF6B1A" strokeWidth="1.5"/>
            </svg>
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
