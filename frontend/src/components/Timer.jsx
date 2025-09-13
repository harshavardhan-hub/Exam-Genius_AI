import React, { useState, useEffect, useRef } from 'react';

const Timer = ({ timeLimit, onTimeUp, isActive = true, className = "" }) => {
    const [timeLeft, setTimeLeft] = useState(timeLimit);
    const intervalRef = useRef(null);

    useEffect(() => {
        setTimeLeft(timeLimit);
    }, [timeLimit]);

    useEffect(() => {
        // ✅ FIX: Clear any existing interval first to prevent double timers
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (!isActive || timeLeft <= 0) {
            return;
        }

        // ✅ FIX: Single timer that decrements by exactly 1 second
        intervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                const newTime = prev - 1;
                
                if (newTime <= 0) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    // Call onTimeUp after state update
                    setTimeout(() => {
                        onTimeUp && onTimeUp();
                    }, 0);
                    return 0;
                }
                
                return newTime;
            });
        }, 1000); // Exactly 1 second intervals

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActive, onTimeUp, timeLeft]);

    const formatTime = (seconds) => {
        if (seconds <= 0) return "00:00";
        
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        if (timeLeft <= 30) return 'text-red-600 bg-red-50 border-red-200';
        if (timeLeft <= 120) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-green-600 bg-green-50 border-green-200';
    };

    return (
        <div className={`inline-flex items-center px-4 py-2 rounded-lg border font-mono text-lg font-semibold ${getTimerColor()} ${className}`}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(timeLeft)}
        </div>
    );
};

export default Timer;
