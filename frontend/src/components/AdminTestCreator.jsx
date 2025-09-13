import React, { useState, useEffect } from 'react';
import api from '../api/api';

const AdminTestCreator = ({ questions, topics, onTestCreated }) => {
    const [testData, setTestData] = useState({
        title: '',
        description: '',
        duration_minutes: 60
    });
    
    const [sections, setSections] = useState([]);
    const [selectedSections, setSelectedSections] = useState([]);
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [questionSections, setQuestionSections] = useState({});
    const [filteredQuestions, setFilteredQuestions] = useState(questions);
    const [filters, setFilters] = useState({ topic: '', search: '' });
    const [creating, setCreating] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [showNewSectionForm, setShowNewSectionForm] = useState(false);
    const [newSection, setNewSection] = useState({
        name: '',
        description: '',
        default_time_minutes: 20
    });

    useEffect(() => {
        fetchSections();
        applyFilters();
    }, [filters, questions]);

    const fetchSections = async () => {
        try {
            const response = await api.get('/admin/sections');
            setSections(response.data);
        } catch (error) {
            console.error('Failed to fetch sections:', error);
        }
    };

    const applyFilters = () => {
        let filtered = [...questions];
        
        if (filters.topic) {
            filtered = filtered.filter(q => q.topic_name === filters.topic);
        }
        
        if (filters.search) {
            filtered = filtered.filter(q => 
                q.question_text.toLowerCase().includes(filters.search.toLowerCase())
            );
        }
        
        setFilteredQuestions(filtered);
    };

    const handleInputChange = (e) => {
        setTestData({
            ...testData,
            [e.target.name]: e.target.value
        });
    };

    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value
        });
    };

    const handleCreateSection = async () => {
        if (!newSection.name.trim()) {
            alert('Please enter a section name');
            return;
        }

        try {
            const response = await api.post('/admin/sections', newSection);
            setSections([...sections, response.data.section]);
            setNewSection({ name: '', description: '', default_time_minutes: 20 });
            setShowNewSectionForm(false);
            alert('Section created successfully!');
        } catch (error) {
            alert('Failed to create section: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleSectionSelection = (section) => {
        const isSelected = selectedSections.find(s => s.id === section.id);
        
        if (isSelected) {
            setSelectedSections(selectedSections.filter(s => s.id !== section.id));
            // Remove questions assigned to this section
            const updatedQuestionSections = { ...questionSections };
            Object.keys(updatedQuestionSections).forEach(questionId => {
                if (updatedQuestionSections[questionId] === section.id) {
                    delete updatedQuestionSections[questionId];
                }
            });
            setQuestionSections(updatedQuestionSections);
        } else {
            setSelectedSections([...selectedSections, {
                ...section,
                time_minutes: section.default_time_minutes,
                sequence_order: selectedSections.length
            }]);
        }
    };

    const updateSectionTime = (sectionId, timeMinutes) => {
        setSelectedSections(selectedSections.map(section =>
            section.id === sectionId
                ? { ...section, time_minutes: parseInt(timeMinutes) || 0 }
                : section
        ));
    };

    const toggleQuestionSelection = (question) => {
        const isSelected = selectedQuestions.find(q => q.id === question.id);
        
        if (isSelected) {
            setSelectedQuestions(selectedQuestions.filter(q => q.id !== question.id));
            const updatedQuestionSections = { ...questionSections };
            delete updatedQuestionSections[question.id];
            setQuestionSections(updatedQuestionSections);
        } else {
            setSelectedQuestions([...selectedQuestions, question]);
        }
    };

    const assignQuestionToSection = (questionId, sectionId) => {
        setQuestionSections({
            ...questionSections,
            [questionId]: sectionId
        });
    };

    const selectAllFiltered = () => {
        const newSelections = filteredQuestions.filter(
            q => !selectedQuestions.find(selected => selected.id === q.id)
        );
        setSelectedQuestions([...selectedQuestions, ...newSelections]);
    };

    const clearSelection = () => {
        setSelectedQuestions([]);
        setQuestionSections({});
    };

    const handleCreateTest = async () => {
        if (!testData.title.trim()) {
            alert('Please enter a test title');
            return;
        }

        if (selectedQuestions.length === 0) {
            alert('Please select at least one question');
            return;
        }

        const totalDuration = selectedSections.reduce((sum, section) => sum + section.time_minutes, 0) || testData.duration_minutes;

        const sectionsData = selectedSections.map((section, index) => ({
            section_id: section.id,
            time_minutes: section.time_minutes,
            sequence_order: index
        }));

        const questionSectionsArray = selectedQuestions.map((question, index) => ({
            question_id: question.id,
            section_id: questionSections[question.id] || (selectedSections.length > 0 ? selectedSections[0].id : null),
            sequence_order: index
        }));

        setCreating(true);

        try {
            const response = await api.post('/admin/tests', {
                ...testData,
                duration_minutes: totalDuration,
                sections_data: sectionsData,
                question_sections: questionSectionsArray
            });

            alert(`ExamGenius AI test "${testData.title}" created successfully with ${selectedQuestions.length} questions across ${selectedSections.length} sections!`);
            
            onTestCreated(response.data);
            
            // Reset form
            setTestData({ title: '', description: '', duration_minutes: 60 });
            setSelectedSections([]);
            setSelectedQuestions([]);
            setQuestionSections({});
            setActiveTab('basic');
            
        } catch (error) {
            alert('Failed to create test: ' + (error.response?.data?.error || error.message));
        } finally {
            setCreating(false);
        }
    };

    const getQuestionsInSection = (sectionId) => {
        return selectedQuestions.filter(q => questionSections[q.id] === sectionId);
    };

    return (
        <div className="bg-white rounded-lg shadow-soft p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                🏗️ Build intelligent tests with AI-powered analytics
            </h2>

            {/* Tab Navigation */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                {['basic', 'sections', 'questions', 'review'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 px-1 font-medium text-sm capitalize ${
                            activeTab === tab
                                ? 'text-primary-600 border-b-2 border-primary-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab === 'basic' && '📝 '}
                        {tab === 'sections' && '📋 '}
                        {tab === 'questions' && '❓ '}
                        {tab === 'review' && '👀 '}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Test Title *
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={testData.title}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Enter test title (e.g., Full Stack Developer Assessment)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={testData.description}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Describe the test content and objectives"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duration (minutes)
                        </label>
                        <input
                            type="number"
                            name="duration_minutes"
                            value={testData.duration_minutes}
                            onChange={handleInputChange}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            This will be overridden if you configure sections with specific timing
                        </p>
                    </div>
                </div>
            )}

            {/* Sections Tab */}
            {activeTab === 'sections' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-800">Available Sections</h3>
                        <button
                            onClick={() => setShowNewSectionForm(true)}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            + Create New Section
                        </button>
                    </div>

                    {/* New Section Form */}
                    {showNewSectionForm && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-medium text-gray-800 mb-3">Create New Section</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    placeholder="Section name (e.g., Python Programming)"
                                    value={newSection.name}
                                    onChange={(e) => setNewSection({...newSection, name: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <input
                                    type="text"
                                    placeholder="Description"
                                    value={newSection.description}
                                    onChange={(e) => setNewSection({...newSection, description: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                <input
                                    type="number"
                                    placeholder="Default time (minutes)"
                                    value={newSection.default_time_minutes}
                                    onChange={(e) => setNewSection({...newSection, default_time_minutes: parseInt(e.target.value) || 20})}
                                    className="px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="flex space-x-2 mt-3">
                                <button
                                    onClick={handleCreateSection}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Create Section
                                </button>
                                <button
                                    onClick={() => setShowNewSectionForm(false)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sections Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sections.map((section) => {
                            const isSelected = selectedSections.find(s => s.id === section.id);
                            return (
                                <div
                                    key={section.id}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        isSelected 
                                            ? 'border-primary-500 bg-primary-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => handleSectionSelection(section)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-gray-800">{section.name}</h4>
                                        <div className={`w-4 h-4 rounded border-2 ${
                                            isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                                        }`}>
                                            {isSelected && (
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    {section.description && (
                                        <p className="text-sm text-gray-600 mb-2">{section.description}</p>
                                    )}
                                    <p className="text-sm text-gray-500">Default: {section.default_time_minutes} minutes</p>
                                    
                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Time for this test (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                value={isSelected.time_minutes}
                                                onChange={(e) => updateSectionTime(section.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                min="1"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Selected Sections Summary */}
                    {selectedSections.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-800 mb-2">Selected Sections ({selectedSections.length})</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {selectedSections.map((section) => (
                                    <div key={section.id} className="flex justify-between items-center text-sm">
                                        <span className="text-blue-700">{section.name}</span>
                                        <span className="text-blue-600 font-medium">{section.time_minutes} min</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-blue-600 text-sm mt-2">
                                Total duration: {selectedSections.reduce((sum, s) => sum + s.time_minutes, 0)} minutes
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Questions Tab */}
            {activeTab === 'questions' && (
                <div className="space-y-6">
                    {/* Question Filters */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Topic</label>
                                <select
                                    name="topic"
                                    value={filters.topic}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">All Topics</option>
                                    {topics.map((topic) => (
                                        <option key={topic.id} value={topic.name}>{topic.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search Questions</label>
                                <input
                                    type="text"
                                    name="search"
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                    placeholder="Search question text..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <div className="flex items-end space-x-2">
                                <button
                                    onClick={selectAllFiltered}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Select All Filtered
                                </button>
                                <button
                                    onClick={clearSelection}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Questions List */}
                    {filteredQuestions.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {filteredQuestions.map((question) => {
                                const isSelected = selectedQuestions.find(q => q.id === question.id);
                                const assignedSection = questionSections[question.id];
                                
                                return (
                                    <div
                                        key={question.id}
                                        className={`p-4 border-2 rounded-lg transition-all ${
                                            isSelected 
                                                ? 'border-primary-500 bg-primary-50' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center mb-2">
                                                    <button
                                                        onClick={() => toggleQuestionSelection(question)}
                                                        className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                                                            isSelected 
                                                                ? 'bg-primary-600 border-primary-600' 
                                                                : 'border-gray-300 hover:border-primary-400'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                                                        {question.topic_name}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        -{question.negative_mark} marks for wrong answer
                                                    </span>
                                                </div>
                                                
                                                <p className="text-gray-800 mb-2">
                                                    {question.question_text.length > 120 
                                                        ? question.question_text.substring(0, 120) + '...' 
                                                        : question.question_text
                                                    }
                                                </p>
                                                
                                                {/* Section Assignment */}
                                                {isSelected && selectedSections.length > 0 && (
                                                    <div className="mt-2">
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Assign to Section:
                                                        </label>
                                                        <select
                                                            value={assignedSection || ''}
                                                            onChange={(e) => assignQuestionToSection(question.id, e.target.value)}
                                                            className="w-48 px-2 py-1 border border-gray-300 rounded text-sm"
                                                        >
                                                            <option value="">No Section</option>
                                                            {selectedSections.map((section) => (
                                                                <option key={section.id} value={section.id}>
                                                                    {section.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <div className="text-4xl mb-4">🔍</div>
                            <p>No questions found matching your criteria.</p>
                            <p className="text-sm mt-2">Try adjusting your search filters or add more questions to the system.</p>
                        </div>
                    )}

                    {/* Selection Summary */}
                    {selectedQuestions.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-800 mb-2">
                                Selected Questions ({selectedQuestions.length})
                            </h4>
                            
                            {/* Section-wise breakdown */}
                            {selectedSections.length > 0 && (
                                <div className="space-y-2">
                                    {selectedSections.map((section) => {
                                        const questionsInSection = getQuestionsInSection(section.id);
                                        return (
                                            <div key={section.id} className="text-sm">
                                                <span className="text-green-700 font-medium">{section.name}:</span>
                                                <span className="text-green-600 ml-2">
                                                    {questionsInSection.length} questions
                                                </span>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Unassigned questions */}
                                    {selectedQuestions.some(q => !questionSections[q.id]) && (
                                        <div className="text-sm">
                                            <span className="text-green-700 font-medium">Unassigned:</span>
                                            <span className="text-green-600 ml-2">
                                                {selectedQuestions.filter(q => !questionSections[q.id]).length} questions
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Review Tab */}
            {activeTab === 'review' && (
                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Summary</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Basic Information</h4>
                                <div className="space-y-1 text-sm">
                                    <div><strong>Title:</strong> {testData.title || 'Not set'}</div>
                                    <div><strong>Description:</strong> {testData.description || 'None'}</div>
                                    <div><strong>Duration:</strong> {
                                        selectedSections.length > 0 
                                            ? `${selectedSections.reduce((sum, s) => sum + s.time_minutes, 0)} minutes (from sections)`
                                            : `${testData.duration_minutes} minutes`
                                    }</div>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Structure</h4>
                                <div className="space-y-1 text-sm">
                                    <div><strong>Sections:</strong> {selectedSections.length}</div>
                                    <div><strong>Questions:</strong> {selectedQuestions.length}</div>
                                    <div><strong>Topics:</strong> {
                                        new Set(selectedQuestions.map(q => q.topic_name)).size
                                    }</div>
                                </div>
                            </div>
                        </div>

                        {/* Sections Breakdown */}
                        {selectedSections.length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-medium text-gray-700 mb-2">Sections Breakdown</h4>
                                <div className="space-y-2">
                                    {selectedSections.map((section) => {
                                        const questionsInSection = getQuestionsInSection(section.id);
                                        return (
                                            <div key={section.id} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                                                <span className="font-medium">{section.name}</span>
                                                <span>{questionsInSection.length} questions, {section.time_minutes} minutes</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Create Test Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleCreateTest}
                            disabled={creating || !testData.title.trim() || selectedQuestions.length === 0}
                            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
                                creating || !testData.title.trim() || selectedQuestions.length === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                            }`}
                        >
                            {creating ? 'Creating Test...' : 'Create ExamGenius AI Test'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTestCreator;
