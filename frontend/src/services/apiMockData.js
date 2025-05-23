/**
 * 백엔드 API가 없는 상태에서 프론트엔드 개발을 위한 목업 데이터
 * 실제 데이터는 백엔드 API에서 제공됩니다.
 */

// 일별 매출 데이터
export const dailySalesMock = [];

// 제품별 매출 데이터
export const productSalesMock = [];

// 시간대별 매출 데이터
export const hourlySalesMock = [];

// 결제 방식별 매출 데이터
export const paymentTypesMock = [];

// KPI 요약 데이터
export const kpiSummaryMock = {};

// 매장 목록
export const storesMock = [
  { id: 'all', name: '전체' },
  { id: 'store-1', name: '명동점' },
  { id: 'store-2', name: '석촌점' },
  { id: 'store-3', name: '몽핀점' }
];

// 이상치 감지 데이터
export const anomaliesMock = {
  dates: [],
  values: [],
  anomalies: [],
  lower_bound: [],
  upper_bound: [],
};

// 공지사항 데이터
export const noticesMock = [];