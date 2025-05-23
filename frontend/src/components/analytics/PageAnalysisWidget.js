import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { usePageAnalysis } from '../../hooks/usePageAnalysis';

const PageAnalysisWidget = ({ pageData, pageContext = {} }) => {
  const { analyzePage, isAnalyzing, analysis, error } = usePageAnalysis();
  const [isVisible, setIsVisible] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  // Load stored prompt
  useEffect(() => {
    const stored = localStorage.getItem('pageAnalysisPrompt');
    if (stored) {
      setUserPrompt(stored);
      setEditedPrompt(stored);
    }
  }, []);

  const handleRequest = async () => {
    if (!isVisible) setIsVisible(true);
    if (!analysis && !isAnalyzing) {
      const context = { ...pageContext, ...(userPrompt ? { userPrompt } : {}) };
      await analyzePage(pageData, context);
    }
  };

  return (
    <div className="page-analysis-widget my-6 p-4 bg-gray-50 rounded">
      {!isVisible ? (
        <div className="flex items-center">
          <button
            onClick={handleRequest}
            className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >전체 페이지 인사이트 요청하기</button>
          <button
            onClick={() => { setEditedPrompt(userPrompt); setIsEditingPrompt(true); }}
            className="ml-2 p-2 text-gray-500 hover:text-gray-700"
            title="프롬프트 설정"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1.724 1.724 0 002.562.944c.831-.45 1.86.272 1.66 1.24-.2.969.588 1.77 1.56 1.56.968-.2 1.69.829 1.24 1.66a1.724 1.724 0 00.944 2.562c.921.3.921 1.603 0 1.902a1.724 1.724 0 00-.944 2.562c.45.831-.272 1.86-1.24 1.66-.969-.2-1.77.588-1.56 1.56.2.968-.829 1.69-1.66 1.24a1.724 1.724 0 00-2.562.944c-.3.921-1.603.921-1.902 0a1.724 1.724 0 00-2.562-.944c-.831.45-1.86-.272-1.66-1.24.2-.969-.588-1.77-1.56-1.56-.968.2-1.69-.829-1.24-1.66a1.724 1.724 0 00-.944-2.562c-.921-.3-.921-1.603 0-1.902a1.724 1.724 0 00.944-2.562c-.45-.831.272-1.86 1.24-1.66.969.2 1.77-.588 1.56-1.56-.2-.968.829-1.69 1.66-1.24a1.724 1.724 0 002.562-.944c.3.921-1.603.921-1.902 0a1.724 1.724 0 00-2.562-.944c-.831.45-1.86-.272-1.66-1.24.2-.969-.588-1.77-1.56-1.56-.968.2-1.69-.829-1.24-1.66a1.724 1.724 0 00-.944-2.562c-.921-.3-.921-1.603 0-1.902a1.724 1.724 0 00.944-2.562c-.45-.831.272-1.86 1.24-1.66.969.2 1.77-.588 1.56-1.56-.2-.968.829-1.69 1.66-1.24a1.724 1.724 0 002.562-.944z" />
            </svg>
          </button>
        </div>
      ) : null}

      {isEditingPrompt && (
        <div className="mt-2">
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={4}
            value={editedPrompt}
            onChange={e => setEditedPrompt(e.target.value)}
            placeholder="전체 페이지 분석 프롬프트를 입력하세요"
          />
          <div className="flex justify-end mt-1 space-x-2">
            <button
              onClick={() => {
                setUserPrompt(editedPrompt);
                localStorage.setItem('pageAnalysisPrompt', editedPrompt);
                setIsEditingPrompt(false);
              }}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
            >저장</button>
            <button
              onClick={() => setIsEditingPrompt(false)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
            >취소</button>
          </div>
        </div>
      )}

      {isVisible && (
        <div className="mt-4 bg-white rounded-lg shadow-lg">
          {isAnalyzing ? (
            <div className="p-6 text-center text-gray-600">
              페이지 분석 중...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">
              {error}
            </div>
          ) : analysis ? (
            <div className="overflow-y-auto max-h-[60vh] p-6">
              <ReactMarkdown className="prose prose-lg max-w-none leading-relaxed space-y-6 text-gray-800">
                {analysis}
              </ReactMarkdown>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PageAnalysisWidget; 