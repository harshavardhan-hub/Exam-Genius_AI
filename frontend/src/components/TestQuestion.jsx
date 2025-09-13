import React, { useState, useEffect } from 'react';

const TestQuestion = ({ 
    question, 
    questionNumber, 
    totalQuestions, 
    onAnswer, 
    onNext, 
    selectedAnswer = null, // ✅ FIX: Default to null instead of empty string
    showResult = false 
}) => {
    const [selected, setSelected] = useState(null); // ✅ FIX: Initialize with null
    const [timeUsed, setTimeUsed] = useState(0);
    const timerRef = React.useRef(null);

    // ✅ FIX: Clear selection when question changes or selectedAnswer changes
    useEffect(() => {
        console.log('🔄 TestQuestion: Question changed or selectedAnswer updated:', {
            questionId: question?.id,
            selectedAnswer,
            questionNumber
        });
        
        // Reset selection state when moving to a new question
        setSelected(selectedAnswer);
        setTimeUsed(0); // Reset timer for new question
        
        // Start timing for this question
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setTimeUsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [question?.id, selectedAnswer, questionNumber]); // ✅ FIX: Dependencies ensure reset on question change

    const handleOptionSelect = (option) => {
        if (showResult) return;
        
        console.log('📝 TestQuestion: Option selected:', option, 'for question:', question?.id);
        setSelected(option);
    };

    const handleSubmit = () => {
        if (!selected) {
            alert('Please select an answer');
            return;
        }

        console.log('✅ TestQuestion: Submitting answer:', selected, 'with time:', timeUsed);
        
        // Clear timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        onAnswer(selected, timeUsed);
    };

    const options = question.options || [];
    
    // Convert options to consistent format
    const formattedOptions = Array.isArray(options) 
        ? options.reduce((acc, option, index) => {
            const key = String.fromCharCode(65 + index); // A, B, C, D
            acc[key] = typeof option === 'string' ? option : option.text || option.value || `Option ${key}`;
            return acc;
        }, {})
        : options;

    return (
        <div className="bg-white rounded-lg shadow-soft p-6">
            {/* Question Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-700">
                    Question {questionNumber} of {totalQuestions}
                </h2>
                <div className="text-sm text-gray-500">
                    Time: {timeUsed}s
                </div>
            </div>

            {/* Question Text */}
            <div className="mb-6">
                <p className="text-gray-800 text-lg leading-relaxed">
                    {question.question_text}
                </p>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
                {Object.entries(formattedOptions).map(([key, value]) => (
                    <button
                        key={key}
                        onClick={() => handleOptionSelect(key)}
                        disabled={showResult}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                            selected === key
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        } ${showResult && selected === key && question.correct_option === key
                            ? 'bg-green-50 border-green-500 text-green-700'
                            : showResult && selected === key && question.correct_option !== key
                            ? 'bg-red-50 border-red-500 text-red-700'
                            : ''
                        }`}
                    >
                        <span className="font-semibold mr-3">{key}.</span>
                        {value}
                    </button>
                ))}
            </div>

            {/* Submit Button */}
            {!showResult && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!selected}
                        className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                            selected
                                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        Submit Answer
                    </button>
                </div>
            )}

            {/* Show correct answer if in result mode */}
            {showResult && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700">
                        <strong>Correct Answer: </strong>
                        {question.correct_option}. {formattedOptions[question.correct_option]}
                    </p>
                </div>
            )}
        </div>
    );
};

export default TestQuestion;
