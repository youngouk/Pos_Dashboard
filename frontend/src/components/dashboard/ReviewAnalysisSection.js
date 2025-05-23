import { tr } from 'date-fns/locale';
import React, { useState } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useDashboard } from '../../contexts/DashboardContext';

// Mock data for review analysis
const reviewData = {
  all: {
    1: { totalReviews: 2390, avgRating: 4.48, medianRating: 4.8, ratingDist: [ { rating: 5, count: 1620 }, { rating: 4, count: 490 }, { rating: 3, count: 175 }, { rating: 2, count: 65 }, { rating: 1, count: 40 } ], sentimentDist: [ { type: '긍정', count: 1890 }, { type: '중립', count: 340 }, { type: '부정', count: 160 } ], summary: { 긍정: "겨울 시즌 인기 메뉴인 밤식빵과 밤파이가 모든 지점에서 높은 평가, 따뜻한 매장 분위기와 청결함이 좋다는 의견 다수.", 중립: "주말 혼잡도 높고 인기 메뉴 조기 품절 문제, 가격이 다소 높다는 의견 공통적으로 나타남.", 부정: "몽핀점의 관광객 증가로 인한 혼잡, 르빵 송파점의 오후 2시 밤식빵 출시 정책 관련 불만, 명동성당점 포장 시 빵이 식는 문제 지적." }, keywords: { 긍정: ['밤식빵','겨울 메뉴','따뜻함','인테리어','청결'], 중립: ['품절','가격','혼잡','대기','인기'], 부정: ['관광객','2시 출시','포장','신선도','혼잡'] } },
    2: { totalReviews: 2490, avgRating: 4.51, medianRating: 4.9, ratingDist: [ { rating: 5, count: 1720 }, { rating: 4, count: 485 }, { rating: 3, count: 180 }, { rating: 2, count: 65 }, { rating: 1, count: 40 } ], sentimentDist: [ { type: '긍정', count: 2000 }, { type: '중립', count: 320 }, { type: '부정', count: 170 } ], summary: { 긍정: "발렌타인데이 특별 메뉴와 초콜릿 디저트가 모든 지점에서 큰 인기, 특히 명동성당점의 친절한 서비스와 몽핀점의 분위기가 호평.", 중립: "특별한 날 예약 경쟁이 심화되고, 일부 메뉴 가격 인상에 대한 언급이 세 지점 모두에서 나타남.", 부정: "몽핀점의 일부 고객 매너 부족 문제, 르빵 송파점의 케이크 품질 일관성, 명동성당점의 서비스 지연 관련 불만 제기." }, keywords: { 긍정: ['발렌타인','초콜릿','특별 메뉴','분위기','선물'], 중립: ['예약','가격','대기시간','혼잡','인기 메뉴'], 부정: ['품절','서비스 지연','혼잡','대기','아쉬움'] } },
    3: { totalReviews: 2800, avgRating: 4.55, medianRating: 5.0, ratingDist: [ { rating: 5, count: 1970 }, { rating: 4, count: 545 }, { rating: 3, count: 195 }, { rating: 2, count: 54 }, { rating: 1, count: 36 } ], sentimentDist: [ { type: '긍정', count: 2300 }, { type: '중립', count: 356 }, { type: '부정', count: 144 } ], summary: { 긍정: "봄 시즌 딸기 메뉴와 통딸기 생크림 케이크가 전 지점에서 인기, 르빵 송파점의 딸기 케이크 품질과 몽핀점의 매장 리뉴얼이 특히 호평.", 중립: "주말 혼잡도 지속, 특히 딸기 디저트 예약 필수적이라는 의견과 일부 가격 인상에 대한 언급.", 부정: "딸기 품질 일관성 관련 불만이 공통적, 몽핀점의 매장 내 질서 문제와 르빵 송파점의 픽업 시간 엄격함에 대한 지적." }, keywords: { 긍정: ['딸기','봄','신메뉴','신선함','케이크'], 중립: ['주말','예약 필수','가격 인상','혼잡','대기'], 부정: ['딸기 품질','일관성','픽업 시간','소음','질서'] } }
  },
  '명동성당점': {
    1: { totalReviews: 950, avgRating: 4.62, medianRating: 5.0, ratingDist: [ { rating: 5, count: 680 }, { rating: 4, count: 170 }, { rating: 3, count: 60 }, { rating: 2, count: 25 }, { rating: 1, count: 15 } ], sentimentDist: [ { type: '긍정', count: 760 }, { type: '중립', count: 125 }, { type: '부정', count: 65 } ], summary: { 긍정: "겨울 시즌 한정 밤 파이와 따뜻한 음료가 인기, 매장 난방이 잘 되어있다는 평가.", 중립: "주말 대기 시간이 길고, 일부 인기 메뉴의 품절 문제 언급.", 부정: "추운 날씨로 인한 포장 시 빵이 차가워지는 문제, 일부 직원 서비스 불만." }, keywords: { 긍정: ['겨울 메뉴','따뜻함','밤 파이','아늑한 분위기','디저트'], 중립: ['대기시간','혼잡','가격','주말','인기메뉴'], 부정: ['포장','품절','서비스','차가움','혼잡'] } },
    2: { totalReviews: 980, avgRating: 4.68, medianRating: 5.0, ratingDist: [ { rating: 5, count: 720 }, { rating: 4, count: 165 }, { rating: 3, count: 55 }, { rating: 2, count: 25 }, { rating: 1, count: 15 } ], sentimentDist: [ { type: '긍정', count: 790 }, { type: '중립', count: 120 }, { type: '부정', count: 70 } ], summary: { 긍정: "발렌타인데이 특별 메뉴와 초콜릿 디저트가 큰 인기, 친절하고 세심한 서비스 호평.", 중립: "특별한 날 예약이 어렵고, 가격이 다소 높다는 의견 존재.", 부정: "인기 메뉴 조기 품절, 혼잡한 시간대 서비스 지연 문제 지적." }, keywords: { 긍정: ['발렌타인','초콜릿','특별 메뉴','선물','분위기'], 중립: ['예약','가격','대기시간','혼잡','기프트'], 부정: ['품절','서비스 지연','혼잡','대기','아쉬움'] } },
    3: { totalReviews: 1056, avgRating: 4.7, medianRating: 5.0, ratingDist: [ { rating: 5, count: 800 }, { rating: 4, count: 165 }, { rating: 3, count: 65 }, { rating: 2, count: 10 }, { rating: 1, count: 16 } ], sentimentDist: [ { type: '긍정', count: 850 }, { type: '중립', count: 155 }, { type: '부정', count: 51 } ], summary: { 긍정: "봄 시즌 딸기 메뉴와 신선한 재료를 활용한 신메뉴가 호평, 매장 인테리어 리뉴얼도 좋은 반응.", 중립: "주말 혼잡도가 높고, 일부 메뉴 가격 인상에 대한 언급.", 부정: "인기 딸기 디저트의 딸기 품질 일관성 부족, 일부 서비스 불만." }, keywords: { 긍정: ['딸기','봄','신메뉴','인테리어','신선함'], 중립: ['주말','가격 인상','혼잡','대기','예약'], 부정: ['딸기 품질','일관성','서비스','불만','혼잡'] } }
  },
  '르빵 송파점': {
    1: { totalReviews: 920, avgRating: 4.38, medianRating: 4.5, ratingDist: [ { rating: 5, count: 620 }, { rating: 4, count: 190 }, { rating: 3, count: 70 }, { rating: 2, count: 25 }, { rating: 1, count: 15 } ], sentimentDist: [ { type: '긍정', count: 710 }, { type: '중립', count: 150 }, { type: '부정', count: 60 } ], summary: { 긍정: "겨울 한정 밤 식빵과 군밤 파이가 인기, 따뜻한 매장 분위기와 청결함이 좋다는 평가.", 중립: "인기 메뉴 품절 빈번, 주말 혼잡도 높음, 가격이 다소 높다는 의견.", 부정: "오후 2시 밤식빵 출시 시간에 대한 불만, 일부 빵 신선도 문제 지적." }, keywords: { 긍정: ['밤식빵','군밤파이','따뜻함','청결','맛있어요'], 중립: ['품절','혼잡','가격','대기','인기'], 부정: ['2시 출시','신선도','대기','아쉬움','불만'] } },
    2: { totalReviews: 950, avgRating: 4.42, medianRating: 4.5, ratingDist: [ { rating: 5, count: 650 }, { rating: 4, count: 180 }, { rating: 3, count: 80 }, { rating: 2, count: 25 }, { rating: 1, count: 15 } ], sentimentDist: [ { type: '긍정', count: 750 }, { type: '중립', count: 140 }, { type: '부정', count: 60 } ], summary: { 긍정: "발렌타인데이 초콜릿 케이크와 특별 메뉴가 호평, 예약 시스템이 개선되어 편리하다는 의견.", 중립: "인기 메뉴 대기 시간 여전히 길고, 일부 메뉴 가격 인상에 대한 언급.", 부정: "특별한 날 예약 경쟁 심화, 일부 케이크 품질 일관성 부족 지적." }, keywords: { 긍정: ['초콜릿','발렌타인','예약 시스템','특별 메뉴','서비스'], 중립: ['대기 시간','가격 인상','혼잡','예약 경쟁','인기'], 부정: ['예약 어려움','품질 일관성','케이크','아쉬움','불만'] } },
    3: { totalReviews: 1108, avgRating: 4.46, medianRating: 5.0, ratingDist: [ { rating: 5, count: 760 }, { rating: 4, count: 230 }, { rating: 3, count: 80 }, { rating: 2, count: 28 }, { rating: 1, count: 10 } ], sentimentDist: [ { type: '긍정', count: 920 }, { type: '중립', count: 140 }, { type: '부정', count: 48 } ], summary: { 긍정: "봄 시즌 통딸기 생크림 케이크가 대히트, 신선한 딸기 품질과 친절한 서비스 호평.", 중립: "주말 대기 시간 여전히 길고, 케이크 예약 필수적이라는 의견.", 부정: "일부 딸기 상태 불균일, 생일 케이크 픽업 시간 엄격함에 대한 불만." }, keywords: { 긍정: ['딸기 케이크','신선함','봄','친절함','맛있어요'], 중립: ['대기 시간','예약 필수','가격','주말','혼잡'], 부정: ['딸기 상태','픽업 시간','엄격함','불균일','아쉬움'] } }
  },
  '몽핀점': {
    1: { totalReviews: 520, avgRating: 4.32, medianRating: 4.5, ratingDist: [ { rating: 5, count: 320 }, { rating: 4, count: 130 }, { rating: 3, count: 45 }, { rating: 2, count: 15 }, { rating: 1, count: 10 } ], sentimentDist: [ { type: '긍정', count: 420 }, { type: '중립', count: 65 }, { type: '부정', count: 35 } ], summary: { 긍정: "겨울 시즌 밤식빵이 인기, 넓은 매장과 고급스러운 인테리어, 커피 품질이 좋다는 평가.", 중립: "주차 공간이 다소 협소하고, 가격이 높다는 의견 존재.", 부정: "중국인 관광객 증가로 인한 혼잡, 일부 인기 메뉴 빠른 품절 문제 지적." }, keywords: { 긍정: ['밤식빵','인테리어','커피','넓은 매장','분위기'], 중립: ['주차','가격','혼잡','대기 시간','위치'], 부정: ['관광객','품절','혼잡','소음','불만'] } },
    2: { totalReviews: 560, avgRating: 4.35, medianRating: 4.5, ratingDist: [ { rating: 5, count: 350 }, { rating: 4, count: 140 }, { rating: 3, count: 45 }, { rating: 2, count: 15 }, { rating: 1, count: 10 } ], sentimentDist: [ { type: '긍정', count: 460 }, { type: '중립', count: 60 }, { type: '부정', count: 40 } ], summary: { 긍정: "발렌타인데이 특별 디저트와 분위기 좋은 매장 환경이 호평, 커피와 빵 품질 일관되게 좋음.", 중립: "인기 메뉴 대기 시간 길고, 매장 내 테이블 확보 어려움 언급.", 부정: "일부 고객 매너 부족으로 인한 불편, 테이블 사용 관련 갈등 지적." }, keywords: { 긍정: ['발렌타인','분위기','커피','빵','디저트'], 중립: ['대기 시간','테이블','혼잡','주말','주차'], 부정: ['고객 매너','테이블 갈등','소음','혼잡','불편'] } },
    3: { totalReviews: 636, avgRating: 4.37, medianRating: 4.5, ratingDist: [ { rating: 5, count: 410 }, { rating: 4, count: 150 }, { rating: 3, count: 50 }, { rating: 2, count: 16 }, { rating: 1, count: 10 } ], sentimentDist: [ { type: '긍정', count: 530 }, { type: '중립', count: 61 }, { type: '부정', count: 45 } ], summary: { 긍정: "봄 시즌 신메뉴와 공간 리뉴얼로 더 쾌적해진 환경, 더 넓어진 주차 공간에 대한 호평.", 중립: "주말 혼잡은 여전하고, 일부 시그니처 메뉴 가격 인상에 대한 언급.", 부정: "일부 고객층 증가로 인한 소음과 매장 내 질서 문제, 일부 직원 서비스 불만." }, keywords: { 긍정: ['봄 메뉴','리뉴얼','주차','쾌적함','커피'], 중립: ['주말 혼잡','가격 인상','대기','인기','예약'], 부정: ['소음','질서','서비스','혼잡','고객 매너'] } }
  }
};

