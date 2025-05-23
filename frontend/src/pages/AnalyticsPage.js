import React, { useState, useEffect } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import HeatMap from '../components/charts/HeatMap';
import { analyticsService } from '../services/api';

const AnalyticsPage = () => {
  const {
    filters: {
      dateRange: { startDate, endDate },
      selectedStore
    },
    setLoading,
    setError
  } = useDashboard();
  
  // State for analytics data
  const [anomalies, setAnomalies] = useState([]);
  const [correlations, setCorrelations] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [activeTab, setActiveTab] = useState('anomalies'); // 'anomalies', 'correlations', 'patterns'
  
  // Fetch analytics data based on active tab
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        const params = {
          start_date: startDate,
          end_date: endDate,
          store_name: selectedStore || undefined,
        };
        
        if (activeTab === 'anomalies') {
          const response = await analyticsService.getAnomalies({
            ...params,
            metric: 'sales', // Could also be 'customers', 'average_ticket'
          });
          setAnomalies(response.data);
        } else if (activeTab === 'correlations') {
          const response = await analyticsService.getCorrelations({
            ...params,
            variables: 'sales,discount,hour,customers', // Variables to analyze
          });
          setCorrelations(response.data);
        } else if (activeTab === 'patterns') {
          const response = await analyticsService.getPatterns({
            ...params,
            pattern_type: 'daily', // Could also be 'hourly', 'weekly'
          });
          setPatterns(response.data);
        }
        
        setLoading(false);
      } catch (error) {
        console.error(`Error fetching ${activeTab} data:`, error);
        setError(`분석 데이터를 불러오는 데 실패했습니다.`);
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [activeTab, startDate, endDate, selectedStore, setLoading, setError]);
  
  // Format correlation data for visualization
  const formatCorrelationData = () => {
    const formattedData = [];
    // Use matrix keys as variables list
    const matrix = correlations?.matrix;
    if (matrix && typeof matrix === 'object') {
      const variablesList = Object.keys(matrix);
      // Build heatmap data from correlation matrix
      variablesList.forEach((var1) => {
        variablesList.forEach((var2) => {
          formattedData.push({
            var1,
            var2,
            value: matrix[var1]?.[var2] ?? 0,
          });
        });
      });
    } else {
      // Sample data if we don't have actual data yet
      const variables = ['매출', '할인', '시간대', '고객수'];
      const sampleMatrix = [
        [1.0, -0.3, 0.5, 0.85],
        [-0.3, 1.0, 0.1, -0.2],
        [0.5, 0.1, 1.0, 0.6],
        [0.85, -0.2, 0.6, 1.0],
      ];
      
      variables.forEach((var1, i) => {
        variables.forEach((var2, j) => {
          formattedData.push({
            var1,
            var2,
            value: sampleMatrix[i][j],
          });
        });
      });
    }
    
    return formattedData;
  };
  
  // Format patterns data
  const formatPatternsData = () => {
    if (patterns && patterns.trend && patterns.seasonal && patterns.residual) {
      return patterns.dates.map((date, index) => ({
        date,
        actual: patterns.actual[index],
        trend: patterns.trend[index],
        seasonal: patterns.seasonal[index],
        residual: patterns.residual[index],
      }));
    }
    
    // Return empty array if data not available
    return [];
  };
  
  // Render anomaly detection tab content
  const renderAnomaliesTab = () => {
    const hasAnomalyData = anomalies && anomalies.dates && anomalies.values && anomalies.anomalies;
    
    if (!hasAnomalyData) {
      return (
        <div className="py-8 text-center text-gray-500">
          <p>이상치 탐지 데이터가 없습니다.</p>
        </div>
      );
    }
    
    // Format anomaly data for chart
    const anomalyData = anomalies.dates.map((date, index) => ({
      date,
      value: anomalies.values[index],
      isAnomaly: anomalies.anomalies[index],
      lowerBound: anomalies.lower_bound ? anomalies.lower_bound[index] : undefined,
      upperBound: anomalies.upper_bound ? anomalies.upper_bound[index] : undefined,
    }));
    
    return (
      <div>
        <div className="mb-4">
          <h3 className="text-md font-medium">이상치 탐지 결과</h3>
          <p className="text-sm text-gray-500">
            정상 범위를 벗어난 매출/고객수 데이터를 감지합니다. 표준 편차 및 IQR 방식을 기반으로 계산됩니다.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <LineChart
            data={anomalyData}
            xDataKey="date"
            lines={[
              { dataKey: 'value', name: '실제 값' },
              { dataKey: 'lowerBound', name: '하한 경계', color: '#BFDBFE' },
              { dataKey: 'upperBound', name: '상한 경계', color: '#BFDBFE' },
            ]}
          />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-medium mb-3">탐지된 이상치</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">값</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">유형</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {anomalyData
                  .filter(item => item.isAnomaly)
                  .map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{item.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{item.value.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.value > (item.upperBound || Infinity) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            상향 이상치
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            하향 이상치
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  // Render correlation analysis tab content
  const renderCorrelationsTab = () => {
    const correlationData = formatCorrelationData();
    
    return (
      <div>
        <div className="mb-4">
          <h3 className="text-md font-medium">상관관계 분석</h3>
          <p className="text-sm text-gray-500">
            매출, 할인, 시간대, 고객수 간의 상관관계를 분석합니다. 색상이 진할수록 상관관계가 강합니다.
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <HeatMap
            data={correlationData}
            xAxis={{ key: 'var1', name: '변수 1' }}
            yAxis={{ key: 'var2', name: '변수 2' }}
            valueKey="value"
            formatter={(value) => value.toFixed(2)}
            height={400}
          />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-medium mb-3">주요 상관관계 인사이트</h4>
          
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-500">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="ml-2">매출과 고객수는 <strong>강한 양의 상관관계</strong>를 보입니다. (0.85)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-500">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="ml-2">할인과 매출은 <strong>약한 음의 상관관계</strong>를 보입니다. (-0.3)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-500">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="ml-2">시간대와 고객수는 <strong>중간 정도의 양의 상관관계</strong>를 보입니다. (0.6)</span>
            </li>
          </ul>
        </div>
      </div>
    );
  };
  
  // Render patterns analysis tab content
  const renderPatternsTab = () => {
    const patternData = formatPatternsData();
    
    return (
      <div>
        <div className="mb-4">
          <h3 className="text-md font-medium">매출 패턴 분석</h3>
          <p className="text-sm text-gray-500">
            시계열 분해를 통한 매출 추세, 계절성, 잔차 분석입니다.
          </p>
        </div>
        
        {patternData.length > 0 ? (
          <>
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h4 className="font-medium mb-3">원본 데이터 vs 추세선</h4>
              <LineChart
                data={patternData}
                xDataKey="date"
                lines={[
                  { dataKey: 'actual', name: '실제 매출' },
                  { dataKey: 'trend', name: '추세선', color: '#10B981' },
                ]}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-medium mb-3">계절성 패턴</h4>
                <LineChart
                  data={patternData}
                  xDataKey="date"
                  lines={[
                    { dataKey: 'seasonal', name: '계절성', color: '#F59E0B' },
                  ]}
                />
                <p className="mt-2 text-sm text-gray-500">
                  계절성 패턴은 일별/주별/월별 반복 패턴을 보여줍니다.
                </p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-medium mb-3">잔차 (설명되지 않는 변동)</h4>
                <LineChart
                  data={patternData}
                  xDataKey="date"
                  lines={[
                    { dataKey: 'residual', name: '잔차', color: '#EF4444' },
                  ]}
                />
                <p className="mt-2 text-sm text-gray-500">
                  잔차는 추세와 계절성으로 설명되지 않는 불규칙한 변동성입니다.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <p>패턴 분석 데이터가 없습니다.</p>
          </div>
        )}
      </div>
    );
  };
  
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'anomalies':
        return renderAnomaliesTab();
      case 'correlations':
        return renderCorrelationsTab();
      case 'patterns':
        return renderPatternsTab();
      default:
        return null;
    }
  };
  
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">고급 분석</h1>
      
      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'anomalies'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('anomalies')}
          >
            이상치 탐지
          </button>
          <button
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'correlations'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('correlations')}
          >
            상관관계 분석
          </button>
          <button
            className={`py-4 px-6 font-medium text-sm border-b-2 ${
              activeTab === 'patterns'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('patterns')}
          >
            패턴 분석
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      {renderTabContent()}
    </div>
  );
};

export default AnalyticsPage; 