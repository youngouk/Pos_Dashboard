import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChartAnalysis } from '../../hooks/useChartAnalysis';

const ChartAnalysisWidget = ({ chartType, chartData, chartTitle, chartContext = {} }) => {
  const { analyzeChart, isAnalyzing, analysis, error, debugInfo } = useChartAnalysis();
  const [isAnalysisVisible, setIsAnalysisVisible] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  
  // 로컬스토리지에서 사용자 프롬프트 로드
  useEffect(() => {
    const stored = localStorage.getItem(`chartPrompt_${chartType}`);
    if (stored) {
      setUserPrompt(stored);
      setEditedPrompt(stored);
    }
  }, [chartType]);
  
  const handleAnalysisRequest = async () => {
    if (!isAnalysisVisible) {
      setIsAnalysisVisible(true);
    }
    
    if (!analysis && !isAnalyzing) {
      // 차트 타이틀 및 사용자 프롬프트를 컨텍스트에 추가
      const contextWithTitle = {
        ...chartContext,
        chartTitle: chartTitle || getDefaultChartTitle(chartType),
        ...(userPrompt ? { userPrompt } : {})
      };
      
      await analyzeChart(chartType, chartData, contextWithTitle);
    }
  };
  
  // 차트 타입에 따른 기본 제목 설정
  const getDefaultChartTitle = (type) => {
    switch(type) {
      case 'dailySales': return '일별 매출 추이';
      case 'hourlySales': return '시간대별 매출';
      case 'productSales': return '상품별 매출';
      case 'productDistribution': return '상품 판매 비율';
      default: return '차트 데이터';
    }
  };
  
  // 재분석 요청 처리
  const handleReanalyze = async () => {
    // 차트 타이틀 및 사용자 프롬프트를 컨텍스트에 추가
    const contextWithTitle = {
      ...chartContext,
      chartTitle: chartTitle || getDefaultChartTitle(chartType),
      ...(userPrompt ? { userPrompt } : {})
    };
    
    await analyzeChart(chartType, chartData, contextWithTitle);
  };
  
  return (
    <div className="chart-analysis-widget mt-3">
      {!isAnalysisVisible ? (
        <>
        <div className="flex items-center">
          <button 
            onClick={handleAnalysisRequest}
            className="flex items-center justify-center w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors duration-200"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-2" 
              fill="none"
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI 인사이트 요청하기</span>
          </button>
          {/* 프롬프트 설정 아이콘 */}
          <button
            onClick={() => { setEditedPrompt(userPrompt); setIsEditingPrompt(true); }}
            className="ml-2 p-2 text-gray-500 hover:text-gray-700"
            title="프롬프트 설정"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1.724 1.724 0 002.562.944c.831-.45 1.86.272 1.66 1.24-.2.969.588 1.77 1.56 1.56.968-.2 1.69.829 1.24 1.66a1.724 1.724 0 00.944 2.562c.921.3.921 1.603 0 1.902a1.724 1.724 0 00-.944 2.562c.45.831-.272 1.86-1.24 1.66-.969-.2-1.77.588-1.56 1.56.2.968-.829 1.69-1.66 1.24a1.724 1.724 0 00-2.562.944c-.3.921-1.603.921-1.902 0a1.724 1.724 0 00-2.562-.944c-.831.45-1.86-.272-1.66-1.24.2-.969-.588-1.77-1.56-1.56-.968.2-1.69-.829-1.24-1.66a1.724 1.724 0 00-.944-2.562c-.921-.3-.921-1.603 0-1.902a1.724 1.724 0 00.944-2.562c-.45-.831.272-1.86 1.24-1.66.969.2 1.77-.588 1.56-1.56-.2-.968.829-1.69 1.66-1.24a1.724 1.724 0 002.562-.944z" />
            </svg>
          </button>
        </div>
        {/* 사용자 프롬프트 편집 영역 */}
        {isEditingPrompt && (
          <div className="mt-2">
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={4}
              value={editedPrompt}
              onChange={e => setEditedPrompt(e.target.value)}
              placeholder="이 차트에 대한 맞춤형 프롬프트를 입력하세요"
            />
            <div className="flex justify-end mt-1 space-x-2">
              <button
                onClick={() => {
                  setUserPrompt(editedPrompt);
                  localStorage.setItem(`chartPrompt_${chartType}`, editedPrompt);
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
        </>
      ) : (
        <div className="bg-blue-50 border border-blue-100 rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-blue-100">
            <h4 className="text-sm font-medium text-blue-800 flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {chartTitle || '차트'} 인사이트
            </h4>
            <button 
              onClick={() => setIsAnalysisVisible(false)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              접기
            </button>
          </div>
          
          <div className="p-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-4">
                {/* 애니메이션 스피너 */}
                <div className="loader-brain">
                  <div className="brain-icon pulse"></div>
                </div>
                
                {/* 로딩 메시지 애니메이션 */}
                <div className="text-sm text-gray-600 flex items-center mt-2">
                  <span>데이터 심층 분석 중</span>
                  <span className="dot-animation ml-1">.</span>
                  <span className="dot-animation" style={{animationDelay: '0.2s'}}>.</span>
                  <span className="dot-animation" style={{animationDelay: '0.4s'}}>.</span>
                </div>
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">오류 발생:</p>
                    <p>{error}</p>
                  </div>
                  <button 
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    className="ml-2 text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    {showDebugInfo ? '디버그 정보 숨기기' : '디버그 정보 보기'}
                  </button>
                </div>
                
                {showDebugInfo && debugInfo && (
                  <div className="mt-2 p-2 bg-gray-100 rounded-md text-xs font-mono text-gray-800 overflow-auto max-h-48">
                    <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                  </div>
                )}
                
                <button 
                  onClick={handleReanalyze}
                  className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  재시도
                </button>
              </div>
            ) : analysis ? (
              <div>
                {/* 마크다운으로 응답 렌더링 */}
                <div className="text-sm text-gray-700 leading-relaxed markdown-content">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
                
                {/* 재분석 버튼 추가 */}
                <div className="mt-3 flex justify-end">
                  <button 
                    onClick={handleReanalyze}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm flex items-center"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 mr-1" 
                      fill="none"
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    다시 분석
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-2">
                분석을 준비 중입니다...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartAnalysisWidget;