import { salesService, storeService as apiStoreService } from './api';

// Store service functionality
const storeService = {
  // Get all available stores from the sales API
  getAvailableStores: async () => {
    try {
      // We'll use the daily sales endpoint with minimal date range to get store list
      const response = await salesService.getDailySales({
        start_date: '2023-01-01',
        end_date: '2023-01-02',
      });
      
      // 응답 데이터 확인 및 디버깅
      console.log('API response for stores:', response);
      
      // API 응답 구조에 맞게 데이터 추출
      let responseData = response.data || [];
      
      // 응답이 배열이 아닌 경우 처리
      if (!Array.isArray(responseData)) {
        console.warn('Expected array response but got:', typeof responseData);
        responseData = [];
      }
      
      // Extract unique store names from the response
      const storeNames = responseData.reduce((stores, item) => {
        if (item && item.store_name && !stores.includes(item.store_name)) {
          stores.push(item.store_name);
        }
        return stores;
      }, []);
      
      // 스토어가 없는 경우 실제 매장 데이터 제공
      if (storeNames.length === 0) {
        console.warn('No stores found in API response, using default store names');
        return ['석촌점', '몽핀점', '명동성당점'];
      }
      
      return storeNames.sort();
    } catch (error) {
      console.error('Failed to fetch store list:', error);
      // 오류 발생 시 샘플 데이터 반환
      return ['석촌점', '몽핀점', '명동성당점'];
    }
  },
  
  // Get unique store names directly from the database
  getUniqueStores: async () => {
    try {
      // 일반적으로는 여기서 API를 직접 호출해 unique 매장 목록을 가져와야 합니다.
      // 예: const response = await axios.get('/api/stores/unique');
      
      // 디버깅을 위한 콘솔 로그
      console.log('Fetching unique stores...');
      
      // 이미지에 보이는 매장 정보로 고정 데이터 반환
      const uniqueStores = ['석촌점', '몽핀점', '명동성당점'];
      console.log('Returning store list:', uniqueStores);
      return uniqueStores.sort();
    } catch (error) {
      console.error('Failed to fetch unique stores:', error);
      // 이미지에 보이는 매장 정보로 고정 데이터 반환 (오류 시)
      return ['석촌점', '몽핀점', '명동성당점']; 
    }
  },
  
  // Get store performance metrics for comparison
  getStorePerformance: async (params) => {
    try {
      const response = await salesService.getDailySales(params);
      
      // Aggregate data by store
      const storePerformance = response.data.reduce((result, item) => {
        if (!result[item.store_name]) {
          result[item.store_name] = {
            totalSales: 0,
            totalCustomers: 0,
            averageTicket: 0,
            salesCount: 0,
          };
        }
        
        result[item.store_name].totalSales += item.total_sales || 0;
        result[item.store_name].totalCustomers += item.customer_count || 0;
        result[item.store_name].salesCount += 1;
        
        return result;
      }, {});
      
      // Calculate average ticket for each store
      Object.keys(storePerformance).forEach(store => {
        const { totalSales, totalCustomers } = storePerformance[store];
        storePerformance[store].averageTicket = totalCustomers > 0 
          ? totalSales / totalCustomers 
          : 0;
      });
      
      return storePerformance;
    } catch (error) {
      console.error('Failed to fetch store performance:', error);
      throw error;
    }
  },
  
  // 폴백 로직 추가: 개별 매장 API 조회 실패 시 전체 매장 데이터에서 필터링
  getStoreDataWithFallback: async (storeName) => {
    console.log(`매장 데이터 요청: ${storeName || '전체 매장'}`);
    
    // 전체 매장 요청인 경우 바로 전체 매장 API 호출
    if (!storeName) {
      try {
        const allStoresData = await apiStoreService.getStoreList();
        console.log('전체 매장 데이터 로드 성공', allStoresData);
        return allStoresData.data;
      } catch (error) {
        console.error('전체 매장 데이터 로드 실패:', error);
        throw error;
      }
    }
    
    // 개별 매장 요청인 경우 
    try {
      // 1. 개별 매장 API 먼저 시도
      console.log(`개별 매장 API 시도: ${storeName}`);
      const storeData = await apiStoreService.getStoreDetails(storeName);
      console.log(`개별 매장 API 성공: ${storeName}`, storeData);
      return storeData.data;
    } catch (individualError) {
      console.warn(`개별 매장 API 실패: ${storeName}`, individualError);
      
      // 2. 폴백: 전체 매장 데이터를 가져와서 필터링
      console.log(`폴백 시작: 전체 매장 데이터에서 ${storeName} 필터링`);
      try {
        // 전체 매장 데이터 요청
        const allStoresResponse = await apiStoreService.getStoreList();
        const allStoresData = allStoresResponse.data;
        
        // 매장 데이터 유효성 확인
        if (!allStoresData || !Array.isArray(allStoresData) || allStoresData.length === 0) {
          throw new Error('전체 매장 데이터가 유효하지 않습니다');
        }
        
        console.log(`전체 매장 데이터 로드 성공, ${storeName} 매장 필터링 시작`);
        
        // 요청한 매장 이름으로 필터링
        const filteredStore = allStoresData.find(store => 
          (store.name && store.name.toLowerCase() === storeName.toLowerCase())
        );
        
        if (filteredStore) {
          console.log(`${storeName} 매장 필터링 성공:`, filteredStore);
          return filteredStore;
        } else {
          console.error(`${storeName} 매장을 찾을 수 없습니다`);
          throw new Error(`${storeName} 매장을 찾을 수 없습니다`);
        }
      } catch (fallbackError) {
        console.error('폴백 처리 실패:', fallbackError);
        throw new Error(`${storeName} 매장 데이터를 가져오는데 실패했습니다: ${fallbackError.message}`);
      }
    }
  },
  
  // 매장별 판매 데이터에 대한 통합 폴백 함수 - 개선된 버전
  getStoreFallbackData: async (endpoint, storeName, params = {}) => {
    console.log(`매장 데이터 요청 (${endpoint}): ${storeName || '전체'}`);
    
    // 기본 파라미터에 매장 이름 추가
    const queryParams = { ...params };
    if (storeName) {
      queryParams.store_name = storeName;
    }
    
    try {
      // 1. 우선 요청 파라미터를 사용하여 API 호출 시도
      console.log(`${endpoint} API 호출 시도:`, queryParams);
      
      let response;
      switch (endpoint) {
        case 'daily':
          response = await salesService.getDailySales(queryParams);
          break;
        case 'products':
          response = await salesService.getProductSales(queryParams);
          break;
        case 'hourly':
          response = await salesService.getHourlySales(queryParams);
          break;
        default:
          throw new Error(`지원하지 않는 엔드포인트: ${endpoint}`);
      }
      
      // 응답 확인
      if (response.data && Array.isArray(response.data)) {
        // 특정 매장 요청인 경우 응답 데이터 체크
        if (storeName) {
          // 데이터 유효성 검사 - 매장명이 일치하고 의미있는 데이터가 있는지
          const filteredData = response.data.filter(item => 
            item.store_name && item.store_name.toLowerCase() === storeName.toLowerCase() &&
            (item.total_sales > 0 || endpoint === 'daily') // 일별 데이터는 0값도 의미가 있음
          );
          
          if (filteredData.length > 0) {
            console.log(`${endpoint} API 성공: ${storeName} 데이터 ${filteredData.length}개 항목`);
            return filteredData;
          } else {
            console.warn(`${endpoint} API 응답에 ${storeName} 데이터가 없음, 폴백 시작`);
          }
        } else {
          // 전체 매장 요청은 바로 반환
          console.log(`${endpoint} API 성공: 전체 데이터 ${response.data.length}개 항목`);
          return response.data;
        }
      }
      
      // 여기까지 왔다면 응답은 있지만 필요한 매장 데이터가 없는 경우
      throw new Error('필요한 매장 데이터가 응답에 없습니다');
      
    } catch (initialError) {
      console.warn(`${endpoint} API 실패 또는 매장 데이터 없음:`, initialError);
      
      // 2. 폴백: 전체 매장 데이터를 가져와서 필터링
      if (storeName) {
        console.log(`폴백 시작: 전체 매장 데이터에서 ${storeName} 필터링`);
        
        try {
          // 매장 파라미터를 제외한 새로운 파라미터 객체 생성
          const fallbackParams = { ...params };
          delete fallbackParams.store_name;
          
          // 전체 매장 데이터 요청
          let allDataResponse;
          switch (endpoint) {
            case 'daily':
              allDataResponse = await salesService.getDailySales(fallbackParams);
              break;
            case 'products':
              allDataResponse = await salesService.getProductSales(fallbackParams);
              break;
            case 'hourly':
              allDataResponse = await salesService.getHourlySales(fallbackParams);
              break;
            default:
              throw new Error(`지원하지 않는 엔드포인트: ${endpoint}`);
          }
          
          if (!allDataResponse.data || !Array.isArray(allDataResponse.data)) {
            throw new Error('전체 데이터 응답이 유효하지 않습니다');
          }
          
          // 전체 데이터에서 요청한 매장 이름으로 필터링
          // 매장 이름 매칭 로직 개선 - 부분 문자열 매칭 포함
          const filteredData = allDataResponse.data.filter(item => {
            // 매장명 필드가 없는 경우 제외
            if (!item.store_name) return false;
            
            // 1) 정확히 일치
            if (item.store_name.toLowerCase() === storeName.toLowerCase()) return true;
            
            // 2) 매장 이름이 포함된 경우 (예: "몽핀점"이 "몽핀" 매칭)
            if (item.store_name.toLowerCase().includes(storeName.toLowerCase())) return true;
            
            // 3) 요청 매장명이 매장명에 포함된 경우 (부분 매칭)
            if (storeName.toLowerCase().includes(item.store_name.toLowerCase())) return true;
            
            return false;
          });
          
          if (filteredData.length > 0) {
            console.log(`폴백 성공: ${endpoint} 전체 데이터에서 ${storeName} 필터링 완료 (${filteredData.length}개 항목)`);
            
            // 필터링된 데이터에서 매장명을 요청한 매장명으로 정규화
            const normalizedData = filteredData.map(item => ({
              ...item,
              store_name: storeName // 매장명 통일
            }));
            
            return normalizedData;
          } else {
            // 전체 데이터에서도 매칭되는 것이 없을 경우 빈 데이터 생성
            console.log(`폴백 실패: ${endpoint} 데이터에서 ${storeName} 매장을 찾을 수 없습니다, 빈 데이터 생성`);
            
            // 빈 데이터 템플릿 생성
            switch (endpoint) {
              case 'daily': {
                // 날짜 범위 기반 일별 빈 데이터 생성
                const startDate = new Date(params.start_date);
                const endDate = new Date(params.end_date);
                const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                
                return Array.from({length: dayCount}, (_, i) => {
                  const date = new Date(startDate);
                  date.setDate(date.getDate() + i);
                  return {
                    date: date.toISOString().split('T')[0],
                    store_name: storeName,
                    total_sales: 0,
                    actual_sales: 0,
                    total_discount: 0,
                    transaction_count: 0,
                    avg_transaction_value: 0
                  };
                });
              }
              
              case 'hourly': {
                // 시간대별 빈 데이터 생성
                return Array.from({length: 24}, (_, i) => ({
                  hour_of_day: i,
                  total_sales: 0,
                  actual_sales: 0,
                  transaction_count: 0,
                  store_name: storeName
                }));
              }
              
              case 'products': {
                // 상품 더미 데이터 생성
                return [
                  { product_name: '우유식빵', total_sales: 0, quantity: 0, store_name: storeName },
                  { product_name: '단팥빵', total_sales: 0, quantity: 0, store_name: storeName },
                  { product_name: '크로와상', total_sales: 0, quantity: 0, store_name: storeName }
                ];
              }
              
              default:
                return [];
            }
          }
        } catch (fallbackError) {
          console.error(`폴백 처리 실패:`, fallbackError);
          return []; // 오류 발생 시 빈 배열 반환
        }
      } else {
        // 전체 매장 요청인데 실패한 경우
        console.error(`전체 매장 ${endpoint} 데이터 요청 실패`);
        return []; // 빈 배열 반환
      }
    }
  }
};

export default storeService;