const ratingColors = ['#F59E42', '#F7B731', '#F9D423', '#FDE68A', '#FCA5A5'];
const sentimentColors = { 긍정: 'rgb(20, 160, 166)', 중립: 'rgb(156, 163, 175)', 부정: 'rgb(255, 120, 101)' }; // CWDF EMERALD, 연한 회색, CWDF ORANGE

const sentimentGradients = {
  긍정: 'rgb(20, 160, 166)', // CWDF EMERALD
  중립: 'rgb(156, 163, 175)', // 연한 회색
  부정: 'rgb(255, 120, 101)', // CWDF ORANGE
};

const LightbulbIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-2">
    <circle cx="12" cy="12" r="10" fill="#fff" fillOpacity="0.15"/>
    <path d="M12 3a7 7 0 0 0-4.5 12.5c.3.3.5.7.5 1.1V18a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-1.4c0-.4.2-.8.5-1.1A7 7 0 0 0 12 3zm-1 15v-1h2v1h-2zm3-2H9v-1.4c0-.8-.3-1.5-.9-2A5 5 0 1 1 17 12c-.6.5-.9 1.2-.9 2V16z" fill="#fff" fillOpacity="0.8"/>
    <circle cx="12" cy="8.5" r="3.5" fill="#fff" fillOpacity="0.7"/>
  </svg>
);

