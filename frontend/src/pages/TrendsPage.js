import React, { useState, useEffect } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import LineChart from '../components/charts/LineChart';
import { trendsService } from '../services/api';

const TrendsPage = () => {
  const {
    filters: {
      dateRange: { startDate, endDate },
      selectedStore
    },
    setLoading,
    setError
  } = useDashboard();
  
  // States for trends data
  const [forecastData, setForecastData] = useState([]);
  const [seasonalityData, setSeasonalityData] = useState([]);
  const [activeTab, setActiveTab] = useState('forecast');

  // Fetch trend data
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setLoading(true);
        
        const params = {
          start_date: startDate,
          end_date: endDate,
          ...(selectedStore ? { store_name: selectedStore } : {}),
        };
        
        if (activeTab === 'forecast') {
          // Fetch forecast data
          const forecastResponse = await trendsService.getForecast(params);
          setForecastData(forecastResponse.data || []);
        } else if (activeTab === 'seasonality') {
          // Fetch seasonality data
          const seasonalityResponse = await trendsService.getSeasonality(params);
          setSeasonalityData(seasonalityResponse.data || []);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching trend data:', error);
        setError('트렌드 데이터를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    };
    
    fetchTrendData();
  }, [activeTab, startDate, endDate, selectedStore, setLoading, setError]);
  
  // Format forecast data
  const formatForecastData = () => {
    if (!forecastData || (!forecastData.historical_data && !forecastData.forecast_data)) return [];

    const combined = {};

    // 실제 값(과거 구간)
    (forecastData.historical_data || []).forEach(pt => {
      combined[pt.date] = {
        date: pt.date,
        '실제 매출': pt.value,
      };
    });

    // 예측 값(미래 구간) + 신뢰 구간
    (forecastData.forecast_data || []).forEach(pt => {
      if (!combined[pt.date]) combined[pt.date] = { date: pt.date };
      combined[pt.date]['예측 매출'] = pt.value;
      if (pt.upper_bound !== undefined) combined[pt.date]['신뢰 구간 상한'] = pt.upper_bound;
      if (pt.lower_bound !== undefined) combined[pt.date]['신뢰 구간 하한'] = pt.lower_bound;
    });

    // 날짜 기준 정렬된 배열 반환
    return Object.values(combined).sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  // Format seasonality data
  const formatSeasonalityData = () => {
    if (!seasonalityData || !seasonalityData.seasonal_components) return [];

    return seasonalityData.seasonal_components.map(comp => ({
      period: comp.period || comp.label || '',
      '계절성 지수': comp.value !== undefined ? comp.value : comp.seasonality_index,
    }));
  };
  
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">트렌드 분석</h1>
      
      {/* Tabs */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex space-x-4 border-b mb-4">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'forecast'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            매출 예측
          </button>
          <button
            onClick={() => setActiveTab('seasonality')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'seasonality'
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            계절성 분석
          </button>
        </div>
        
        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">매출 예측 분석</h2>
            <div className="mb-4">
              <LineChart
                data={formatForecastData()}
                xDataKey="date"
                lines={[
                  { dataKey: '실제 매출', name: '실제 매출', color: '#2563EB' },
                  { dataKey: '예측 매출', name: '예측 매출', color: '#F59E0B', strokeDasharray: '5 5' },
                ]}
                areaDataKey="신뢰 구간 하한"
                areaName="예측 신뢰 구간"
                areaDataKey2="신뢰 구간 상한"
                areaColor="rgba(59, 130, 246, 0.2)"
              />
            </div>
            <div className="text-sm text-gray-500">
              <p>신뢰 구간은 예측의 불확실성 범위를 나타냅니다. 실제 매출이 이 구간 내에 있을 확률이 높습니다.</p>
            </div>
          </div>
        )}
        
        {/* Seasonality Tab */}
        {activeTab === 'seasonality' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">계절성 분석</h2>
            <div className="mb-4">
              <LineChart
                data={formatSeasonalityData()}
                xDataKey="period"
                lines={[
                  { dataKey: '계절성 지수', name: '계절성 지수', color: '#10B981' },
                ]}
              />
            </div>
            <div className="text-sm text-gray-500">
              <p>계절성 지수는 1을 기준으로 각 기간별 매출 변동 패턴을 나타냅니다. 1보다 크면 해당 기간에 매출이 증가하는 경향이, 1보다 작으면 감소하는 경향이 있음을 의미합니다.</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Analysis Insights */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">트렌드 인사이트</h2>
        
        {activeTab === 'forecast' && forecastData && forecastData.insights && (
          <div className="space-y-4">
            {forecastData.insights.map((insight, index) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800">{insight.description}</p>
                {insight.recommendation && (
                  <p className="mt-2 text-sm text-gray-600">추천: {insight.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'seasonality' && seasonalityData && seasonalityData.insights && (
          <div className="space-y-4">
            {seasonalityData.insights.map((insight, index) => (
              <div key={index} className="p-3 bg-green-50 rounded-lg">
                <p className="text-green-800">{insight.description}</p>
                {insight.recommendation && (
                  <p className="mt-2 text-sm text-gray-600">추천: {insight.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendsPage; 