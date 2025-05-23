import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { storeService as apiStoreService } from '../services/api';
import { storesMock } from '../services/apiMockData';
import storeService from '../services/storeService';

// API 데이터 캐싱을 위한 객체
const apiCache = {
  data: new Map(),
  timestamp: new Map(),
  // 캐시 유효 시간 (밀리초)
  MAX_AGE: 30 * 60 * 1000, // 30분으로 변경
  // 영구 캐시 데이터 - 앱 재시작해도 남아있음
  persistentCache: {},
  hasPersistentData: false,
};

// API 응답 영구 저장을 위한 로컬스토리지 키
const PERSISTENT_CACHE_KEY = 'LePain_dashboard_cache';

// Initial dashboard state
const initialState = {
  // User view (headquarters or supervisor)
  userView: 'headquarters',
  
  // Sidebar state
  sidebarExpanded: true,
  
  // Filter state
  filters: {
    dateRange: {
      // Default to full month of March of current year
      startDate: format(new Date(new Date().getFullYear(), 2, 1), 'yyyy-MM-dd'),
      endDate: format(new Date(new Date().getFullYear(), 3, 0), 'yyyy-MM-dd'),
    },
    stores: [],
    selectedStore: '석촌점',
    productCategory: '',
  },
  
  // Data loading state
  isLoading: false,
  
  // Error state
  error: null,
  
  // 캐시된 데이터
  cache: {
    dashboardData: null,
    salesData: null,
    analyticsData: null,
  },
};

// Create context
const DashboardContext = createContext(initialState);

// Custom hook to use the dashboard context
export const useDashboard = () => useContext(DashboardContext);