// SVG icons for ROI infographics
const AreaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h18v18H3V3z" />
    <path d="M3 10h18" />
    <path d="M10 3v18" />
  </svg>
);

const PayrollIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1v22M5 4h14M5 10h14M5 16h14" />
  </svg>
);

const StaffIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

function ReviewAnalysisSection({ onExportPdf, storeName = null }) {
  const { filters } = useDashboard();
  const effectiveStore = storeName || filters.selectedStore || '매장 전체';
  
  // 매장명 매핑: 석촌점 -> 르빵 송파점
  const storeNameMapping = {
    '석촌점': '르빵 송파점',
    '명동점': '명동성당점'
  };
  
  const dataStoreKey = storeNameMapping[effectiveStore] || effectiveStore || 'all';
  const displayStore = effectiveStore;
  const month = new Date(filters.dateRange.startDate).getMonth() + 1;
  const reviewSummary = (reviewData[dataStoreKey] && reviewData[dataStoreKey][month])
    ? reviewData[dataStoreKey][month]
    : (reviewData['all'][month] || reviewData['all'][1]);
  // Mock ROI data
  const roiMock = {
    '매장 전체': { revenue: 237950605, area: 82, payroll: 36000000, staff: 13 },
    '명동점': { revenue: 113844555, area: 22, payroll: 12000000, staff: 4 },
    '석촌점': { revenue: 94286200, area: 15, payroll: 9000000, staff: 3 },
    '몽핀점': { revenue: 29819850, area: 45, payroll: 15000000, staff: 6 },
  };
  const roiData = roiMock[displayStore] || roiMock['매장 전체'];
  const perArea = roiData.area ? roiData.revenue / roiData.area : 0;
  const perPayrollRatio = roiData.payroll ? roiData.revenue / roiData.payroll : 0;
  const perStaff = roiData.staff ? roiData.revenue / roiData.staff : 0;

  // Calculate positive sentiment percentage for donut center
  const totalSentiment = reviewSummary.sentimentDist.reduce((sum, entry) => sum + entry.count, 0);
  const positiveCount = reviewSummary.sentimentDist.find(entry => entry.type === '긍정')?.count || 0;
  const positivePercent = totalSentiment ? Math.round((positiveCount / totalSentiment) * 100) : 0;

  // Prepare metrics for the selected store to display only one row per metric
  const metrics = [
    { label: '총매출', value: `${roiData.revenue.toLocaleString()}원` },
    { label: '면적', value: `${roiData.area}평` },
    { label: '직원 수', value: `${roiData.staff}명` },
    { label: '월 인건비 (총)', value: `${roiData.payroll.toLocaleString()}원` },
    { label: '면적당 매출', value: `${perArea.toLocaleString(undefined, { maximumFractionDigits: 0 })}원/평` },
    { label: '인건비 대비 매출', value: `${Math.round(perPayrollRatio * 100)}%` },
    { label: '직원 1인당 매출', value: `${perStaff.toLocaleString(undefined, { maximumFractionDigits: 0 })}원/인` },
  ];

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold mb-4">리뷰 분석 (LLM 기반)</h2>
      {/* 첫번째 라인: 리뷰수 및 평균 별점 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
          <div className="text-3xl font-bold text-panze-dark">
            {reviewSummary.totalReviews.toLocaleString()}
          </div>
          <div className="text-gray-600 mt-2">월간 총 리뷰수</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-bold text-yellow-500">
              {reviewSummary.avgRating.toFixed(2)}
            </span>
            <span className="text-lg text-gray-500">/ 5.0</span>
          </div>
          <div className="text-gray-600 mt-2">평균 별점</div>
          <div className="text-sm text-gray-400">
            중앙값: {reviewSummary.medianRating.toFixed(1)}
          </div>
        </div>
      </div>
      {/* 두번째 라인: 별점 분포 및 감성 분포 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 별점 분포 차트 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-md font-medium mb-2">별점 분포</h4>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsBarChart data={reviewSummary.ratingDist} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="rating" type="category" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={{ stroke: '#e2e8f0' }} />
              <YAxis tickFormatter={value => value.toLocaleString()} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={{ stroke: '#e2e8f0' }} />
              <Tooltip formatter={value => value.toLocaleString()} />
              <Bar dataKey="count" barSize={20}>
                {reviewSummary.ratingDist.map((entry, idx) => (
                  <Cell key={entry.rating} fill={ratingColors[idx]} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
        {/* 감정 분포 차트 */}
        <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
          <h4 className="text-md font-medium mb-2">감정 분포</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={reviewSummary.sentimentDist}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                labelLine={true}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {reviewSummary.sentimentDist.map((entry) => (
                  <Cell key={entry.type} fill={sentimentColors[entry.type]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} formatter={value => value} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* 인사이트 카드: 긍정, 중립, 부정 리뷰 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {['긍정', '중립', '부정'].map((type) => {
          const sentiment = reviewSummary.sentimentDist.find(e => e.type === type);
          const percent = totalSentiment ? Math.round((sentiment?.count || 0) / totalSentiment * 100) : 0;
          const gradient = sentimentGradients[type] || 'linear-gradient(135deg, #ddd 0%, #bbb 100%)';
          return (
            <div
              key={type}
              className="p-6 rounded-2xl shadow-md text-white relative overflow-hidden"
              style={{ background: gradient }}
            >
              <div className="flex items-center mb-2">
                <LightbulbIcon />
                <span className="tracking-wider font-semibold text-white/90 text-sm">{type} 인사이트</span>
              </div>
              <div className="text-4xl font-bold mb-2">{percent}%</div>
              <div className="text-lg mt-2 leading-relaxed font-medium drop-shadow-sm">
                {reviewSummary.summary[type]}
              </div>
            </div>
          );
        })}
      </div>

      {/* 키워드 태그 섹션 */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['긍정', '중립', '부정'].map((type) => (
            <div key={type} className="bg-white p-4 rounded-lg shadow">
              <div className="flex flex-wrap gap-2 justify-center">
                {(reviewSummary.keywords[type] || []).map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 rounded-full text-white font-medium text-[13px]"
                    style={{ backgroundColor: sentimentColors[type] }}
                  >
                    #{keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PDF 추출 버튼: 부정 인사이트 아래 위치 */}
      {onExportPdf && (
        <div className="flex justify-center mt-4 mb-6">
          <button
            onClick={onExportPdf}
            className="px-6 py-2 bg-green-600 text-white font-bold rounded-md shadow hover:bg-green-700 transition"
          >
            PDF로 추출
          </button>
        </div>
      )}
    </section>
  );
}

export default ReviewAnalysisSection; 