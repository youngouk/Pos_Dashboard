import React, { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import HeatMap from '../components/charts/HeatMap';
import { salesService } from '../services/api';

const SalesPage = () => {
  const { filters, setLoading, setError, fetchApiData } = useDashboard();
  
  // State for sales data
  const [dailySales, setDailySales] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [hourlySales, setHourlySales] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  
  // Generate cache keys based on filters
  const getDailySalesCacheKey = useCallback(() => {
    return `daily_sales_${filters.dateRange.startDate}_${filters.dateRange.endDate}_${filters.selectedStore || 'all'}`;
  }, [filters]);
  
  const getProductSalesCacheKey = useCallback(() => {
    return `product_sales_${filters.dateRange.startDate}_${filters.dateRange.endDate}_${filters.selectedStore || 'all'}_15`;
  }, [filters]);
  
  const getHourlySalesCacheKey = useCallback(() => {
    return `hourly_sales_${filters.dateRange.startDate}_${filters.dateRange.endDate}_${filters.selectedStore || 'all'}`;
  }, [filters]);
  
  const getPaymentTypesCacheKey = useCallback(() => {
    return `payment_types_${filters.dateRange.startDate}_${filters.dateRange.endDate}_${filters.selectedStore || 'all'}`;
  }, [filters]);
  
  // Fetch all sales data
  useEffect(() => {
    let isMounted = true;
    
    const fetchSalesData = async () => {
      try {
        // 로깅 추가 - 데이터 로딩 시작
        console.log('매출 데이터 로딩 시작', {
          startDate: filters.dateRange.startDate,
          endDate: filters.dateRange.endDate,
          store: filters.selectedStore
        });
        
        const params = {
          start_date: filters.dateRange.startDate,
          end_date: filters.dateRange.endDate,
          // 빈 문자열('')은 '전체 매장 합계'를 의미하며, API 호출 시 store_name 파라미터를 전송하지 않음
          // 배열이 아닌 단일 문자열로 전송합니다
          ...(filters.selectedStore ? { store_name: filters.selectedStore } : {})
        };
        
        console.log('API 요청 파라미터:', params);
        
        // 각 API를 개별적으로 호출하여 오류 지점 파악
        try {
          // Daily sales
          console.log('일별 매출 데이터 요청 시작');
          const dailyResult = await fetchApiData(
            salesService, 
            'getDailySales', 
            params, 
            getDailySalesCacheKey()
          );
          console.log('일별 매출 데이터 요청 완료:', dailyResult);
          
          if (isMounted) {
            setDailySales(dailyResult);
          }
        } catch (error) {
          console.error('일별 매출 데이터 요청 오류:', error);
        }
        
        try {
          // Product sales
          console.log('제품별 매출 데이터 요청 시작');
          const productResult = await fetchApiData(
            salesService, 
            'getProductSales', 
            {...params, limit: 15}, 
            getProductSalesCacheKey()
          );
          console.log('제품별 매출 데이터 요청 완료:', productResult);
          
          if (isMounted) {
            setProductSales(productResult);
          }
        } catch (error) {
          console.error('제품별 매출 데이터 요청 오류:', error);
        }
        
        try {
          // Hourly sales
          console.log('시간대별 매출 데이터 요청 시작');
          const hourlyResult = await fetchApiData(
            salesService, 
            'getHourlySales', 
            params, 
            getHourlySalesCacheKey()
          );
          console.log('시간대별 매출 데이터 요청 완료:', hourlyResult);
          
          if (isMounted) {
            setHourlySales(hourlyResult);
          }
        } catch (error) {
          console.error('시간대별 매출 데이터 요청 오류:', error);
        }
        
        try {
          // Payment types
          console.log('결제 방식별 매출 데이터 요청 시작');
          const paymentResult = await fetchApiData(
            salesService, 
            'getPaymentTypes', 
            params, 
            getPaymentTypesCacheKey()
          );
          console.log('결제 방식별 매출 데이터 요청 완료:', paymentResult);
          
          if (isMounted) {
            setPaymentTypes(paymentResult);
          }
        } catch (error) {
          console.error('결제 방식별 매출 데이터 요청 오류:', error);
        }
        
        // 데이터 확인을 위한 로깅
        console.log('매출 데이터 로딩 완료', {
          dailySalesLength: dailySales.length,
          productSalesLength: productSales.length,
          hourlySalesLength: hourlySales.length,
          paymentTypesLength: paymentTypes.length
        });
        
      } catch (error) {
        console.error('매출 데이터 로딩 중 오류 발생:', error);
        if (isMounted) {
          setError('매출 데이터를 불러오는 데 실패했습니다.');
        }
      }
    };
    
    fetchSalesData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [
    filters.dateRange.startDate, 
    filters.dateRange.endDate, 
    filters.selectedStore, 
    fetchApiData,
    setError,
    getDailySalesCacheKey,
    getProductSalesCacheKey,
    getHourlySalesCacheKey,
    getPaymentTypesCacheKey,
    dailySales.length,
    productSales.length,
    hourlySales.length,
    paymentTypes.length
  ]);
  
  // Format currency
  const formatCurrency = (value) => `${value.toLocaleString()} 원`;
  
  // Format day of week data
  const formatDayOfWeekData = useCallback(() => {
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
    const dayData = Array(7).fill(0).map((_, index) => ({ 
      day: daysOfWeek[index], 
      sales: 0,
      orders: 0, 
      count: 0 
    }));
    
    // 로깅을 통한 데이터 확인
    console.log('Daily sales data for day of week calculation:', dailySales);
    
    dailySales.forEach(item => {
      // 'date' 필드를 'sales_date' 대신 사용 (백엔드 API 응답 필드에 맞춤)
      const date = new Date(item.date);
      const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday
      
      if (!item || typeof item.total_sales !== 'number') return;
      dayData[dayIndex].sales += item.total_sales;
      // 'transaction_count' 필드를 'order_count' 대신 사용
      dayData[dayIndex].orders += item.transaction_count || 0;
      dayData[dayIndex].count += 1;
    });
    
    // Calculate averages
    dayData.forEach(day => {
      if (day.count > 0) {
        day.sales = day.sales / day.count;
        day.orders = day.orders / day.count;
      }
    });
    
    return dayData;
  }, [dailySales]);
  
  // Format hourly data for heatmap
  const prepareHourlyHeatMapData = useCallback(() => {
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
    const result = [];
    
    // 로깅을 통한 데이터 확인
    console.log('Hourly sales data for heatmap:', hourlySales);
    
    // Using mock data for demo, would need to be calculated from actual data
    for (let hour = 8; hour < 22; hour++) {
      for (let day = 0; day < 7; day++) {
        // 'hour' 필드를 'hour_of_day' 대신 사용 (백엔드 API 응답 필드에 맞춤)
        const hourSales = hourlySales.find(item => item.hour === hour) || { total_sales: 0 };
        // Randomize a bit for demo purposes
        const varianceFactor = 0.7 + Math.random() * 0.6;
        
        if (!hourSales || typeof hourSales.total_sales !== 'number') {
          console.warn(`Invalid hourly sales data for hour ${hour}`);
          continue; // return에서 continue로 변경하여 전체 함수가 중단되지 않도록 수정
        }
        
        result.push({
          hour: `${hour}시`,
          day: daysOfWeek[day],
          value: Math.round(hourSales.total_sales * varianceFactor / 7)
        });
      }
    }
    
    return result;
  }, [hourlySales]);
  
  // 안전한 데이터 처리 함수 강화
  const safeData = (data) => {
    // 데이터가 없을 경우 빈 배열 반환
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('Empty or invalid data passed to safeData function');
      return [];
    }
    
    // 데이터 로깅 (디버깅용)
    console.log('Processing data in safeData:', data.slice(0, 2)); // 처음 2개 항목만 로깅
    
    return data.map(item => {
      if (!item) return { sales: 0 };
      
      // sales 필드가 있으면 그대로 사용, 없으면 total_sales 필드를 sales로 매핑
      const sales = typeof item.sales === 'number' 
        ? item.sales 
        : (typeof item.total_sales === 'number' ? item.total_sales : 0);
      
      return {
        ...item,
        sales: sales,
      };
    });
  };
  
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">매출 분석</h1>
      
      {/* Daily Sales Trend */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">일별 매출 추이</h2>
        {dailySales.length > 0 && (
          <LineChart
            data={safeData(dailySales).map(item => ({
              date: item.date, // 'date' 필드를 'sales_date' 대신 사용
              매출: item.total_sales,
              주문수: item.transaction_count, // 'transaction_count' 필드를 'order_count' 대신 사용
            }))}
            xDataKey="date"
            lines={[
              { dataKey: '매출', name: '매출액' },
              { dataKey: '주문수', name: '주문수', color: '#F59E0B' },
            ]}
          />
        )}
      </div>
      
      {/* Day of Week Analysis */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">요일별 평균 매출</h2>
        <BarChart
          data={safeData(formatDayOfWeekData())}
          xDataKey="day"
          barDataKey="sales"
          barName="평균 매출액"
          layout="horizontal"
        />
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Product Sales Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">상품별 매출</h2>
          {productSales.length > 0 && (
            <BarChart
              data={safeData(productSales).map(item => ({
                product: item.product_name,
                sales: item.total_sales,
              }))}
              xDataKey="product"
              barDataKey="sales"
              barName="매출액"
              layout="vertical"
            />
          )}
        </div>
        
        {/* Payment Type Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">결제 방식별 매출</h2>
          {paymentTypes.length > 0 && (
            <PieChart
              data={safeData(paymentTypes).map(item => ({
                name: item.payment_type || '미분류',
                value: item.total_sales,
              }))}
              dataKey="value"
              nameKey="name"
            />
          )}
        </div>
      </div>
      
      {/* Hourly Heatmap */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">시간대별/요일별 매출 히트맵</h2>
        <HeatMap
          data={safeData(prepareHourlyHeatMapData())}
          xAxis={{ key: 'hour', name: '시간대' }}
          yAxis={{ key: 'day', name: '요일' }}
          valueKey="value"
          formatter={formatCurrency}
        />
        <div className="mt-2 text-sm text-gray-500 text-center">
          <p>시간대별 매출 강도를 표시하며, 색상이 짙을수록 매출이 높은 시간대입니다.</p>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;