// Dashboard provider component
export const DashboardProvider = ({ children }) => {
  const [state, setState] = useState(initialState);
  const isInitialMount = useRef(true);
  
  // 앱 초기화 시 영구 캐시 로드
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem(PERSISTENT_CACHE_KEY);
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        apiCache.persistentCache = parsedCache;
        apiCache.hasPersistentData = true;
        console.log('영구 캐시 로드됨:', Object.keys(parsedCache).length + '개 항목');
      }
      
      // store_list 관련 캐시 항목 강제 삭제 (개발용)
      for (const key in apiCache.persistentCache) {
        if (key.includes('store_list')) {
          delete apiCache.persistentCache[key];
          console.log('캐시 항목 삭제됨:', key);
        }
      }
      
      // 메모리 캐시에서도 삭제
      for (const key of apiCache.data.keys()) {
        if (key.includes('store_list')) {
          apiCache.data.delete(key);
          apiCache.timestamp.delete(key);
          console.log('메모리 캐시 항목 삭제됨:', key);
        }
      }
      
    } catch (error) {
      console.error('영구 캐시 로드 실패:', error);
    }
  }, []);
  
  // 영구 캐시 저장 함수
  const savePersistentCache = useCallback(() => {
    try {
      localStorage.setItem(PERSISTENT_CACHE_KEY, JSON.stringify(apiCache.persistentCache));
      console.log('영구 캐시 저장됨:', Object.keys(apiCache.persistentCache).length + '개 항목');
    } catch (error) {
      console.error('영구 캐시 저장 실패:', error);
    }
  }, []);
  
  // 주기적으로 영구 캐시 저장 (앱 종료 시 데이터 유지)
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (apiCache.hasPersistentData) {
        savePersistentCache();
      }
    }, 60000); // 1분마다 저장
    
    return () => clearInterval(saveInterval);
  }, [savePersistentCache]);
  
  // Function to change user view
  const changeUserView = useCallback((view) => {
    setState(prevState => ({
      ...prevState,
      userView: view
    }));
  }, []);
  
  // Function to toggle sidebar
  const setSidebarExpanded = useCallback((expanded) => {
    setState(prevState => ({
      ...prevState,
      sidebarExpanded: expanded
    }));
  }, []);
  
  // Function to update filters
  const updateFilters = useCallback((newFilters) => {
    setState(prevState => ({
      ...prevState,
      filters: {
        ...prevState.filters,
        ...newFilters
      }
    }));
  }, []);
  
  // Function to set loading state
  const setLoading = useCallback((isLoading) => {
    setState(prevState => ({
      ...prevState,
      isLoading
    }));
  }, []);
  
  // Function to set error state
  const setError = useCallback((error) => {
    setState(prevState => ({
      ...prevState,
      error
    }));
  }, []);
  
  // Function to get cached API data if valid
  const getCachedApiData = useCallback((key) => {
    // 1. 메모리 캐시 확인
    if (apiCache.data.has(key)) {
      const timestamp = apiCache.timestamp.get(key);
      const now = Date.now();
      
      // 캐시 만료 확인
      if (now - timestamp <= apiCache.MAX_AGE) {
        return apiCache.data.get(key);
      }
      
      // 캐시 만료 시 삭제
      apiCache.data.delete(key);
      apiCache.timestamp.delete(key);
    }
    
    // 2. 영구 캐시 확인
    if (apiCache.persistentCache[key]) {
      console.log(`영구 캐시에서 데이터 로드: ${key}`);
      // 영구 캐시 데이터를 메모리 캐시에 복제 (다음 접근 속도 향상)
      apiCache.data.set(key, apiCache.persistentCache[key]);
      apiCache.timestamp.set(key, Date.now());
      return apiCache.persistentCache[key];
    }
    
    return null;
  }, []);
  
  // Function to cache API data
  const cacheApiData = useCallback((key, data) => {
    // 데이터를 메모리 캐시에 저장
    apiCache.data.set(key, data);
    apiCache.timestamp.set(key, Date.now());
    
    // 동시에 영구 캐시에도 저장
    apiCache.persistentCache[key] = data;
    apiCache.hasPersistentData = true;
    
    // 중요한 데이터인 경우 즉시 localStorage에 저장
    if (key.includes('_sales_') || key.includes('kpi_summary')) {
      savePersistentCache();
    }
  }, [savePersistentCache]);

  
  // Function to invalidate specific cache entries
  const invalidateCache = useCallback((keyPattern) => {
    // 메모리 캐시 무효화
    for (const key of apiCache.data.keys()) {
      if (key.includes(keyPattern)) {
        apiCache.data.delete(key);
        apiCache.timestamp.delete(key);
      }
    }
    
    // 영구 캐시 무효화
    let invalidatedCount = 0;
    for (const key in apiCache.persistentCache) {
      if (key.includes(keyPattern)) {
        delete apiCache.persistentCache[key];
        invalidatedCount++;
      }
    }
    
    if (invalidatedCount > 0) {
      console.log(`영구 캐시 무효화: ${keyPattern} 패턴과 일치하는 ${invalidatedCount}개 항목`);
      savePersistentCache();
    }
  }, [savePersistentCache]);
  
  // 캐시 완전 초기화 (디버깅용)
  const clearAllCache = useCallback(() => {
    apiCache.data.clear();
    apiCache.timestamp.clear();
    apiCache.persistentCache = {};
    apiCache.hasPersistentData = false;
    localStorage.removeItem(PERSISTENT_CACHE_KEY);
    console.log('모든 캐시가 초기화되었습니다.');
  }, []);
  
  // 매장 데이터를 가져오는 함수 (폴백 로직 활용)
  const fetchStoreData = useCallback(async (storeName, endpoint, params = {}) => {
    try {
      setLoading(true);
      
      // 캐시 키 생성
      const datePart = params.start_date && params.end_date 
        ? `_${params.start_date}_to_${params.end_date}` 
        : '';
      const cacheKey = `store_${endpoint}_${storeName || 'all'}${datePart}`;
      
      // 캐시에서 먼저 확인
      const cachedData = getCachedApiData(cacheKey);
      if (cachedData) {
        console.log(`매장 데이터 캐시에서 로드: ${cacheKey}`);
        setLoading(false);
        return cachedData;
      }
      
      // 캐시 없을 경우 폴백 로직이 적용된 서비스 호출
      console.log(`매장 데이터 서비스에서 로드: ${storeName || '전체'}, ${endpoint}`);
      const data = await storeService.getStoreFallbackData(endpoint, storeName, params);
      
      // 결과 캐싱
      cacheApiData(cacheKey, data);
      console.log(`매장 데이터 캐싱: ${cacheKey}`);
      
      setLoading(false);
      return data;
    } catch (error) {
      console.error(`매장 데이터 로드 실패: ${storeName}, ${endpoint}`, error);
      setError(`매장 데이터를 불러오는 데 실패했습니다: ${error.message}`);
      setLoading(false);
      return [];
    }
  }, [getCachedApiData, cacheApiData, setLoading, setError]);
  
  // Function to fetch API data with caching
  const fetchApiData = useCallback(async (service, method, params, cacheKey) => {
    // 데이터 요청 시작 시간 기록 (성능 측정용)
    const startTime = performance.now();
    let dataSource = 'network';
    
    // 파라미터 로깅 및 확인 - 특히 store_name 처리 강화
    console.log(`fetchApiData 호출: ${method}, 파라미터:`, params);
    
    // store_name 파라미터 처리 - 배열인 경우 첫 번째 항목만 사용
    const processedParams = { ...params };
    if (processedParams.store_name && Array.isArray(processedParams.store_name)) {
      processedParams.store_name = processedParams.store_name[0];
      console.log('store_name 배열을 문자열로 변환 (context):', processedParams.store_name);
    }
    
    // Try to get from cache first
    const cachedData = getCachedApiData(cacheKey);
    if (cachedData) {
      const endTime = performance.now();
      console.log(`캐시에서 데이터 로드 (${Math.round(endTime - startTime)}ms): ${cacheKey}`);
      dataSource = 'cache';
      return cachedData;
    }
    
    // Otherwise fetch from API
    try {
      setLoading(true);
      
      console.log(`API 요청 시작: ${method}`, processedParams);
      const response = await service[method](processedParams);
      
      // 응답 데이터 로깅 - 디버깅 용도
      console.log(`API 응답 (${method}):`, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      
      // 백엔드에서 반환하는 데이터 구조에 따라 적절히 처리
      // axios 응답에서 data 부분 추출
      const data = response.data;
      
      // 응답 시간 측정 및 로깅
      const endTime = performance.now();
      console.log(`API 응답 수신 (${Math.round(endTime - startTime)}ms): ${cacheKey}`, {
        데이터크기: JSON.stringify(data).length,
        구조: Array.isArray(data) ? `배열(${data.length}개 항목)` : typeof data
      });
      
      // Cache the result
      cacheApiData(cacheKey, data);
      
      setLoading(false);
      return data;
    } catch (error) {
      console.error(`API 요청 실패 (${method}):`, error);
      console.error('오류 상세:', error.response?.data || error.message);
      
      // 네트워크 오류인 경우 영구 캐시에서 데이터 시도
      if (error.message && error.message.includes('Network Error') && apiCache.persistentCache[cacheKey]) {
        console.log(`네트워크 오류 발생, 영구 캐시에서 데이터 사용: ${cacheKey}`);
        setLoading(false);
        dataSource = 'persistent-fallback';
        return apiCache.persistentCache[cacheKey];
      }
      
      setError(`데이터를 불러오는 데 실패했습니다: ${error.response?.data?.detail || error.message}`);
      setLoading(false);
      throw error;
    } finally {
      // 성능 측정 데이터 기록
      const totalTime = Math.round(performance.now() - startTime);
      console.log(`데이터 로드 완료 (${dataSource}): ${cacheKey} - ${totalTime}ms`);
    }
  }, [getCachedApiData, cacheApiData, setLoading, setError]);
  
  // Load initial data and available stores
  useEffect(() => {
    // Only fetch stores once on initial mount
    if (isInitialMount.current) {
      const fetchStores = async () => {
        // 캐시 키를 try 블록 외부에서 정의
        const cacheKey = 'store_list';
        
        try {
          setLoading(true);
          
          // Try cache first
          const cachedStores = getCachedApiData(cacheKey);
          
          if (cachedStores) {
            console.log('매장 데이터 캐시에서 로드:', cachedStores);
            
            // 캐시에서 로드한 경우에도 '전체' 매장 옵션 확인
            const storesList = cachedStores.some(store => store.id === 'all')
              ? cachedStores // 이미 '전체' 매장이 있으면 그대로 사용
              : [{ id: 'all', name: '전체' }, ...cachedStores]; // 없으면 추가
            
            setState(prevState => ({
              ...prevState,
              filters: {
                ...prevState.filters,
                stores: storesList,
                selectedStore: '', // 빈 문자열은 '전체 매장 합계'를 의미
              },
              isLoading: false,
            }));
            return;
          }
          
          // 실제 백엔드 API에서 매장 목록 가져오기
          console.log('매장 데이터 서비스에서 로드 시작');
          const response = await apiStoreService.getStoreList();
          
          // 응답 형식에 따라 데이터 추출 및 가공
          // 백엔드 API가 StoreListResponse 모델에 따라 name 필드를 반환
          const storesData = response.data;
          
          // 매장 목록 구성 (id 추가 및 전체 매장 옵션 포함)
          const storesList = [
            // 전체 매장 옵션 추가
            { id: 'all', name: '전체' },
            // 백엔드에서 받은 매장 목록 변환
            ...storesData.map((store, index) => ({
              id: store.id || `store-${index}`,
              name: store.name
            }))
          ];
          
          console.log('매장 데이터 로드 완료:', storesList);
          
          // Cache the result
          cacheApiData(cacheKey, storesList);
          
          setState(prevState => ({
            ...prevState,
            filters: {
              ...prevState.filters,
              stores: storesList,
              selectedStore: '', // 빈 문자열은 '전체 매장 합계'를 의미
            },
            isLoading: false,
          }));
        } catch (error) {
          console.error('Failed to fetch stores:', error);
          
          // 오류 발생 시 기본 매장 목록 설정
          const defaultStores = [
            { id: 'all', name: '전체' },
            { id: 'store-1', name: '명동점' },
            { id: 'store-2', name: '석촌점' },
            { id: 'store-3', name: '몽핀점' }
          ];
          
          console.log('API 오류 발생, 기본 매장 목록 사용:', defaultStores);
          
          // 기본 매장 목록 캐싱
          cacheApiData(cacheKey, defaultStores);
          
          setState(prevState => ({
            ...prevState,
            filters: {
              ...prevState.filters,
              stores: defaultStores,
              selectedStore: '',
            },
            isLoading: false,
          }));
          
          setError('매장 목록을 불러오는 데 실패했습니다. 나중에 다시 시도해주세요.');
        }
      };
      
      fetchStores();
      isInitialMount.current = false;
    }
  }, [getCachedApiData, cacheApiData, setLoading, setError]);
  
  // Invalidate cache when filters change
  useEffect(() => {
    if (!isInitialMount.current) {
      // Only invalidate cache when filters change (not on first render)
      invalidateCache('sales');
      invalidateCache('kpi');
      invalidateCache('analytics');
      invalidateCache('store_status'); // BlankPage에서 사용하는 캐시 키 패턴 추가
    }
  }, [state.filters, invalidateCache]);
  
  // Context value - memoize to prevent unnecessary renders
  const value = {
    // Spread existing state (includes filters.dateRange, filters.stores, filters.selectedStore, etc.)
    ...state,
    // Expose a simple array of store names for selectors
    stores: state.filters.stores.map(store => store.name),
    // Context functions
    changeUserView,
    setSidebarExpanded,
    updateFilters,
    setLoading,
    setError,
    fetchApiData,
    fetchStoreData,
    getCachedApiData,
    invalidateCache,
    clearAllCache,
    refreshData: (keyPattern) => {
      // ... existing refreshData implementation ...
    }
  };
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardContext;