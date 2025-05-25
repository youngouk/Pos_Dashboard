import React, { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import KPICard from '../components/dashboard/KPICard';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import ChartAnalysisWidget from '../components/analytics/ChartAnalysisWidget';
import { kpiService, salesService, compareService } from '../services/api';
import { FiDollarSign, FiUsers, FiShoppingCart, FiPercent } from 'react-icons/fi';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell } from 'recharts';
import PageAnalysisWidget from '../components/analytics/PageAnalysisWidget';
import ComingSoonOverlay from '../components/common/ComingSoonOverlay';

const DashboardPage = () => {
  const { 
    filters,
    setError, 
    fetchApiData,
    invalidateCache
  } = useDashboard();
  
  // State for dashboard data with initial empty values
  const [kpiData, setKpiData] = useState(null);
  const [dailySales, setDailySales] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [hourlySales, setHourlySales] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [showAllStores, setShowAllStores] = useState(true);
  
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [showMovingAverageOnly, setShowMovingAverageOnly] = useState(false); // 이동평균만 표시하는 상태 추가
  const [storeComparison, setStoreComparison] = useState(null); // 매장 비교 데이터를 저장
  
  // 전체 매장 데이터 캐시 (개별 매장 API 호출 실패 시 폴백용)
  const [allStoresData, setAllStoresData] = useState({
    hourly: [],
    products: [],
    daily: []
  });
  
  // 전체 또는 선택된 매장에 따라 차트 데이터 필터링 - 개선 버전
  const filterDataByStore = useCallback((data, storeField = 'store_name') => {
    if (!data || data.length === 0) return [];
    
    // 매장 필드 데이터 확인
    const storeValues = data.map(item => item[storeField]);
    const uniqueStores = [...new Set(storeValues)].filter(Boolean);
    
    console.log('데이터 필터링 시작:', {
      항목수: data.length,
      매장필드: storeField,
      고유매장목록: uniqueStores,
      선택매장: selectedStores,
      전체모드: showAllStores
    });
    
    // 매장 일치 확인 함수
    const matchStore = (storeNameInData, selectedStore) => {
      if (!storeNameInData || !selectedStore) return false;
      
      // 1) 정확히 일치
      if (storeNameInData.toLowerCase() === selectedStore.toLowerCase()) return true;
      
      // 2) 부분 일치
      if (storeNameInData.toLowerCase().includes(selectedStore.toLowerCase()) ||
          selectedStore.toLowerCase().includes(storeNameInData.toLowerCase())) {
        return true;
      }
      
      return false;
    };
    
    // 1. 어떤 매장을 표시할지 결정
    let filteredData = [];
    
    if (showAllStores) {
      // 전체 매장 선택 시 ('전체' 데이터 있으면 사용, 없으면 모든 데이터 반환)
      const totalData = data.filter(item => item[storeField] === '전체');
      if (totalData.length > 0) {
        console.log("'전체' 매장 데이터 발견, 해당 데이터만 사용");
        return totalData;
      } else {
        // '전체' 매장 데이터가 없으면 모든 데이터 반환
        console.log("'전체' 매장 데이터 없음, 모든 데이터 사용");
        return data;
      }
    } else if (selectedStores.length > 0) {
      // 특정 매장만 선택한 경우
      console.log('특정 매장만 선택:', selectedStores);
      const selectedStore = selectedStores[0]; // 첫 번째 매장만 사용
      
      // 정확한 매장명 매치 확인 - 대소문자 무시 비교 및 부분 일치 포함
      filteredData = data.filter(item => {
        const storeName = item[storeField];
        if (!storeName) return false;
        
        return matchStore(storeName, selectedStore);
      });
      
      // 필터링 결과 확인
      console.log('특정 매장 필터링 결과:', {
        결과건수: filteredData.length
      });
      
      // 일치하는 데이터가 없으면 원본 데이터 반환 (일단 차트는 보여줌)
      if (filteredData.length === 0) {
        console.warn('선택한 매장에 해당하는 데이터가 없습니다. 전체 데이터 반환');
        return data;
      }
      
      return filteredData;
    } else {
      // 선택된 매장이 없는 경우 (기본값)
      return data;
    }
  }, [showAllStores, selectedStores]);
  
  // Generate cache keys based on filters (항상 전체 매장 데이터 기준으로 캐시 설정)
  const getKpiCacheKey = useCallback(() => {
    // 매장 선택과 무관하게 항상 전체 매장 데이터에 대한 캐시 키 생성
    return `kpi_summary_${filters.dateRange.startDate}_${filters.dateRange.endDate}_ALL`;
  }, [filters]);
  
  const getDailySalesCacheKey = useCallback(() => {
    // 매장 선택과 무관하게 항상 전체 매장 데이터에 대한 캐시 키 생성
    return `daily_sales_${filters.dateRange.startDate}_${filters.dateRange.endDate}_ALL`;
  }, [filters]);
  
  const getProductSalesCacheKey = useCallback(() => {
    // 매장 선택과 무관하게 항상 전체 매장 데이터에 대한 캐시 키 생성
    return `product_sales_${filters.dateRange.startDate}_${filters.dateRange.endDate}_ALL`;
  }, [filters]);
  
  const getHourlySalesCacheKey = useCallback(() => {
    // 매장 선택과 무관하게 항상 전체 매장 데이터에 대한 캐시 키 생성
    return `hourly_sales_${filters.dateRange.startDate}_${filters.dateRange.endDate}_ALL`;
  }, [filters]);
  
  const getTopPerformersCacheKey = useCallback(() => {
    // 매장 선택과 무관하게 항상 전체 매장 데이터에 대한 캐시 키 생성
    return `top_performers_${filters.dateRange.startDate}_${filters.dateRange.endDate}_total_sales`;
  }, [filters]);
  
  // 캐시된 전체 매장 데이터에서 선택한 매장 데이터 필터링하여 상태 업데이트
  const updateSelectedStoreData = useCallback((kpi, daily, products, hourly) => {
    console.log('선택 매장 데이터 필터링 시작:', selectedStores[0]);
    
    if (!selectedStores.length) {
      console.log('선택된 매장이 없습니다. 전체 데이터 사용');
      return;
    }
    
    // 매장 필터링 함수 (데이터 타입에 따라 다양한 필드명 처리)
    const filterBySelectedStore = (data, storeField = 'store_name') => {
      if (!data || !data.length) return [];
      
      return data.filter(item => {
        if (!item[storeField]) return false;
        
        // 대소문자 무시, 부분 일치까지 검사하여 데이터 필터링
        const itemStoreName = String(item[storeField]).toLowerCase();
        const selectedStore = String(selectedStores[0]).toLowerCase();
        
        return itemStoreName === selectedStore || 
               itemStoreName.includes(selectedStore) || 
               selectedStore.includes(itemStoreName);
      });
    };
    
    // 일별 매출 데이터 필터링
    const filteredDaily = filterBySelectedStore(daily, 'store_name');
    // 상품별 매출 데이터 필터링
    const filteredProducts = filterBySelectedStore(products, 'store_name');
    // 시간대별 매출 데이터 필터링
    const filteredHourly = filterBySelectedStore(hourly, 'store_name');
    
    console.log('선택 매장 필터링 결과:', {
      일별매출: `${filteredDaily.length}/${daily?.length || 0}`,
      상품매출: `${filteredProducts.length}/${products?.length || 0}`,
      시간대매출: `${filteredHourly.length}/${hourly?.length || 0}`
    });
    
    // 필터링된 데이터로 상태 업데이트
    setDailySales(filteredDaily);
    setProductSales(filteredProducts);
    setHourlySales(filteredHourly);
    // KPI는 그대로 사용 (전체 매장 요약 데이터)
    setKpiData(kpi);
  }, [selectedStores]);

  // 매장 선택 처리 - 클라이언트 측 필터링만 수행하도록 개선
  const handleStoreSelection = (store) => {
    console.log('매장 선택 처리:', store);
    
    // 이미 동일한 매장이 선택된 경우 중복 처리 방지
    if (store === 'all' && showAllStores) {
      console.log('이미 전체 매장이 선택되어 있습니다.');
      document.getElementById('store-dropdown').classList.add('hidden');
      return;
    }
    
    if (!showAllStores && selectedStores.length === 1 && selectedStores[0] === store) {
      console.log('이미 선택된 매장입니다.');
      document.getElementById('store-dropdown').classList.add('hidden');
      return;
    }
    
    // 선택한 매장이 "all"(전체)인 경우
    if (store === 'all') {
      // 전체 매장 선택 모드로 설정
      setSelectedStores([]);
      setShowAllStores(true);
      
      // 캐시된 전체 데이터 사용 (API 호출 없음)
      setDailySales(allStoresData.daily);
      setProductSales(allStoresData.products);
      setHourlySales(allStoresData.hourly);
      console.log('전체 매장 선택: 캐시된 전체 데이터 표시');
      
      // 드롭다운 닫기
      document.getElementById('store-dropdown').classList.add('hidden');
      return;
    }
    
    // 개별 매장 선택 처리 - 항상 단일 선택 모드
    setShowAllStores(false);
    setSelectedStores([store]); // 단일 선택 모드로 변경
    console.log('매장 선택:', store);
    
    // 캐시된 전체 매장 데이터에서 선택된 매장 데이터 필터링 (API 호출 없음)
    if (allStoresData.daily.length > 0) {
      // 새로 추가한 updateSelectedStoreData 함수 사용
      updateSelectedStoreData(
        kpiData, 
        allStoresData.daily, 
        allStoresData.products, 
        allStoresData.hourly
      );
      console.log('매장 선택: 캐시된 데이터에서 필터링 완료');
    } else {
      console.warn('캐시된 데이터가 없습니다. 빈 화면이 표시될 수 있습니다.');
    }
    
    // 드롭다운 닫기
    document.getElementById('store-dropdown').classList.add('hidden');
  };
  
  // Fetch data using centralized function
  useEffect(() => {
    // Skip initial render to prevent double fetching in React.StrictMode
    let isMounted = true;
    
    // 디버깅 로그 추가 - 매장 선택 상태 파악
    console.log('useEffect 트리거 - 현재 매장 선택 상태:', {
      showAllStores,
      selectedStores,
      필터매장목록: filters.stores
    });
    
    // 항상 전체 매장 데이터만 요청하도록 수정 - 매장 선택과 무관하게 일관된 cacheKey 사용
    // 날짜 필터만 캐시 키에 영향을 미침
    const requestKey = `${filters.dateRange.startDate}_${filters.dateRange.endDate}_ALL`;
    
    // 로컬 캐시 확인 로직 (간단한 메모리 캐시)
    const localCacheKey = `dashboard_data_${requestKey}`;
    const cachedData = sessionStorage.getItem(localCacheKey);
    
    // 이미 진행 중인 API 요청이 있는지 확인
    const apiRequestStatusKey = `api_request_${requestKey}_in_progress`;
    const apiRequestInProgressValue = sessionStorage.getItem(apiRequestStatusKey);
    
    if (apiRequestInProgressValue === 'true') {
      console.log('이미 API 요청이 진행 중입니다. 중복 요청 방지:', localCacheKey);
      return; // 이미 API 요청이 진행 중이면 중복 요청 방지
    }
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        
        // 캐시된 데이터 확인
        console.log('캐시에서 데이터 로드됨:', {
          cacheKey: localCacheKey,
          KPI: parsed.kpiData ? '있음' : '없음',
          일별매출: parsed.dailySales.length,
          상품별매출: parsed.productSales.length,
          시간대별매출: parsed.hourlySales.length
        });
        
        // 전체 매장 데이터 캐시 저장 (필터링용)
        setAllStoresData({
          hourly: parsed.hourlySales || [],
          products: parsed.productSales || [],
          daily: parsed.dailySales || []
        });
        
        // 매장 선택 상태에 따라 데이터 필터링하여 표시
        if (!showAllStores && selectedStores.length > 0) {
          // 선택된 매장에 맞게 필터링하여 화면에 표시
          const selectedStore = selectedStores[0];
          console.log(`캐시된 데이터에서 '${selectedStore}' 매장 데이터 필터링`);
          
          // 매장별 필터링 수행
          const filterByStore = (data, storeField = 'store_name') => {
            if (!data || !data.length) return [];
            return data.filter(item => {
              if (!item[storeField]) return false;
              
              // 대소문자 무시, 부분 일치까지 검사
              const itemStore = String(item[storeField]).toLowerCase();
              const selStore = selectedStore.toLowerCase();
              return itemStore === selStore || itemStore.includes(selStore) || selStore.includes(itemStore);
            });
          };
          
          // 필터링된 데이터 적용
          setKpiData(parsed.kpiData); // KPI는 전체 데이터 사용
          setDailySales(filterByStore(parsed.dailySales, 'store_name'));
          setProductSales(filterByStore(parsed.productSales, 'store_name'));
          setHourlySales(filterByStore(parsed.hourlySales, 'store_name'));
          setTopPerformers(parsed.topPerformers || { performers: [] });
        } else {
          // 전체 매장 모드: 모든 데이터 표시
          setKpiData(parsed.kpiData);
          setDailySales(parsed.dailySales);
          setProductSales(parsed.productSales);
          setHourlySales(parsed.hourlySales);
          setTopPerformers(parsed.topPerformers || { performers: [] });
        }
        
        return; // 캐시된 데이터가 있으면 API 호출 스킵
      } catch (e) {
        console.error('캐시 파싱 오류:', e);
        // 캐시 파싱 실패 시 계속 진행하여 API 호출
      }
    }
    
    const loadDashboardData = async () => {
      try {
        // 요청 cacheKey 생성 (중복 요청 방지용)
        const requestKey = `${filters.dateRange.startDate}_${filters.dateRange.endDate}_ALL`;
        
        // 진행 중인 API 요청이 있는지 확인
        const apiRequestStatusKey = `api_request_${requestKey}_in_progress`;
        if (sessionStorage.getItem(apiRequestStatusKey) === 'true') {
          console.log('이미 진행 중인 API 요청이 있습니다. 중복 요청 방지:', requestKey);
          return;
        }
        
        // API 요청 진행 중 플래그 설정
        sessionStorage.setItem(apiRequestStatusKey, 'true');
        console.log('API 요청 시작 플래그 설정:', apiRequestStatusKey);
        
        // API 요청 파라미터 설정 - 항상 전체 매장 데이터만 요청
        const params = {
          start_date: filters.dateRange.startDate,
          end_date: filters.dateRange.endDate,
          // store_name 파라미터를 제거하여 항상 전체 매장 데이터만 요청
        };
        
        console.log('API 요청 파라미터 (전체 매장 데이터):', params);
        
        try {
          // Promise.all을 사용하여 요청을 동시에 처리
          const [kpiResult, dailyResult, productResult, hourlyResult, topPerformersResult] = await Promise.all([
            // KPI summary
            fetchApiData(
              kpiService, 
              'getSummary', 
              params, 
              getKpiCacheKey()
            ),
            
            // Daily sales
            fetchApiData(
              salesService, 
              'getDailySales', 
              params, 
              getDailySalesCacheKey()
            ),
            
            // Product sales
            fetchApiData(
              salesService, 
              'getProductSales', 
              {...params, limit: 30}, // 더 많은 상품 데이터 요청 
              getProductSalesCacheKey()
            ),
            
            // Hourly sales
            fetchApiData(
              salesService, 
              'getHourlySales', 
              params, 
              getHourlySalesCacheKey()
            ),
            
            // Top performers
            fetchApiData(
              compareService,
              'getTopPerformers',
              {
                ...params,
                metric: 'total_sales',
                limit: 5
              },
              getTopPerformersCacheKey()
            )
          ]);
          
          // API 응답 결과 상세 로깅
          console.log('API 요청 결과 상세:', {
            KPI: kpiResult ? '데이터 있음' : '데이터 없음',
            일별매출: {
              개수: dailyResult?.length || 0,
              샘플: dailyResult?.slice(0, 2) || []
            },
            상품별매출: {
              개수: productResult?.length || 0,
              샘플: productResult?.slice(0, 2) || []
            },
            시간대별매출: {
              개수: hourlyResult?.length || 0,
              샘플: hourlyResult?.slice(0, 2) || []
            },
            상위매장: {
              개수: topPerformersResult?.performers?.length || 0,
              샘플: topPerformersResult?.performers?.slice(0, 2) || []
            }
          });
          
          // 받아온 전체 데이터 (필터링은 추후 UI 렌더링 시 수행)
          const finalHourlyData = hourlyResult || [];
          const finalProductData = productResult || [];
          const finalDailyData = dailyResult || [];
          
          // API 응답 로깅 
          console.log('사용할 전체 매장 데이터:', {
            KPI: kpiResult ? '데이터 있음' : '데이터 없음',
            일별매출: finalDailyData.length,
            상품별매출: finalProductData.length,
            시간대별매출: finalHourlyData.length
          });
          
          // 컴포넌트가 여전히 마운트된 상태인 경우에만 상태 업데이트
          if (isMounted) {
            // 결과 데이터를 세션 스토리지에 캐시
            const dataToCache = {
              kpiData: kpiResult,
              dailySales: finalDailyData,
              productSales: finalProductData,
              hourlySales: finalHourlyData,
              topPerformers: topPerformersResult || { performers: [] }
            };
            
            try {
              sessionStorage.setItem(localCacheKey, JSON.stringify(dataToCache));
              console.log('전체 매장 데이터 캐시 저장됨:', localCacheKey);
            } catch (e) {
              console.error('캐시 저장 오류:', e);
            }
            
            // 전역 상태에도 저장 (필터링용)
            setAllStoresData({
              hourly: finalHourlyData,
              products: finalProductData,
              daily: finalDailyData
            });
            
            // 매장 필터링 처리
            // 특정 매장이 선택된 경우 선택한 매장 데이터만 필터링하여 상태 업데이트
            if (!showAllStores && selectedStores.length > 0) {
              // 선택된 매장에 맞게 필터링된 데이터를 화면에 표시
              const filteredDailySales = filterDataByStore(finalDailyData, 'store_name');
              const filteredProductSales = filterDataByStore(finalProductData, 'store_name');
              const filteredHourlySales = filterDataByStore(finalHourlyData, 'store_name');
              
              setKpiData(kpiResult); // KPI는 전체 데이터 사용
              setDailySales(filteredDailySales);
              setProductSales(filteredProductSales);
              setHourlySales(filteredHourlySales);
              
              console.log('선택된 매장 데이터로 필터링 완료:', {
                매장: selectedStores[0],
                일별매출: filteredDailySales.length,
                상품별매출: filteredProductSales.length,
                시간대별매출: filteredHourlySales.length
              });
            } else {
              // 전체 매장 모드: 모든 데이터 표시
              setKpiData(kpiResult);
              setDailySales(finalDailyData);
              setProductSales(finalProductData);
              setHourlySales(finalHourlyData);
              setTopPerformers(topPerformersResult || { performers: [] });
            }
            
            // API 요청 완료 플래그 제거
            sessionStorage.removeItem(`api_request_${requestKey}_in_progress`);
            console.log('API 요청 완료 플래그 제거');
          }
        } catch (error) {
          console.error('전체 매장 데이터 요청 실패:', error);
          
          if (isMounted) {
            setError('데이터를 불러오는 데 실패했습니다.');
            
            // API 요청 완료 플래그 제거 (오류 발생 시에도)
            sessionStorage.removeItem(`api_request_${requestKey}_in_progress`);
            console.log('API 요청 완료 플래그 제거 (오류 발생)');
          }
        }
      } catch (error) {
        // 최상위 try-catch 추가: 락 관리나 기타 예외 처리를 위한 예외 핸들러
        console.error('loadDashboardData 함수 실행 중 오류 발생:', error);
        
        // 모든 락 해제 (예기치 않은 문제 발생 시 API 요청 플래그 초기화)
        const requestKey = `${filters.dateRange.startDate}_${filters.dateRange.endDate}_ALL`;
        sessionStorage.removeItem(`api_request_${requestKey}_in_progress`);
        
        if (isMounted) {
          setError('데이터 로딩 중 오류가 발생했습니다.');
        }
      }
    };
    
    // loadDashboardData 함수를 직접 호출
    loadDashboardData();
    
    // Cleanup function
    return () => {
      isMounted = false;
      // 컴포넌트 언마운트 시 진행 중인 API 요청 플래그 제거
      const requestKey = `${filters.dateRange.startDate}_${filters.dateRange.endDate}_ALL`;
      sessionStorage.removeItem(`api_request_${requestKey}_in_progress`);
      console.log('언마운트: API 요청 진행 중 플래그 제거');
    };
  }, [
    // 의존성 배열 최적화 - 날짜 필터 변경 시에만 API 호출
    filters.dateRange.startDate, 
    filters.dateRange.endDate,
    // 매장 선택 상태는 API 호출에 영향을 주지 않음 (클라이언트 측 필터링에만 사용)
    // 하지만 캐시된 데이터 필터링 로직에 사용되므로 포함
    showAllStores,
    selectedStores.join('-'),
    // 유틸리티 함수 의존성
    fetchApiData,
    setError,
    filterDataByStore,
    getKpiCacheKey,
    getDailySalesCacheKey,
    getProductSalesCacheKey, 
    getHourlySalesCacheKey,
    getTopPerformersCacheKey
  ]);
  
  // 드롭다운 외부 클릭 시 닫히도록 이벤트 리스너 추가
  useEffect(() => {
    function handleClickOutside(event) {
      const dropdown = document.getElementById('store-dropdown');
      const dropdownButton = document.querySelector('[data-dropdown-toggle]');
      
      if (dropdown && !dropdown.classList.contains('hidden') && 
          !dropdown.contains(event.target) && 
          (!dropdownButton || !dropdownButton.contains(event.target))) {
        dropdown.classList.add('hidden');
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Format currency
  const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return '-';
    return value.toLocaleString('ko-KR') + '원';
  };
  
  // Format hourly data for chart - 시간대별 매출 데이터 포맷 & 필터링 개선
  const formatHourlyData = useCallback(() => {
    console.log('시간대별 매출 원본 데이터:', {
      개수: hourlySales.length,
      샘플: hourlySales.slice(0, 2)
    });
    
    // 데이터가 없는 경우 24시간 빈 데이터 생성하여 반환
    if (!hourlySales || hourlySales.length === 0) {
      console.log('시간대별 매출 데이터 없음, 빈 데이터 생성');
      const emptyData = [];
      
      // 선택된 매장이 있는 경우 그 매장명으로, 아니면 '전체'로 빈 데이터 생성
      const storeName = !showAllStores && selectedStores.length > 0 ? selectedStores[0] : '전체';
      
      // 0시~23시까지 빈 데이터 생성
      for (let i = 0; i < 24; i++) {
        emptyData.push({
          hour: `${i}시`,
          매출: 0,
          고객수: 0,
          매장: storeName,
          raw_hour: i
        });
      }
      
      console.log('빈 시간대별 데이터 생성 완료:', emptyData.length);
      return emptyData;
    }
    
    // 매장 필드명 확인 - 'store_name'이 없을 경우 다른 가능한 필드명 확인
    const storeNameField = hourlySales[0]?.store_name !== undefined ? 'store_name' : 'store';
    
    // 시간 필드명 확인 - 'hour'가 없을 경우 다른 가능한 필드명 확인
    const hourField = hourlySales[0]?.hour !== undefined ? 'hour' : 'hour_of_day';
    
    // 데이터 로깅
    console.log('시간대별 매출 필드 정보:', {
      매장필드: storeNameField,
      시간필드: hourField,
      필드목록: hourlySales.length > 0 ? Object.keys(hourlySales[0]) : [],
      매장목록: [...new Set(hourlySales.map(item => item[storeNameField]))].filter(Boolean)
    });
    
    // 1. 매장 필터링 - 캐싱된 전체 데이터에서 선택한 매장만 필터링
    let filteredData = hourlySales;
    
    if (!showAllStores && selectedStores.length > 0) {
      // 대소문자 무시 및 부분 일치를 통한 필터링 강화
      filteredData = hourlySales.filter(item => {
        if (!item[storeNameField]) return false;
        
        return selectedStores.some(store => {
          const storeInData = String(item[storeNameField]).toLowerCase();
          const selectedStore = String(store).toLowerCase();
          
          // 정확히 일치하거나 부분 일치
          return storeInData === selectedStore || 
                 storeInData.includes(selectedStore) || 
                 selectedStore.includes(storeInData);
        });
      });
      
      // 필터링 결과 로깅
      console.log('매장 필터링 후 데이터:', {
        필터링전: hourlySales.length,
        필터링후: filteredData.length,
        선택매장: selectedStores,
        데이터샘플: filteredData.slice(0, 2)
      });
      
      // 결과가 없으면 빈 데이터 생성하여 반환
      if (filteredData.length === 0) {
        console.warn('선택한 매장 데이터를 찾을 수 없음. 빈 데이터 생성');
        const emptyData = [];
        
        // 선택된 첫 번째 매장명으로 빈 데이터 생성
        const storeName = selectedStores[0];
        
        // 0시~23시까지 빈 데이터 생성
        for (let i = 0; i < 24; i++) {
          emptyData.push({
            hour: `${i}시`,
            매출: 0,
            고객수: 0,
            매장: storeName,
            raw_hour: i
          });
        }
        
        console.log('필터링 결과 없음, 빈 데이터 생성 완료:', emptyData.length);
        return emptyData;
      }
    }
    
    // 2. 데이터에 실제 매출이 있는지 확인 (모두 0인 경우 빈 데이터로 간주)
    const hasRealData = filteredData.some(item => {
      const totalSales = Number(item.total_sales || 0);
      return totalSales > 0;
    });
    
    if (!hasRealData) {
      console.log('시간대별 매출 데이터 모두 0, 빈 데이터 생성');
      const emptyData = [];
      
      // 선택된 매장이 있는 경우 그 매장명으로, 아니면 '전체'로 빈 데이터 생성
      const storeName = !showAllStores && selectedStores.length > 0 ? selectedStores[0] : '전체';
      
      // 0시~23시까지 빈 데이터 생성
      for (let i = 0; i < 24; i++) {
        emptyData.push({
          hour: `${i}시`,
          매출: 0,
          고객수: 0,
          매장: storeName,
          raw_hour: i
        });
      }
      
      console.log('빈 시간대별 데이터 생성 완료 (모두 0인 경우):', emptyData.length);
      return emptyData;
    }
    
    // 3. 데이터 변환
    const formattedData = filteredData.map(item => {
      // 확실한 숫자 변환 (NaN 방지)
      const hourValue = Number(item[hourField] || 0);
      const totalSales = Number(item.total_sales || 0);
      const customerCount = Number(item.transaction_count || item.customer_count || 0);
      
      return {
        hour: `${hourValue}시`,
        매출: totalSales,
        고객수: customerCount,
        매장: item[storeNameField] || '전체',
        raw_hour: hourValue // 정렬에 사용할 원시 숫자 값
      };
    });
    
    // 4. 시간대별로 정렬
    const sortedData = formattedData.sort((a, b) => a.raw_hour - b.raw_hour);
    
    // 변환된 데이터 로깅
    console.log('시간대별 매출 포맷 완료:', {
      최종건수: sortedData.length,
      샘플: sortedData.slice(0, 2)
    });
    
    // 5. 시간대별 데이터 완성도 확인 (0-23 모든 시간대가 있는지)
    const hours = new Set(sortedData.map(item => item.raw_hour));
    
    // 모든 시간대가 없는 경우 빈 시간대 추가
    if (hours.size < 24) {
      console.log('시간대 데이터 불완전, 누락된 시간대 추가');
      
      const completeData = [...sortedData];
      const storeName = !showAllStores && selectedStores.length > 0 ? selectedStores[0] : sortedData[0]?.매장 || '전체';
      
      // 누락된 시간대 추가
      for (let i = 0; i < 24; i++) {
        if (!hours.has(i)) {
          completeData.push({
            hour: `${i}시`,
            매출: 0,
            고객수: 0,
            매장: storeName,
            raw_hour: i
          });
        }
      }
      
      // 다시 정렬
      const finalData = completeData.sort((a, b) => a.raw_hour - b.raw_hour);
      console.log('완성된 시간대별 데이터:', finalData.length);
      return finalData;
    }
    
    return sortedData;
  }, [hourlySales, showAllStores, selectedStores]);
  
  // Format product data for pie chart - 개선 및 디버깅
  const formatProductData = useCallback(() => {
    console.log('상품별 판매 원본 데이터:', {
      개수: productSales.length,
      샘플: productSales.slice(0, 2)
    });
    
    // 데이터가 없는 경우 기본 더미 데이터 생성
    if (!productSales || productSales.length === 0) {
      console.log('상품별 매출 데이터 없음, 기본 더미 데이터 생성');
      
      // 선택된 매장이 있는 경우 그 매장명으로, 아니면 '전체'로 더미 데이터 생성
      const storeName = !showAllStores && selectedStores.length > 0 ? selectedStores[0] : '전체';
      
      // 기본 상품 목록으로 더미 데이터 생성
      const dummyData = [
        { name: '우유식빵', value: 0, quantity: 0, store: storeName },
        { name: '단팥빵', value: 0, quantity: 0, store: storeName },
        { name: '크로와상', value: 0, quantity: 0, store: storeName },
        { name: '쇼콜라', value: 0, quantity: 0, store: storeName },
        { name: '바게트', value: 0, quantity: 0, store: storeName },
        { name: '치아바타', value: 0, quantity: 0, store: storeName }
      ];
      
      console.log('기본 더미 데이터 생성 완료:', dummyData.length);
      return dummyData;
    }
    
    // 매장 필드명 확인 - 'store_name'이 없을 경우 다른 가능한 필드명 확인
    const storeNameField = productSales[0]?.store_name !== undefined ? 'store_name' : 'store';
    
    // 필드 정보 로깅
    console.log('상품별 매출 필드 정보:', {
      매장필드: storeNameField,
      필드목록: productSales.length > 0 ? Object.keys(productSales[0]) : [],
      매장목록: [...new Set(productSales.map(item => item[storeNameField]))].filter(Boolean)
    });
    
    // 1. 매장 필터링 - 캐싱된 전체 데이터에서 선택한 매장만 필터링
    let filteredData = productSales;
    
    if (!showAllStores && selectedStores.length > 0) {
      // 대소문자 무시 및 부분 일치를 통한 필터링 강화
      filteredData = productSales.filter(item => {
        if (!item[storeNameField]) return false;
        
        return selectedStores.some(store => {
          const storeInData = String(item[storeNameField]).toLowerCase();
          const selectedStore = String(store).toLowerCase();
          
          // 정확히 일치하거나 부분 일치
          return storeInData === selectedStore || 
                 storeInData.includes(selectedStore) || 
                 selectedStore.includes(storeInData);
        });
      });
      
      // 필터링 결과 로깅
      console.log('상품 필터링 후 데이터:', {
        필터링전: productSales.length,
        필터링후: filteredData.length,
        선택매장: selectedStores,
        데이터샘플: filteredData.slice(0, 2)
      });
      
      // 결과가 없으면 더미 데이터 생성
      if (filteredData.length === 0) {
        console.warn('선택한 매장 데이터를 찾을 수 없음. 더미 데이터 생성');
        
        // 선택된 첫 번째 매장명으로 더미 데이터 생성
        const storeName = selectedStores[0];
        
        // 기본 상품 목록으로 더미 데이터 생성
        const dummyData = [
          { name: '우유식빵', value: 0, quantity: 0, store: storeName },
          { name: '단팥빵', value: 0, quantity: 0, store: storeName },
          { name: '크로와상', value: 0, quantity: 0, store: storeName },
          { name: '쇼콜라', value: 0, quantity: 0, store: storeName },
          { name: '바게트', value: 0, quantity: 0, store: storeName },
          { name: '치아바타', value: 0, quantity: 0, store: storeName }
        ];
        
        console.log('필터링 결과 없음, 더미 데이터 생성 완료:', dummyData.length);
        return dummyData;
      }
    }
    
    // 2. 데이터에 실제 매출이 있는지 확인 (모두 0인 경우 빈 데이터로 간주)
    const hasRealData = filteredData.some(item => {
      const totalSales = Number(item.total_sales || 0);
      return totalSales > 0;
    });
    
    if (!hasRealData) {
      console.log('상품별 매출 데이터 모두 0, 기본 더미 데이터 생성');
      
      // 선택된 매장이 있는 경우 그 매장명으로, 아니면 '전체'로 더미 데이터 생성
      const storeName = !showAllStores && selectedStores.length > 0 ? selectedStores[0] : '전체';
      
      // 기본 상품 목록으로 더미 데이터 생성
      const dummyData = [
        { name: '우유식빵', value: 0, quantity: 0, store: storeName },
        { name: '단팥빵', value: 0, quantity: 0, store: storeName },
        { name: '크로와상', value: 0, quantity: 0, store: storeName },
        { name: '쇼콜라', value: 0, quantity: 0, store: storeName },
        { name: '바게트', value: 0, quantity: 0, store: storeName },
        { name: '치아바타', value: 0, quantity: 0, store: storeName }
      ];
      
      console.log('기본 더미 데이터 생성 완료 (모두 0인 경우):', dummyData.length);
      return dummyData;
    }
    
    // 3. 매출액 기준으로 정렬하고 상위 6개만 선택
    filteredData.sort((a, b) => Number(b.total_sales || 0) - Number(a.total_sales || 0));
    
    // 상위 6개만 선택 (6개 미만인 경우 모두 사용)
    const topProducts = filteredData.slice(0, Math.min(6, filteredData.length));
    
    // 4. 데이터 포맷 변환
    const formattedData = topProducts.map(item => ({
      name: item?.product_name || '-',
      value: Number(item?.total_sales || 0),
      quantity: Number(item?.quantity || 0),
      store: item?.[storeNameField] || '전체'
    }));
    
    console.log('상품 차트 데이터 생성 완료:', {
      최종건수: formattedData.length,
      샘플: formattedData.slice(0, 2)
    });
    
    // 5. 데이터가 부족하면 더미 데이터로 채움
    if (formattedData.length < 3) {
      console.log('상품 데이터 부족, 더미 데이터 추가');
      
      const storeName = formattedData.length > 0 ? formattedData[0].store : 
                       (!showAllStores && selectedStores.length > 0 ? selectedStores[0] : '전체');
      
      // 기존 상품명 목록 (중복 방지)
      const existingNames = new Set(formattedData.map(item => item.name));
      
      // 기본 더미 상품 목록
      const dummyProducts = ['우유식빵', '단팥빵', '크로와상', '쇼콜라', '바게트', '치아바타'];
      
      // 필요한 추가 상품 수
      const requiredCount = Math.max(0, 6 - formattedData.length);
      
      // 중복되지 않는 더미 상품 추가
      let addedCount = 0;
      for (const product of dummyProducts) {
        // 이미 있는 상품이면 건너뜀
        if (existingNames.has(product)) continue;
        
        // 더미 상품 추가
        formattedData.push({
          name: product,
          value: 0,
          quantity: 0,
          store: storeName
        });
        
        addedCount++;
        // 필요한 개수만큼 추가했으면 종료
        if (addedCount >= requiredCount) break;
      }
      
      console.log('더미 데이터 추가 완료, 최종 개수:', formattedData.length);
    }
    
    return formattedData;
  }, [productSales, showAllStores, selectedStores]);

  // Prepare daily sales data with store information - 개선된 매장별 데이터 처리
  const prepareDailySalesChart = useCallback(() => {
    if (!dailySales || dailySales.length === 0) return [];
    
    // 준비 과정 로깅
    console.log('일별 매출 데이터 준비 시작:', {
      데이터건수: dailySales.length,
      샘플: dailySales.slice(0, 2),
      매장포함여부: dailySales.some(item => item.store_name)
    });
    
    // 매장별로 데이터 정리하기 위한 기본 구조
    const storeNames = new Set(); // 중복 없는 매장 이름 목록
    
    // 고유한 매장 이름 수집
    dailySales.forEach(item => {
      if (item.store_name) {
        storeNames.add(item.store_name);
      }
    });
    
    console.log('발견된 매장 목록:', Array.from(storeNames));
    
    // Group by date first to ensure all dates are represented
    const dateGroups = {};
    
    // 1. 날짜별 기본 구조 생성
    const allDates = new Set(dailySales.map(item => {
      const dateField = item.sales_date || item.date;
      return typeof dateField === 'string' ? dateField : dateField.toISOString().split('T')[0];
    }));
    
    // 2. 날짜를 기준으로 빈 데이터 프레임 만들기
    allDates.forEach(dateStr => {
      dateGroups[dateStr] = { date: dateStr };
      
      // 모든 매장에 대한 초기값 설정 (null로 설정)
      storeNames.forEach(storeName => {
        dateGroups[dateStr][`매출_${storeName}`] = null;
        dateGroups[dateStr][`고객수_${storeName}`] = null;
      });
      
      // 전체 합계에 대한 필드도 추가
      dateGroups[dateStr][`매출_전체`] = null;
      dateGroups[dateStr][`고객수_전체`] = null;
    });
    
    // 3. 실제 데이터로 채우기
    dailySales.forEach(item => {
      // 필드명 확인 (API 응답에 따라 다를 수 있음)
      const dateField = item.sales_date || item.date;
      
      if (!dateField) {
        console.warn('날짜 필드가 없는 데이터 항목:', item);
        return; // 날짜 필드가 없으면 건너뜀
      }
      
      // 날짜 형식 표준화
      const dateStr = typeof dateField === 'string' ? dateField : dateField.toISOString().split('T')[0];
      
      // 매장이름 결정 (store_name 필드가 없으면 '전체'로 처리)
      const storeName = item.store_name || '전체';
      
      // 해당 날짜/매장에 데이터 설정
      if (item.actual_sales > 0 || item.total_sales > 0) {
        const salesValue = item.actual_sales > 0 ? item.actual_sales : item.total_sales;
        dateGroups[dateStr][`매출_${storeName}`] = salesValue;
      }
      
      // 고객 수 데이터 추가
      if (item.transaction_count > 0) {
        dateGroups[dateStr][`고객수_${storeName}`] = item.transaction_count;
      }
    });
    
    // 4. 매장별 데이터가 모두 설정된 후, 각 날짜별로 모든 매장의 합계 계산
    Object.keys(dateGroups).forEach(dateStr => {
      let totalSales = 0;
      let totalCustomers = 0;
      
      // 모든 매장의 매출 합산
      storeNames.forEach(storeName => {
        if (dateGroups[dateStr][`매출_${storeName}`] > 0) {
          totalSales += dateGroups[dateStr][`매출_${storeName}`];
        }
        
        if (dateGroups[dateStr][`고객수_${storeName}`] > 0) {
          totalCustomers += dateGroups[dateStr][`고객수_${storeName}`];
        }
      });
      
      // 전체 합계 설정
      if (totalSales > 0) {
        dateGroups[dateStr][`매출_전체`] = totalSales;
      }
      
      if (totalCustomers > 0) {
        dateGroups[dateStr][`고객수_전체`] = totalCustomers;
      }
    });
    
    // Object를 배열로 변환
    const result = Object.values(dateGroups);
    
    // 날짜 정렬
    result.sort((a, b) => {
      // 문자열 날짜를 Date 객체로 변환하여 비교
      return new Date(a.date) - new Date(b.date);
    });
    
    // 디버깅 로그
    console.log('일별 매출 차트 데이터 준비 완료:', {
      데이터건수: result.length,
      샘플: result.slice(0, 2),
      사용가능매장목록: Array.from(storeNames)
    });
    
    return result;
  }, [dailySales]);
  
  // Generate lines for the daily sales chart based on selected stores - 개선됨
  const getDailySalesLines = useCallback(() => {
    const lines = [];
    const storeColors = {
      '전체': '#3498DB',
      '명동성당점': '#FF8C00',
      '몽핀점': '#2ECC71',
      '석촌점': '#9B59B6',
      '대구점': '#F1C40F',
      '광주점': '#E74C3C',
      '일산점': '#1ABC9C',
      '분당점': '#34495E'
    };
    
    // 1. 백엔드에서 반환된 데이터에서 사용 가능한 모든 매장 이름 추출
    const availableStores = new Set();
    
    if (dailySales && dailySales.length > 0) {
      dailySales.forEach(item => {
        if (item.store_name) {
          availableStores.add(item.store_name);
        }
      });
    }
    
    console.log('차트 라인 생성 - 데이터에서 추출한 사용 가능한 매장 목록:', Array.from(availableStores));
    
    // 2. 표시할 매장 결정 
    let visibleStores = [];
    
    if (showAllStores) {
      // 전체 모드: 전체 합계 데이터 + 각 매장 데이터 모두 표시
      visibleStores = ['전체', ...Array.from(availableStores).filter(s => s !== '전체')];
      console.log('모든 매장 표시 모드 - 표시할 매장 목록:', visibleStores);
    } else if (selectedStores.length > 0) {
      // 선택 모드: 선택된 매장들만 표시
      // 조건: 실제 데이터에 존재하는 매장만 필터링
      visibleStores = selectedStores.filter(store => 
        Array.from(availableStores).includes(store) || store === '전체'
      );
      console.log('선택된 매장 모드 - 표시할 매장 목록:', visibleStores);
    } else {
      // 기본값: 전체 데이터 표시
      visibleStores = ['전체'];
    }
    
    // 실제 데이터 포함 확인
    const chartData = prepareDailySalesChart();
    if (chartData.length > 0) {
      const sampleData = chartData[0];
      console.log('샘플 차트 데이터 키:', Object.keys(sampleData).filter(k => k.startsWith('매출_')));
    }
    
    // 3. 매장별 차트 라인 생성
    visibleStores.forEach((store, index) => {
      const salesKey = `매출_${store}`;
      const dataKey = salesKey; // 차트 데이터의 필드명과 일치해야 함
      
      // 차트 데이터에 해당 키가 있는지 확인
      const hasData = chartData.length > 0 && Object.keys(chartData[0]).includes(dataKey);
      if (!hasData && store !== '전체') {
        console.warn(`경고: "${store}" 매장의 데이터가 존재하지 않습니다. 키: ${dataKey}`);
        return; // 데이터가 없으면 라인 추가하지 않음
      }
      
      const color = storeColors[store] || `hsl(${index * 30}, 70%, 50%)`;
      lines.push({
        dataKey: dataKey,
        name: `${store} 매출`,
        color: color,
        // 이동평균 모드가 활성화된 경우만 추가
        showMovingAverage: showMovingAverage,
        movingAveragePeriod: 15
      });
    });
    
    console.log('최종 생성된 차트 라인:', lines);
    return lines;
  }, [selectedStores, showAllStores, dailySales, prepareDailySalesChart, showMovingAverage]);
  
  // 매장 비교 데이터 호출 (전체 매장/선택 여부 무관)
  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        // 기본 매장 (전체가 아닌 첫 번째 매장) 설정
        const defaultStore = filters.stores.find(s => s.id !== 'all')?.name;
        const targetStore = selectedStores.length > 0 ? selectedStores[0] : defaultStore;
        if (!targetStore) return;
        const cacheKey = `compare_${targetStore}_${filters.dateRange.startDate}_${filters.dateRange.endDate}`;
        const response = await fetchApiData(
          compareService,
          'getStoreComparison',
          {
            store_name: targetStore,
            start_date: filters.dateRange.startDate,
            end_date: filters.dateRange.endDate,
            benchmark_type: 'all'
          },
          cacheKey
        );
        setStoreComparison(response);
      } catch (e) {
        console.error('매장 비교 요청 실패:', e);
      }
    };
    // filters.stores 로드 후 항상 비교 데이터 호출
    if (filters.stores.length > 0) {
      fetchComparisonData();
    }
  }, [filters.dateRange.startDate, filters.dateRange.endDate, filters.stores, selectedStores.join('-')]);
  
  // 한글 매핑: 벤치마크 대상 및 지표명
  const benchmarkNamesKr = {
    all: '전체 매장 평균',
    top_25: '상위 25% 매장',
    bottom_25: '하위 25% 매장',
    similar: '유사 매장'
  };
  const metricNamesKr = {
    total_sales: '총 매출',
    avg_transaction: '객단가',
    discount_rate: '할인율',
    transaction_count: '거래 건수',
    avg_daily_sales: '일 평균 매출'
  };
  
  return (
    <div className="relative">
      {/* Coming Soon 오버레이 */}
      <ComingSoonOverlay 
        title="대시보드 페이지"
        subtitle="종합적인 매장 운영 현황을 한눈에 볼 수 있는 대시보드를 준비 중입니다"
        iconType="eye"
      />

      {/* 기존 페이지 컨텐츠 */}
      <div>
        {/* Store Selection - Dropdown Version */}
          <div className="flex justify-between items-center mb-4">
            <div></div>
          </div>
      
      {/* 전체 페이지 AI 분석 위젯 추가 */}
      <PageAnalysisWidget
        pageData={{
          kpiData,
          dailySales,
          hourlySales,
          productSales,
          topPerformers,
          storeComparison
        }}
        pageContext={{
          dateRange: `${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}`,
          selectedStores: showAllStores ? '전체 매장' : selectedStores.join(', ')
        }}
      />


      {/* KPI Cards */}
      {kpiData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <KPICard
            title="총 매출"
            value={typeof kpiData.total_sales === 'number' ? kpiData.total_sales : 0}
            previousValue={kpiData.previous_total_sales}
            formatter={formatCurrency}
            icon={<FiDollarSign size={18} />}
          />
          
          <KPICard
            title="방문 고객수"
            value={typeof kpiData.total_customers === 'number' ? kpiData.total_customers : 0}
            previousValue={kpiData.previous_total_customers}
            formatter={(val) => (typeof val === 'number' ? val.toLocaleString() + '명' : '-')}
            icon={<FiUsers size={18} />}
          />
          
          <KPICard
            title="할인율"
            value={typeof kpiData.discount_rate === 'number' ? kpiData.discount_rate : 0}
            previousValue={kpiData.previous_discount_rate}
            formatter={(val) => (typeof val === 'number' ? val.toFixed(1) + '%' : '-')}
            icon={<FiPercent size={18} />}
            trendIsPositive={false}
          />
        </div>
      )}

      {/* Store Comparison Chart */}
      {storeComparison && (
        <div className="bg-white rounded-panze shadow-panze p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-panze-dark">
              {storeComparison.store_name} vs {benchmarkNamesKr[storeComparison.benchmark_type]}
            </h2>
            <select
              value={storeComparison.store_name}
              onChange={e => {
                setShowAllStores(false);
                setSelectedStores([e.target.value]);
              }}
              className="border px-2 py-1 rounded text-sm"
            >
              {filters.stores.filter(s => s.id !== 'all').map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={storeComparison.metrics.length * 60}>
            <ReBarChart
              layout="vertical"
              data={storeComparison.metrics.map(m => ({
                metric: metricNamesKr[m.metric_name] || m.display_name,
                percent: m.percent_difference,
                // 색상 결정: 음수/양수/0
                fillColor:
                  m.percent_difference > 0
                    ? '#38BDF8' // 긍정(블루)
                    : m.percent_difference < 0
                    ? '#F87171' // 위험(레드)
                    : '#E5E7EB', // 중립(그레이)
              }))}
              margin={{ left: 120, right: 30, top: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" />
              <YAxis dataKey="metric" type="category" width={120} />
              <Tooltip formatter={value => `${value.toFixed(1)}%`} />
              <Bar dataKey="percent">
                {storeComparison.metrics.map((m, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={
                      m.percent_difference > 0
                        ? '#38BDF8'
                        : m.percent_difference < 0
                        ? '#F87171'
                        : '#E5E7EB'
                    }
                  />
                ))}
                <LabelList dataKey="percent" position="right" formatter={value => `${value.toFixed(1)}%`} />
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
          <div className="mt-4">
            {storeComparison.insights.map((insight, idx) => (
              <p key={idx} className="text-sm text-gray-700 mb-1">• {insight}</p>
            ))}
          </div>
          {/* AI 분석 위젯 추가 */}
          <ChartAnalysisWidget
            chartType="storeComparison"
            chartData={storeComparison.metrics.map(m => ({
              metric: metricNamesKr[m.metric_name] || m.metric_name,
              value: m.percent_difference
            }))}
            chartTitle={`${storeComparison.store_name} vs ${benchmarkNamesKr[storeComparison.benchmark_type]}`}
            chartContext={{
              dateRange: `${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}`,
              selectedStores: `${storeComparison.store_name} vs ${benchmarkNamesKr[storeComparison.benchmark_type]}`
            }}
          />
        </div>
      )}
      
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Trends Chart */}
        <div className="bg-white rounded-panze shadow-panze p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-panze-dark">일별 매출 추이</h2>
            
            {/* 이동평균보기 버튼 추가 - 개선된 UI */}
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  // 이동평균 버튼 클릭 시 동작 개선
                  if (!showMovingAverage) {
                    // 이동평균 켜기: 이동평균선만 표시
                    setShowMovingAverage(true);
                    setShowMovingAverageOnly(true);
                  } else {
                    // 이동평균 끄기: 원본 데이터선만 표시
                    setShowMovingAverage(false);
                    setShowMovingAverageOnly(false);
                  }
                }}
                className={`px-3 py-1 rounded-md text-sm transition-colors flex items-center ${
                  showMovingAverage 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="15일 이동평균선을 표시하고 원본 데이터선을 숨깁니다"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-4 h-4 mr-1"
                >
                  <path d="M3 10L7 14L13 8L17 12L21 8"></path>
                </svg>
                {showMovingAverage ? '이동평균 숨기기' : '이동평균 보기'}
              </button>
              
              {/* 원본/이동평균 토글 버튼 (이동평균이 켜져 있을 때만 표시) */}
              {showMovingAverage && (
                <button 
                  onClick={() => setShowMovingAverageOnly(!showMovingAverageOnly)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    !showMovingAverageOnly 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-200 text-gray-700'
                  }`}
                  title={showMovingAverageOnly ? "원본 데이터선도 함께 표시" : "이동평균선만 표시"}
                >
                  {showMovingAverageOnly ? '원본 데이터 표시' : '원본 데이터 숨기기'}
                </button>
              )}
            </div>
          </div>
          
          {dailySales.length > 0 && (
            <>
              <LineChart
                data={prepareDailySalesChart()}
                xDataKey="date"
                lines={getDailySalesLines()}
                connectNulls={true}  // null 값을 연결
                allowDecimals={false}  // Y축에 소수점 표시 방지
                fillEmptyValues={false}  // 비어있는 값을 0으로 채우지 않음
                showMovingAverageOnly={showMovingAverageOnly}  // 이동평균만 표시 모드
              />

              {/* AI 분석 위젯 추가 */}
              <ChartAnalysisWidget
                chartType="dailySales"
                chartData={prepareDailySalesChart()}
                chartTitle="일별 매출 추이"
                chartContext={{
                  dateRange: `${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}`,
                  selectedStores: showAllStores ? '전체 매장' : selectedStores.join(', '),
                  movingAverageEnabled: showMovingAverage
                }}
              />
            </>
          )}
        </div>
        
        {/* Hourly Sales Chart */}
        <div className="bg-white rounded-panze shadow-panze p-5">
          <h2 className="text-lg font-semibold mb-4 text-panze-dark">시간대별 매출</h2>
          {hourlySales.length > 0 && (
            <>
              <LineChart
                data={formatHourlyData()}
                xDataKey="hour"
                lines={[
                  { dataKey: '매출', name: '매출액', color: '#3498DB' },
                  { dataKey: '고객수', name: '고객수', color: '#FF8C00' },
                ]}
                connectNulls={true}
                allowDecimals={false}
              />

              {/* AI 분석 위젯 추가 */}
              <ChartAnalysisWidget
                chartType="hourlySales"
                chartData={formatHourlyData()}
                chartTitle="시간대별 매출"
                chartContext={{
                  dateRange: `${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}`,
                  selectedStores: showAllStores ? '전체 매장' : selectedStores.join(', ')
                }}
              />
            </>
          )}
          {/* 디버깅 정보 표시 - 개발 모드 */}
          {process.env.NODE_ENV === 'development' && hourlySales.length === 0 && (
            <div className="p-3 bg-red-50 text-red-600 rounded">
              <p className="font-semibold">시간대별 매출 데이터 없음</p>
              <p className="text-sm">선택된 매장: {selectedStores.join(', ') || '전체'}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Sales Bar Chart */}
        <div className="bg-white rounded-panze shadow-panze p-5">
          <h2 className="text-lg font-semibold mb-4 text-panze-dark">상품별 매출</h2>
          {productSales.length > 0 && formatProductData().length > 0 && (
            <>
              <BarChart
                data={(formatProductData() || []).map(item => ({
                  product: item.name || '',
                  매출: item.value || 0,
                  수량: (item.quantity || 0) * 10000, // 스케일링하여 같은 차트에 표시
                  매장: item.store || '전체',
                }))}
                xDataKey="product"
                barDataKey="매출"
                barName="매출액"
                secondaryDataKey="수량"
                secondaryBarName="판매 수량"
                layout="vertical"
              />

              {/* AI 분석 위젯 추가 */}
              <ChartAnalysisWidget
                chartType="productSales"
                chartData={formatProductData()}
                chartTitle="상품별 매출"
                chartContext={{
                  dateRange: `${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}`,
                  selectedStores: showAllStores ? '전체 매장' : selectedStores.join(', ')
                }}
              />
            </>
          )}
          {/* 디버깅 정보 표시 - 개발 모드 */}
          {process.env.NODE_ENV === 'development' && (productSales.length === 0 || formatProductData().length === 0) && (
            <div className="p-3 bg-red-50 text-red-600 rounded">
              <p className="font-semibold">상품별 매출 데이터 없음</p>
              <p className="text-sm">선택된 매장: {selectedStores.join(', ') || '전체'}</p>
              <p className="text-sm">원본 데이터 개수: {productSales.length}</p>
              <p className="text-sm">포맷 데이터 개수: {formatProductData().length}</p>
            </div>
          )}
        </div>
        
        {/* Product Sales Pie Chart */}
        <div className="bg-white rounded-panze shadow-panze p-5">
          <h2 className="text-lg font-semibold mb-4 text-panze-dark">상품 판매 비율</h2>
          {productSales.length > 0 && formatProductData().length > 0 && (
            <>
              <PieChart
                data={formatProductData()}
                dataKey="value"
                nameKey="name"
                formatter={formatCurrency}
                donut={true}
                labelPosition="inside"
                showPercent={true}
                showLabelName={false}
                labelFormatter={(value, name, props) => {
                  const percent = Math.round(props.percent * 100);
                  return `${percent}%`;
                }}
              />
              
              {/* AI 분석 위젯 추가 */}
              <ChartAnalysisWidget
                chartType="productDistribution"
                chartData={formatProductData()}
                chartTitle="상품 판매 비율"
                chartContext={{
                  dateRange: `${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}`,
                  selectedStores: showAllStores ? '전체 매장' : selectedStores.join(', ')
                }}
              />
            </>
          )}
          {/* 디버깅 정보 표시 - 개발 모드 */}
          {process.env.NODE_ENV === 'development' && (productSales.length === 0 || formatProductData().length === 0) && (
            <div className="p-3 bg-red-50 text-red-600 rounded">
              <p className="font-semibold">상품 판매 비율 데이터 없음</p>
              <p className="text-sm">선택된 매장: {selectedStores.join(', ') || '전체'}</p>
              <p className="text-sm">원본 데이터 개수: {productSales.length}</p>
              <p className="text-sm">포맷 데이터 개수: {formatProductData().length}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 상위 성과 매장 섹션 추가 */}
      {topPerformers && topPerformers.performers && topPerformers.performers.length > 0 && (
        <div className="bg-white rounded-panze shadow-panze p-5 mt-6">
          <h2 className="text-lg font-semibold mb-4 text-panze-dark">
            상위 성과 매장 ({topPerformers.metric_display_name})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순위
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    매장
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {topPerformers.metric_display_name}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topPerformers.performers.map((performer) => (
                  <tr key={`${performer.rank}-${performer.store_name}`} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        performer.rank <= 3 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                      } font-medium text-xs`}>
                        {performer.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {performer.store_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatCurrency(performer.metric_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            * 기간: {topPerformers.period}
          </div>
        </div>
      )}
      
      </div> {/* 기존 페이지 컨텐츠 닫는 태그 */}
    </div> {/* relative 컨테이너 닫는 태그 */}
  );
};

export default DashboardPage;