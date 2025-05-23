import { useState } from 'react';

// 페이지 분석 결과 캐시
const pageAnalysisCache = {};

export const usePageAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const analyzePage = async (pageData, context = {}) => {
    setIsAnalyzing(true);
    setError(null);

    const cacheKey = JSON.stringify({ pageDataSize: JSON.stringify(pageData).length, context });
    if (pageAnalysisCache[cacheKey]) {
      setAnalysis(pageAnalysisCache[cacheKey]);
      setIsAnalyzing(false);
      return pageAnalysisCache[cacheKey];
    }

    try {
      const response = await fetch('/api/ai/analyze-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_data: pageData, context })
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || response.statusText);
      }
      const result = await response.json();
      const analysisText = result.analysis;
      pageAnalysisCache[cacheKey] = analysisText;
      setAnalysis(analysisText);
      return analysisText;
    } catch (err) {
      console.error('페이지 분석 실패:', err);
      setError(`페이지 분석 중 오류가 발생했습니다: ${err.message}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyzePage, isAnalyzing, analysis, error };
}; 