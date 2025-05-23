import axios from 'axios';

// Base URL for our API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// API 요청, 응답 로깅 설정
const loggerInterceptor = (config) => {
  // API 요청 상세 로깅
  console.log(`API 요청: ${config.method.toUpperCase()} ${config.url}`);
  console.log('요청 파라미터:', config.params || {});
  
  // 특별히 store_name 파라미터의 형태와 처리 방식을 로깅
  if (config.params && 'store_name' in config.params) {
    // 백엔드 API는 store_name 사용
    console.log(`store_name 파라미터 상세 정보:`, {
      값: config.params.store_name,
      타입: typeof config.params.store_name,
      배열여부: Array.isArray(config.params.store_name),
      내용: Array.isArray(config.params.store_name) ? config.params.store_name : '단일 값'
    });
  } 
  // 추가: store_names를 사용하는 코드가 있는 경우를 위한 로깅 및 수정
  else if (config.params && 'store_names' in config.params) {
    console.log(`store_names 파라미터 감지 - 이름 수정 필요:`, {
      기존값: config.params.store_names
    });
    
    // store_names를 store_name으로 변경
    config.params.store_name = config.params.store_names;
    delete config.params.store_names;
    
    console.log(`파라미터 수정 완료:`, {
      수정값: config.params.store_name
    });
  }
  
  // URL 쿼리스트링 확인 (파라미터가 직렬화된 결과)
  try {
    if (config.params) {
      const serializedParams = new URLSearchParams(config.params).toString();
      console.log('직렬화된 쿼리스트링:', serializedParams);
    }
  } catch (error) {
    console.warn('쿼리스트링 직렬화 중 오류:', error);
  }
  
  return config;
};

const loggerResponseInterceptor = (response) => {
  console.log(`API 응답: ${response.config.method.toUpperCase()} ${response.config.url}`, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: response.data,
  });
  return response;
};

const loggerErrorInterceptor = (error) => {
  console.error(`API 오류: ${error.config?.method?.toUpperCase() || 'UNKNOWN'} ${error.config?.url || 'UNKNOWN'}`, {
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    message: error.message,
  });
  return Promise.reject(error);
};

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 파라미터 직렬화 설정 개선 - store_name 처리 로직 추가
  paramsSerializer: params => {
    // 전처리: store_name 파라미터 처리
    const processedParams = { ...params };
    
    // store_name 파라미터가 배열인 경우 첫 번째 항목만 사용 (백엔드 호환성)
    if (processedParams.store_name && Array.isArray(processedParams.store_name)) {
      processedParams.store_name = processedParams.store_name[0];
      console.log('store_name 배열을 문자열로 변환:', processedParams.store_name);
    }
    
    // store_names를 store_name으로 변경 (호환성)
    if (processedParams.store_names && !processedParams.store_name) {
      processedParams.store_name = Array.isArray(processedParams.store_names) 
        ? processedParams.store_names[0] 
        : processedParams.store_names;
      delete processedParams.store_names;
      console.log('store_names를 store_name으로 변경:', processedParams.store_name);
    }
    
    // 파라미터 직렬화
    return new URLSearchParams(processedParams).toString();
  }
});

// 인터셉터 등록
api.interceptors.request.use(loggerInterceptor, loggerErrorInterceptor);
api.interceptors.response.use(loggerResponseInterceptor, loggerErrorInterceptor);

// API Services
export const salesService = {
  getDailySales: (params) => api.get('/api/sales/daily', { params }),
  getProductSales: (params) => api.get('/api/sales/products', { params }),
  getHourlySales: (params) => api.get('/api/sales/hourly', { params }),
  getHourlyProductSales: (params) => api.get('/api/sales/products/hourly', { params }),
  getPaymentTypes: (params) => api.get('/api/sales/payment_types', { params }),
  getSalesComparison: (params) => api.get('/api/sales/comparison', { params }),
};

export const kpiService = {
  getSummary: (params) => api.get('/api/kpi/summary', { params }),
  getTrends: (params) => api.get('/api/kpi/trends', { params }),
  getProductMetrics: (params) => api.get('/api/kpi/products', { params }),
  getCategoryMetrics: (params) => api.get('/api/kpi/categories', { params }),
};

export const storeService = {
  // 실제 데이터베이스에서 매장 목록을 가져오는 API
  getStoreList: () => api.get('/api/stores'),
  getStoreDetails: (id) => api.get(`/api/stores/${id}`),
  getStoreBenchmark: (id, params) => api.get(`/api/stores/${id}/benchmark`, { params }),
};

export const analyticsService = {
  getAnomalies: (params) => api.get('/api/analytics/anomalies', { params }),
  getCorrelations: (params) => api.get('/api/analytics/correlations', { params }),
  getPatterns: (params) => api.get('/api/analytics/patterns', { params }),
  getFactors: (params) => api.get('/api/analytics/factors', { params }),
  getForecast: (params) => api.get('/api/analytics/forecast', { params }),
};

export const compareService = {
  getStoresComparison: (params) => api.get('/api/compare/store', { params }),
  getStoreComparison: (params) => api.get('/api/compare/store', { params }),
  getBenchmark: (params) => api.get('/api/compare/benchmark', { params }),
  getFactors: (params) => api.get('/api/compare/factors', { params }),
  getBestPractices: (params) => api.get('/api/compare/best_practices', { params }),
  getTopPerformers: (params) => api.get('/api/compare/top_performers', { params }),
};

export const trendsService = {
  getForecast: (params) => api.get('/api/trends/forecast', { params }),
  getSeasonality: (params) => api.get('/api/trends/seasonality', { params }),
};

export const noticeService = {
  // 백엔드 notice 라우터는 "/api/notice/" 에 GET 시 전체 목록 반환
  getNotices: (params) => api.get('/api/notice', { params }),
  getNoticeById: (id) => api.get(`/api/notice/${id}`),
  createNotice: (data) => api.post('/api/notice', data),
  updateNotice: (id, data) => api.put(`/api/notice/${id}`, data),
  deleteNotice: (id) => api.delete(`/api/notice/${id}`),
};

export default api;