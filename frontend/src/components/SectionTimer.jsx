import React, { useState, useEffect, useRef } from 'react';

const SectionTimer = ({ 
  sections = [], 
  currentSectionIndex = 0, 
  onSectionTimeUp, 
  onTotalTimeUp, 
  isActive = true, 
  className = "" 
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [sectionTimers, setSectionTimers] = useState([]);
  const intervalRef = useRef(null);

  // Initialize timers when sections change
  useEffect(() => {
    if (sections && sections.length > 0) {
      const timers = sections.map(section => ({
        id: section.id,
        name: section.name,
        totalMinutes: section.time_minutes,
        timeLeftSeconds: section.time_minutes * 60,
        isActive: false,
        isCompleted: false
      }));

      setSectionTimers(timers);
      setCurrentSection(currentSectionIndex);
      setTimeLeft(timers[currentSectionIndex]?.timeLeftSeconds || 0);

      // Calculate total time left
      const totalSeconds = timers.reduce((sum, timer) => sum + timer.timeLeftSeconds, 0);
      setTotalTimeLeft(totalSeconds);
    }
  }, [sections, currentSectionIndex]);

  // Update current section
  useEffect(() => {
    if (sectionTimers.length > 0 && currentSectionIndex !== currentSection) {
      setCurrentSection(currentSectionIndex);
      setTimeLeft(sectionTimers[currentSectionIndex]?.timeLeftSeconds || 0);
    }
  }, [currentSectionIndex, sectionTimers]);

  // Timer logic
  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        
        // Update total time left
        setTotalTimeLeft(totalPrev => totalPrev - 1);
        
        // Update section timers
        setSectionTimers(timers => timers.map((timer, index) =>
          index === currentSection ? { ...timer, timeLeftSeconds: newTime } : timer
        ));

        if (newTime <= 0) {
          // Section time is up
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          
          // Mark current section as completed
          setSectionTimers(timers => timers.map((timer, index) =>
            index === currentSection ? { ...timer, isCompleted: true, timeLeftSeconds: 0 } : timer
          ));

          setTimeout(() => {
            onSectionTimeUp && onSectionTimeUp(currentSection);
          }, 100);
        }

        return Math.max(newTime, 0);
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft, currentSection, onSectionTimeUp]);

  // Check for total time up
  useEffect(() => {
    if (totalTimeLeft <= 0 && sectionTimers.length > 0) {
      setTimeout(() => {
        onTotalTimeUp && onTotalTimeUp();
      }, 100);
    }
  }, [totalTimeLeft, onTotalTimeUp, sectionTimers.length]);

  const formatTime = (seconds) => {
    if (seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeWithHours = (seconds) => {
    if (seconds < 0) return "00:00:00";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentSectionInfo = () => {
    if (sectionTimers.length === 0 || currentSection >= sectionTimers.length) {
      return null;
    }
    return sectionTimers[currentSection];
  };

  const getTimerColorClass = (timeInSeconds) => {
    if (timeInSeconds <= 30) return "text-danger-600 bg-danger-50 border-danger-200";
    if (timeInSeconds <= 120) return "text-warning-600 bg-warning-50 border-warning-200";
    return "text-success-600 bg-success-50 border-success-200";
  };

  const getTotalTimerColorClass = (timeInSeconds) => {
    const totalOriginalTime = sectionTimers.reduce((sum, timer) => sum + (timer.totalMinutes * 60), 0);
    const percentageLeft = (timeInSeconds / totalOriginalTime) * 100;
    
    if (percentageLeft <= 10) return "text-danger-600 bg-danger-50 border-danger-200";
    if (percentageLeft <= 25) return "text-warning-600 bg-warning-50 border-warning-200";
    return "text-primary-600 bg-primary-50 border-primary-200";
  };

  const sectionInfo = getCurrentSectionInfo();

  if (!sectionInfo) {
    return (
      <div className={`bg-white rounded-xl shadow-soft p-4 border border-gray-200 ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No section information available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-soft border border-gray-100 ${className}`}>
      {/* Total Time Display */}
      <div className={`p-4 rounded-t-xl border-2 ${getTotalTimerColorClass(totalTimeLeft)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Total Time Remaining</h3>
            <div className="text-2xl font-bold font-mono">
              {formatTimeWithHours(totalTimeLeft)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75">Progress</div>
            <div className="text-lg font-semibold">
              {currentSection + 1}/{sectionTimers.length} sections
            </div>
          </div>
        </div>
      </div>

      {/* Current Section Display */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">Current Section</h4>
          <span className="text-sm text-gray-500">
            ({sectionInfo.totalMinutes} minutes allocated)
          </span>
        </div>
        
        <div className={`p-3 rounded-lg border-2 ${getTimerColorClass(timeLeft)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{sectionInfo.name}</div>
              <div className="text-2xl font-bold font-mono">
                {formatTime(timeLeft)}
              </div>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="stroke-current opacity-25"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="stroke-current"
                  strokeWidth="3"
                  strokeDasharray={`${(timeLeft / (sectionInfo.totalMinutes * 60)) * 100}, 100`}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Section Overview */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Section Overview</h4>
        <div className="space-y-2">
          {sectionTimers.map((section, index) => (
            <div 
              key={section.id} 
              className={`flex items-center justify-between p-2 rounded-lg border ${
                index === currentSection 
                  ? 'border-primary-200 bg-primary-50' 
                  : section.isCompleted 
                    ? 'border-success-200 bg-success-50' 
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === currentSection 
                    ? 'bg-primary-500 text-white' 
                    : section.isCompleted 
                      ? 'bg-success-500 text-white' 
                      : 'bg-gray-300 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {section.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono">
                  {formatTime(section.timeLeftSeconds)}
                </div>
                <div className="text-xs text-gray-500">
                  /{section.totalMinutes}m
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionTimer;
