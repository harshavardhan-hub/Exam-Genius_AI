import React, { useState } from 'react';
import api from '../api/api';

const QuestionUploader = ({ onQuestionsUploaded, topics }) => {
  const [uploadMethod, setUploadMethod] = useState('json');
  const [jsonInput, setJsonInput] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const sampleJSON = `[
  {
    "topic": "Quantitative Aptitude",
    "question_text": "What is 15% of 200?",
    "options": [
      {"key": "A", "text": "25"},
      {"key": "B", "text": "30"},
      {"key": "C", "text": "35"},
      {"key": "D", "text": "40"}
    ],
    "correct_option": "B",
    "negative_mark": 0.25,
    "time_limit_seconds": 60
  }
]`;

  const sampleCSVHeaders = "topic,question_text,optionA,optionB,optionC,optionD,correct_option,negative_mark,time_limit_seconds";

  const handleJSONUpload = async () => {
    try {
      const questions = JSON.parse(jsonInput);
      if (!Array.isArray(questions)) {
        throw new Error('JSON must be an array of questions');
      }
      setPreviewData(questions);
      setShowPreview(true);
    } catch (error) {
      alert('Invalid JSON format: ' + error.message);
    }
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const questions = [];

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          
          const values = lines[i].split(',').map(v => v.trim());
          const question = {
            topic: values[0],
            question_text: values[1],
            options: [
              { key: 'A', text: values[2] },
              { key: 'B', text: values[3] },
              { key: 'C', text: values[4] },
              { key: 'D', text: values[5] }
            ],
            correct_option: values[6],
            negative_mark: parseFloat(values[7]) || 0.25,
            time_limit_seconds: parseInt(values[8]) || 60
          };
          questions.push(question);
        }

        setPreviewData(questions);
        setShowPreview(true);
      } catch (error) {
        alert('Error parsing CSV: ' + error.message);
      }
    };

    reader.readAsText(file);
  };

  const confirmUpload = async () => {
    if (previewData.length === 0) return;

    setUploading(true);
    try {
      const response = await api.post('/admin/questions/upload', previewData);
      alert(`Successfully uploaded ${response.data.questions.length} questions to ExamGenius AI!`);
      onQuestionsUploaded(response.data.questions);

      // Reset form
      setJsonInput('');
      setCsvFile(null);
      setPreviewData([]);
      setShowPreview(false);
      
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      alert('Upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-soft p-6 border border-gray-100">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Questions to ExamGenius AI</h3>
        <p className="text-gray-600">Add questions to your test bank using JSON or CSV format</p>
      </div>

      {/* Upload Method Selection */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setUploadMethod('json')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              uploadMethod === 'json'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            JSON Format
          </button>
          <button
            onClick={() => setUploadMethod('csv')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              uploadMethod === 'csv'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            CSV Format
          </button>
        </div>
      </div>

      {uploadMethod === 'json' ? (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JSON Questions Data
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              placeholder="Paste your JSON questions here..."
            />
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Sample JSON Format:</h4>
            <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
              {sampleJSON}
            </pre>
          </div>

          <button
            onClick={handleJSONUpload}
            disabled={!jsonInput.trim()}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 px-4 rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Preview JSON Questions
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File Upload
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">CSV Format Requirements:</h4>
            <p className="text-sm text-gray-600 mb-2">First row should contain headers:</p>
            <pre className="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
              {sampleCSVHeaders}
            </pre>
            <p className="text-xs text-gray-500 mt-2">Each subsequent row represents one question.</p>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Preview Questions ({previewData.length} questions)
              </h3>
            </div>

            <div className="p-6 overflow-y-auto max-h-96 custom-scrollbar">
              <div className="space-y-4">
                {previewData.slice(0, 5).map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary-600">
                        Question {index + 1}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {question.topic}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-3 font-medium">
                      {question.question_text}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {question.options.map((option, optIndex) => (
                        <div 
                          key={optIndex}
                          className={`p-2 rounded ${
                            option.key === question.correct_option
                              ? 'bg-success-50 text-success-700 border border-success-200'
                              : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          <span className="font-medium">{option.key}:</span> {option.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {previewData.length > 5 && (
                  <div className="text-center py-4 text-gray-500">
                    ... and {previewData.length - 5} more questions
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-lg hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 transition-all duration-200"
              >
                {uploading ? 'Uploading...' : `Upload ${previewData.length} Questions`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionUploader;
