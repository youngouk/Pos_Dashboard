import React, { useState } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { kpiService, salesService } from '../services/api';

const ApiTestPage = () => {
  const { filters, fetchApiData } = useDashboard();
  const [apiResponses, setApiResponses] = useState({});
  const [loading, setLoading] = useState({});
  const [selectedApi, setSelectedApi] = useState('kpi_summary');

  // 대시보드 페이지에서 사용하는 API 목록
  const dashboardApis = [
    {
      id: 'kpi_summary',
      name: 'KPI 요약 정보',
      description: '주요 지표(총 매출, 총 고객 수, 객단가, 할인율) 요약 데이터',
      service: kpiService,
      method: 'getSummary',
      params: () => ({
        start_date: filters.dateRange.startDate,
        end_date: filters.dateRange.endDate,
        ...(filters.selectedStore ? { store_name: filters.selectedStore } : {})
      }),
      cacheKey: () => `kpi_summary_${filters.dateRange.startDate}_${filters.dateRange.endDate}_${filters.selectedStore || 'all'}`
    },
    {
      id: 'daily_sales',
      name: '일별 매출 추이',
      description: '일자별 매출액, 고객수 데이터',
      service: salesService,
      method: 'getDailySales',
      params: () => ({
        start_date: filters.dateRange.startDate,
        end_date: filters.dateRange.endDate,
        ...(filters.selectedStore ? { store_name: filters.selectedStore } : {})
      }),
      cacheKey: () => `daily_sales_${filters.dateRange.startDate}_${filters.dateRange.endDate}_${filters.selectedStore || 'all'}`
    },
    {
      id: 'product_sales',
      name: '제품별 매출',
      description: '상위 제품의 매출액 비중 데이터',
      service: salesService,
      method: 'getProductSales',
      params: () => ({
        start_date: filters.dateRange.startDate,
        end_date: filters.dateRange.endDate,
        ...(filters.selectedStore ? { store_name: filters.selectedStore } : {}),
        limit: 10
      }),
      cacheKey: () => `product_sales_${filters.dateRange.startDate}_${filters.dateRange.endDate}_${filters.selectedStore || 'all'}_10`
    },
    {
      id: 'hourly_sales',
      name: '시간대별 매출',
      description: '시간대별 매출액, 고객수 데이터',
      service: salesService,
      method: 'getHourlySales',
      params: () => ({
        start_date: filters.dateRange.startDate,
        end_date: filters.dateRange.endDate,
        ...(filters.selectedStore ? { store_name: filters.selectedStore } : {})
      }),
      cacheKey: () => `hourly_sales_${filters.dateRange.startDate}_${filters.dateRange.endDate}_${filters.selectedStore || 'all'}`
    }
  ];

  // API 호출 함수
  const testApi = async (api) => {
    try {
      setLoading(prev => ({ ...prev, [api.id]: true }));
      
      console.log(`API ${api.id} 테스트 시작:`, {
        서비스: api.service.name,
        메서드: api.method,
        파라미터: api.params()
      });
      
      const response = await fetchApiData(
        api.service,
        api.method,
        api.params(),
        api.cacheKey()
      );
      
      console.log(`API ${api.id} 테스트 결과:`, response);
      
      setApiResponses(prev => ({
        ...prev,
        [api.id]: response
      }));
    } catch (error) {
      console.error(`API ${api.id} 테스트 오류:`, error);
      setApiResponses(prev => ({
        ...prev,
        [api.id]: { error: error.message || '알 수 없는 오류가 발생했습니다.' }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [api.id]: false }));
    }
  };

  // API 응답 렌더링 함수
  const renderApiResponse = (apiId) => {
    const response = apiResponses[apiId];
    
    if (!response) {
      return (
        <div className="p-6 text-center text-gray-500">
          API 응답이 없습니다. 위의 테스트 버튼을 클릭하여 API를 호출해주세요.
        </div>
      );
    }
    
    if (response.error) {
      return (
        <div className="p-6 bg-red-50 text-red-600 rounded-lg">
          <h4 className="font-medium mb-2">오류 발생</h4>
          <p>{response.error}</p>
        </div>
      );
    }
    
    return (
      <div className="p-6 overflow-auto max-h-[500px]">
        <pre className="text-sm whitespace-pre-wrap break-words bg-gray-100 p-4 rounded-lg">
          {JSON.stringify(response, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">API 테스트 페이지</h1>
      
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-2">현재 필터 상태</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p><span className="font-medium">시작일:</span> {filters.dateRange.startDate}</p>
          <p><span className="font-medium">종료일:</span> {filters.dateRange.endDate}</p>
          <p><span className="font-medium">선택 매장:</span> {filters.selectedStore || '전체 매장'}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        {dashboardApis.map(api => (
          <button
            key={api.id}
            onClick={() => setSelectedApi(api.id)}
            className={`p-4 rounded-lg transition-colors text-left ${
              selectedApi === api.id
                ? 'bg-panze-dark text-white'
                : 'bg-white hover:bg-gray-100'
            }`}
          >
            <h3 className="font-medium">{api.name}</h3>
            <p className="text-sm mt-1 opacity-80">{api.description}</p>
          </button>
        ))}
      </div>
      
      {dashboardApis.map(api => {
        if (selectedApi !== api.id) return null;
        
        return (
          <div key={api.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-lg">{api.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{api.description}</p>
                </div>
                <button
                  onClick={() => testApi(api)}
                  disabled={loading[api.id]}
                  className="px-4 py-2 bg-panze-dark text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                >
                  {loading[api.id] ? '테스트 중...' : 'API 테스트'}
                </button>
              </div>
              <div className="mt-4">
                <h4 className="font-medium text-sm mb-2">API 정보</h4>
                <div className="bg-gray-100 p-3 rounded-lg text-sm">
                  <p><span className="font-medium">서비스:</span> {api.service.name}</p>
                  <p><span className="font-medium">메서드:</span> {api.method}</p>
                  <p><span className="font-medium">파라미터:</span></p>
                  <pre className="mt-1 text-xs bg-gray-200 p-2 rounded">
                    {JSON.stringify(api.params(), null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="border-t">
              <div className="p-4 bg-gray-50 flex items-center">
                <h4 className="font-medium">API 응답 결과</h4>
                {apiResponses[api.id] && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                    데이터 있음
                  </span>
                )}
              </div>
              {renderApiResponse(api.id)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApiTestPage; 