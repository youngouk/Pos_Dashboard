import { useState, useCallback, useEffect } from 'react';

// API URL 설정
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 분석 결과 캐시
const analysisCache = {};

// 차트 유형별 분석 템플릿 정의
const CHART_ANALYSIS_TEMPLATES = {

export const useChartAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // 차트 데이터 간소화 함수
  const simplifyChartData = (chartType, data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('유효하지 않은 차트 데이터:', data);
      return [];
    }

    // 차트 타입별 간단한 데이터 변환 로직
    switch(chartType) {
      case 'dailySales':
        return data.map(item => {
          // 매출 필드 찾기 (매출_전체 또는 매출_ 으로 시작하는 필드)
          const salesKeys = Object.keys(item).filter(key => 
            key === '매출_전체' || (key.startsWith('매출_') && item[key] !== null && item[key] !== undefined)
          );
          
          const value = salesKeys.length > 0 
            ? item[salesKeys[0]] 
            : Object.values(item).find(v => typeof v === 'number' && v > 0);
          
          return {
            date: item.date,
            value: value
          };
        }).filter(item => item.value !== null && item.value !== undefined);
      
      case 'hourlySales':
        return data.map(item => ({
          hour: item.hour || item.hour_of_day,
          value: item.매출 || item.total_sales || 0
        }));
      
      case 'productSales':
      case 'productDistribution':
        return data.map(item => ({
          name: item.name || item.product_name || item.product,
          value: item.value || item.매출 || item.total_sales || 0
        }));
        
      default:
        console.warn('알 수 없는 차트 타입:', chartType);
        return data;
    }
  };

  // 캐시 키 생성 함수
  const getCacheKey = (chartType, data, context) => {
    const contextStr = JSON.stringify(context || {});
    return `${chartType}_${contextStr}_${data.length}`;
  };

  // 차트 분석 함수
  const analyzeChart = async (chartType, originalData, context = {}) => {
    setIsAnalyzing(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      const cacheKey = getCacheKey(chartType, originalData, context);
      
      // 캐시 확인
      if (analysisCache[cacheKey]) {
        console.log('캐시된 분석 결과 사용:', cacheKey);
        setAnalysis(analysisCache[cacheKey]);
        setIsAnalyzing(false);
        return analysisCache[cacheKey];
      }
      
      // 간소화된 데이터 준비
      const simplifiedData = simplifyChartData(chartType, originalData);
      
      if (simplifiedData.length === 0) {
        throw new Error('분석할 데이터가 없습니다');
      }
      
      console.log('백엔드 API 호출 준비 중...');
      
      // AI 분석 API 호출
      const response = await fetch(`${API_URL}/api/ai/analyze-chart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chart_type: chartType,
          chart_data: simplifiedData,
          context: context
        })
      });
      
      // 응답 처리
      if (!response.ok) {
        let errorMessage = '서버 오류가 발생했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
          console.error('백엔드 API 오류 응답:', errorData);
        } catch (jsonError) {
          // JSON 파싱 실패 시 HTTP 상태 코드와 텍스트 응답 사용
          console.error('백엔드 API 오류(JSON 파싱 실패):', response.status, response.statusText);
          
          try {
            // 텍스트 응답 시도
            const textResponse = await response.text();
            console.error('백엔드 API 오류 텍스트 응답:', textResponse);
            errorMessage = `서버 오류 (${response.status}): ${textResponse || response.statusText}`;
          } catch (textError) {
            errorMessage = `서버 오류 (${response.status}): ${response.statusText}`;
          }
        }
        throw new Error(`API 오류 응답: ${errorMessage}`);
      }
      
      const result = await response.json();
      console.log('API 응답 받음:', result);
      
      // 응답 처리
      const analysisText = result.analysis || '분석 결과를 생성할 수 없습니다.';
      
      // 응답 캐싱 및 상태 업데이트
      analysisCache[cacheKey] = analysisText;
      setAnalysis(analysisText);
      return analysisText;
      
    } catch (err) {
      console.error('차트 분석 실패:', err);
      
      // 상세 디버깅 정보 설정
      let errorDetails = {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'),
        timestamp: new Date().toISOString(),
        chartType: chartType,
        dataLength: originalData?.length || 0
      };
      
      setDebugInfo(errorDetails);
      setError(`분석 중 오류가 발생했습니다: ${err.message}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // 차트 타입을 한글 레이블로 변환
  const getChartTypeLabel = (chartType) => {
    switch(chartType) {
      case 'dailySales': return '일별 매출 추이';
      case 'hourlySales': return '시간대별 매출';
      case 'productSales': return '상품별 매출';
      case 'productDistribution': return '상품 판매 비율';
      default: return chartType;
    }
  };
  
  return { analyzeChart, isAnalyzing, analysis, error, debugInfo };
};