import React, { useState, useEffect } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import { compareService } from '../services/api';

const ComparePage = () => {
  const { filters, setLoading, setError } = useDashboard();
  
  // State for comparison data
  const [storeComparison, setStoreComparison] = useState([]);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [factorsData, setFactorsData] = useState([]);
  const [comparisonType, setComparisonType] = useState('average'); // 'average', 'top25', 'bottom25', 'similar'
  
  // Fetch comparison data
  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        setLoading(true);
        
        // 대상 매장: 선택된 매장이 없으면 매장 목록 중 첫 번째 매장 사용
        const targetStore = filters.selectedStore || filters.stores.find(s => s.id !== 'all')?.name;
        if (!targetStore) {
          setError('매장을 선택하거나 매장 목록을 불러오지 못했습니다.');
          setLoading(false);
          return;
        }

        // Front-to-back 파라미터 매핑
        const benchmarkTypeMap = {
          average: 'all',
          top25: 'top_25',
          bottom25: 'bottom_25',
          similar: 'similar',
        };
        const params = {
          store_name: targetStore,
          metrics: 'total_sales,avg_transaction,discount_rate,transaction_count',
          benchmark_type: benchmarkTypeMap[comparisonType] || 'all',
        };
        
        // 1) 핵심 비교 데이터 (/compare/store)
        let comparisonData;
        if (comparisonType === 'top25' || comparisonType === 'bottom25') {
          const groupStore = comparisonType === 'top25' ? '명동점' : '몽핀점';
          // Fetch selected store data
          const selectedResponse = await compareService.getStoresComparison(params);
          // Fetch group store data (using benchmark_type 'all' for direct values)
          const groupParams = { ...params, store_name: groupStore, benchmark_type: 'all' };
          const groupResponse = await compareService.getStoresComparison(groupParams);
          // Combine metrics: selected store vs. group store
          const combinedMetrics = selectedResponse.data.metrics.map((m, index) => ({
            ...m,
            store_value: m.store_value,
            benchmark_value: groupResponse.data.metrics[index]?.store_value
          }));
          // Combine daily comparison data
          const combinedDaily = selectedResponse.data.daily_comparison.map(item => ({
            date: item.date,
            store_sales: item.store_sales,
            comparison_sales: groupResponse.data.daily_comparison.find(g => g.date === item.date)?.store_sales || 0
          }));
          comparisonData = {
            ...selectedResponse.data,
            metrics: combinedMetrics,
            daily_comparison: combinedDaily
          };
        } else {
          const response = await compareService.getStoresComparison(params);
          comparisonData = response.data;
        }
        setStoreComparison(comparisonData);

        // 2) 벤치마크 메트릭을 비교 응답에서 직접 구성 (추가 API 호출 불필요)
        const derivedBenchmark = {
          store_metrics: {},
          benchmark_metrics: {},
        };
        if (comparisonData && comparisonData.metrics) {
          comparisonData.metrics.forEach((m) => {
            derivedBenchmark.store_metrics[m.metric_name] = m.store_value;
            derivedBenchmark.benchmark_metrics[m.metric_name] = m.benchmark_value;
          });
        }
        setBenchmarkData(derivedBenchmark);
        
        // 3) 성과 요인(factors) API가 아직 없을 수 있으므로 실패해도 무시
        try {
          const factorsResp = await compareService.getFactors({
            store_name: targetStore,
            factor_type: 'performance',
          });
          setFactorsData(factorsResp.data);
        } catch (fErr) {
          console.warn('factors API 호출 실패 - UI에 영향을 주지 않고 계속 진행', fErr);
        }
        
        setError(null);
        setLoading(false);
      } catch (error) {
        console.error('ComparePage 주요 API 오류:', error);
        // 네트워크 오류 등 치명적 오류만 사용자에게 표시
        if (!error.response || error.response.status >= 500) {
          setError('매장 비교 데이터를 불러오는 데 실패했습니다.');
        }
        setLoading(false);
      }
    };
    
    // 항상 데이터 호출 (targetStore 내부에서 적절히 fallback)
    fetchComparisonData();
  }, [filters.selectedStore, filters.stores, comparisonType, setLoading, setError]);
  
  // Format performance metrics for radar chart
  const formatMetricData = () => {
    if (!benchmarkData || !storeComparison || !storeComparison.metrics) return [];
    return storeComparison.metrics.map((m) => ({
      metric: m.display_name || m.metric_name,
      '선택 매장': m.store_value,
      '비교 그룹': m.benchmark_value,
    }));
  };
  
  // Prepare daily comparison data
  const prepareDailyComparisonData = () => {
    if (!storeComparison || !storeComparison.daily_comparison) {
      return [];
    }
    
    return storeComparison.daily_comparison.map(item => ({
      date: item.date,
      '선택 매장': item.store_sales,
      '비교 그룹': item.comparison_sales,
    }));
  };
  
  // Format factors data
  const formatFactorsData = () => {
    if (!factorsData || !factorsData.factors) {
      return [];
    }
    
    return factorsData.factors.map(factor => ({
      factor: factor.name,
      impact: factor.impact_score,
      description: factor.description,
    })).sort((a, b) => b.impact - a.impact);
  };
  
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">매장 비교 분석</h1>
      
      {/* Comparison Type Selection */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">비교 유형 선택</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setComparisonType('average')}
            className={`px-4 py-2 rounded-lg text-sm ${
              comparisonType === 'average'
                ? 'bg-brand-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체 평균과 비교
          </button>
          <button
            onClick={() => setComparisonType('top25')}
            className={`px-4 py-2 rounded-lg text-sm ${
              comparisonType === 'top25'
                ? 'bg-brand-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            상위 25% 매장과 비교
          </button>
          <button
            onClick={() => setComparisonType('bottom25')}
            className={`px-4 py-2 rounded-lg text-sm ${
              comparisonType === 'bottom25'
                ? 'bg-brand-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            하위 25% 매장과 비교
          </button>
          <button
            onClick={() => setComparisonType('similar')}
            className={`px-4 py-2 rounded-lg text-sm ${
              comparisonType === 'similar'
                ? 'bg-brand-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            유사 상권 매장과 비교
          </button>
        </div>
      </div>
      
      {/* Daily Sales Comparison */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {filters.selectedStore} vs {
            comparisonType === 'average' ? '전체 평균' :
            comparisonType === 'top25' ? '상위 25% 매장' :
            comparisonType === 'bottom25' ? '하위 25% 매장' : '유사 상권 매장'
          } 일별 매출 비교
        </h2>
        
        <LineChart
          data={prepareDailyComparisonData()}
          xDataKey="date"
          lines={[
            { dataKey: '선택 매장', name: filters.selectedStore, color: '#2563EB' },
            { dataKey: '비교 그룹', name: comparisonType === 'average' ? '전체 평균' :
                                        comparisonType === 'top25' ? '상위 25% 매장' :
                                        comparisonType === 'bottom25' ? '하위 25% 매장' : '유사 상권 매장',
              color: '#F59E0B' },
          ]}
        />
      </div>
      
      {/* Key Metrics Comparison */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">핵심 지표 비교</h2>
        
        <BarChart
          data={formatMetricData()}
          xDataKey="metric"
          barDataKey="선택 매장"
          barName={filters.selectedStore}
          secondaryDataKey="비교 그룹"
          secondaryBarName={
            comparisonType === 'average' ? '전체 평균' :
            comparisonType === 'top25' ? '상위 25% 매장' :
            comparisonType === 'bottom25' ? '하위 25% 매장' : '유사 상권 매장'
          }
          layout="horizontal"
          formatter={(value) => `${value}%`}
        />
        
        <div className="mt-4 text-sm text-gray-500 text-center">
          <p>각 지표는 0-100% 범위로 정규화되어 표시됩니다. 높을수록 더 좋은 성과를 의미합니다.</p>
        </div>
      </div>
      
      {/* Performance Factors */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">성과 영향 요인</h2>
        
        {factorsData && factorsData.factors && (
          <div className="space-y-6">
            {formatFactorsData().map((factor, index) => (
              <div key={index} className="border-b pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-medium">{factor.factor}</h4>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    factor.impact > 75 ? 'bg-green-100 text-green-800' :
                    factor.impact > 50 ? 'bg-blue-100 text-blue-800' :
                    factor.impact > 25 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    영향도: {factor.impact}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">{factor.description}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      factor.impact > 75 ? 'bg-green-500' :
                      factor.impact > 50 ? 'bg-blue-500' :
                      factor.impact > 25 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${factor.impact}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {(!factorsData || !factorsData.factors) && (
          <div className="py-8 text-center text-gray-500">
            <p>성과 요인 데이터가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparePage; 