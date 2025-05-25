import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { salesService } from '../services/api';
import KpiCard from '../components/dashboard/KPICard';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import StoreSelector from '../components/common/StoreSelector';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import ReviewAnalysisSection from '../components/dashboard/ReviewAnalysisSection';
import DeltaBadge from '../components/common/DeltaBadge';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { BarChart as ReBarChart, Bar, LabelList } from 'recharts';
import CacheClearButton from '../components/common/CacheClearButton';
import LoadingPopup from '../components/common/LoadingPopup';

// 매장명 표시용 매핑
const storeDisplayNames = {
  "석촌점": "A지점",
  "명동점": "B지점", 
  "몽핀점": "C지점"
};

/**
 * 매장비교 페이지 (벤치마크 상/하위 25% 매장과 비교)
 * - 상위 25%: "상위25%"
 * - 하위 25%: "하위25%"
 * 본 페이지는 BlankPage 로직을 최대 재활용해, 선택 매장 vs 벤치마크 매장을 동일 레이아웃에서 보여준다.
 */

// 상위/하위 상수
const BENCHMARK_TOP = 'top';
const BENCHMARK_BOTTOM = 'bottom';

// API URL 설정
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const BenchmarkComparePage = () => {
  const { filters, updateFilters, stores, fetchApiData, setError } = useDashboard();
  const componentRef = useRef(null);
  const handleExportPdf = async () => {
    if (!componentRef.current) return;
    const canvas = await html2canvas(componentRef.current, { scrollY: -window.scrollY, scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('매장비교분석.pdf');
  };

  /* ----------------------------- 벤치마크 타입 ----------------------------- */
  const [benchmarkType, setBenchmarkType] = useState(BENCHMARK_TOP);
  
  // 사용자 탐색 유도를 위한 상태
  const [hasViewedBoth, setHasViewedBoth] = useState(false);
  const [viewedTypes, setViewedTypes] = useState(new Set([BENCHMARK_TOP])); // 초기 선택값 포함
  // DB 요청에는 실제 매장명 사용, UI에는 알리아스(label) 사용
  const fetchBenchmarkName = benchmarkType === BENCHMARK_TOP ? '명동점' : '몽핀점';
  const benchmarkLabel = benchmarkType === BENCHMARK_TOP ? '상위25%' : '하위25%';

  // default selected store: 석촌점
  const DEFAULT_STORE = '석촌점';
  const targetStore = filters.selectedStore || DEFAULT_STORE;
  // initialize selectedStore on mount
  useEffect(() => {
    if (!filters.selectedStore) updateFilters({ selectedStore: DEFAULT_STORE });
  }, []);

  // Load saved benchmark summary on mount
  useEffect(() => {
    fetch(`${API_URL}/api/summary/benchmark_summary`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.text();
      })
      .then(text => {
        setBenchmarkSummaryPage(text);
        setBenchmarkSummaryText(text);
      })
      .catch(() => {
        setBenchmarkSummaryPage('');
        setBenchmarkSummaryText('');
      });
  }, []);

  /* --------------------------- 스토어 선택 핸들러 -------------------------- */
  const handleStoreChange = (selectedStore) => {
    updateFilters({ selectedStore });
  };

  /* ---------------------- 데이터 상태 (선택/벤치마크) ---------------------- */
  const [dailyDataStore, setDailyDataStore] = useState([]);
  const [dailyDataTop, setDailyDataTop] = useState([]);
  const [dailyDataBottom, setDailyDataBottom] = useState([]);
  const [productDataStore, setProductDataStore] = useState([]);
  const [productDataBenchmark, setProductDataBenchmark] = useState([]);

  // 로딩 팝업 상태 추가
  const [showLoadingPopup, setShowLoadingPopup] = useState(true);

  /* --------------------------- 공통 파라미터 생성 -------------------------- */
  // pass store_name as array so Supabase in_ filter works
  const buildParams = (storeName) => ({
    start_date: filters.dateRange.startDate,
    end_date: filters.dateRange.endDate,
    store_name: [storeName],
  });

  /* ---------------------------- 데이터 패칭 로직 --------------------------- */
  useEffect(() => {
    const fetchBothStores = async () => {
      console.log('🚀 BenchmarkComparePage 데이터 패칭 시작 (캐시 비활성화)', { targetStore, fetchBenchmarkName });
      
      try {
        // 선택 매장 데이터
        const storeParams = buildParams(targetStore);
        
        // 선택 매장 일별 데이터 (캐시 없이 직접 호출)
        try {
          console.log('📊 선택 매장 일별 데이터 요청 시작:', storeParams);
          const response = await salesService.getDailySales(storeParams);
          const storeDaily = response.data;
          console.log('✅ 선택 매장 일별 데이터 응답:', storeDaily);
          setDailyDataStore(storeDaily || []);
        } catch (error) {
          console.error('❌ 선택 매장 일별 데이터 실패:', error);
          setDailyDataStore([]);
        }
        
        // 선택 매장 상품별 데이터 (캐시 없이 직접 호출)
        try {
          console.log('🛍️ 선택 매장 상품별 데이터 요청 시작:', { ...storeParams, limit: 50 });
          const response = await salesService.getProductSales({ ...storeParams, limit: 50 });
          const storeProd = response.data;
          console.log('✅ 선택 매장 상품별 데이터 응답:', storeProd);
          setProductDataStore(storeProd || []);
        } catch (error) {
          console.error('❌ 선택 매장 상품별 데이터 실패:', error);
          setProductDataStore([]);
        }

        // 상위25% 및 하위25% 벤치마크 매장 데이터
        const topName = '명동점';
        const bottomName = '몽핀점';
        const topParams = buildParams(topName);
        const bottomParams = buildParams(bottomName);
        
        // 상위25% 매장 일별 데이터 (캐시 없이 직접 호출)
        try {
          console.log('📊 상위25% 매장 일별 데이터 요청 시작:', topParams);
          const response = await salesService.getDailySales(topParams);
          const topDaily = response.data;
          console.log('✅ 상위25% 매장 일별 데이터 응답:', topDaily);
          setDailyDataTop(topDaily || []);
        } catch (error) {
          console.error('❌ 상위25% 매장 일별 데이터 실패:', error);
          setDailyDataTop([]);
        }
        
        // 하위25% 매장 일별 데이터 (캐시 없이 직접 호출)
        try {
          console.log('📊 하위25% 매장 일별 데이터 요청 시작:', bottomParams);
          const response = await salesService.getDailySales(bottomParams);
          const bottomDaily = response.data;
          console.log('✅ 하위25% 매장 일별 데이터 응답:', bottomDaily);
          setDailyDataBottom(bottomDaily || []);
        } catch (error) {
          console.error('❌ 하위25% 매장 일별 데이터 실패:', error);
          setDailyDataBottom([]);
        }

        // 벤치마크 매장 상품별 데이터 (현재 탭) (캐시 없이 직접 호출)
        const benchParams = buildParams(fetchBenchmarkName);
        
        try {
          console.log('🛍️ 벤치마크 매장 상품별 데이터 요청 시작:', { ...benchParams, limit: 50 });
          const response = await salesService.getProductSales({ ...benchParams, limit: 50 });
          const benchProd = response.data;
          console.log('✅ 벤치마크 매장 상품별 데이터 응답:', benchProd);
          setProductDataBenchmark(benchProd || []);
        } catch (error) {
          console.error('❌ 벤치마크 매장 상품별 데이터 실패:', error);
          setProductDataBenchmark([]);
        }

        console.log('🎉 BenchmarkComparePage 데이터 패칭 완료 (캐시 비활성화)');

      } catch (err) {
        console.error('💥 BenchmarkComparePage 전체 데이터 패칭 실패:', err);
        setError(err.toString());
      }
    };

    if (targetStore) fetchBothStores();
  }, [targetStore, filters.dateRange.startDate, filters.dateRange.endDate, fetchBenchmarkName, setError]);

  /* ------------------------------ 유틸 함수 ------------------------------ */
  const sumReducer = (arr, key) => arr.reduce((sum, item) => sum + (item[key] || 0), 0);
  const average = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const median = (arr) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  /* -------------------------- KPI 및 분포 계산 -------------------------- */
  const calcMetrics = (dailyData) => {
    const totalSales = sumReducer(dailyData, 'total_sales');
    const totalTx = sumReducer(dailyData, 'transaction_count');
    const avgList = dailyData.map((d) => d.avg_transaction_value || 0);
    return {
      totalSales,
      totalTx,
      avgTransaction: average(avgList),
      medianTransaction: median(avgList),
    };
  };

  const storeMetrics = useMemo(() => calcMetrics(dailyDataStore), [dailyDataStore]);
  const topMetrics = useMemo(() => calcMetrics(dailyDataTop), [dailyDataTop]);
  const bottomMetrics = useMemo(() => calcMetrics(dailyDataBottom), [dailyDataBottom]);
  // 현재 탭에 따른 벤치마크 메트릭
  const benchMetrics = useMemo(() => benchmarkType === BENCHMARK_TOP ? topMetrics : bottomMetrics, [benchmarkType, topMetrics, bottomMetrics]);
  // 벤치마크와 비교한 비율 데이터 생성
  const percentData = useMemo(() => {
    const metrics = [
      { metric: '총 매출', selected: storeMetrics.totalSales, bench: benchMetrics.totalSales },
      { metric: '결제수', selected: storeMetrics.totalTx, bench: benchMetrics.totalTx },
      { metric: '객단가 평균', selected: storeMetrics.avgTransaction, bench: benchMetrics.avgTransaction },
      { metric: '객단가 중앙값', selected: storeMetrics.medianTransaction, bench: benchMetrics.medianTransaction },
    ];
    return metrics.map(({ metric, selected, bench }) => {
      const percent = bench ? ((selected - bench) / bench) * 100 : 0;
      
      // 벤치마크 타입에 따른 색상 설정
      let fillColor;
      if (benchmarkType === BENCHMARK_TOP) {
        // 상위25%와 비교 - 푸른 계열
        fillColor = percent > 0 ? '#10B981' : percent < 0 ? '#EF4444' : '#6B7280';
      } else {
        // 하위25%와 비교 - 보라 계열  
        fillColor = percent > 0 ? '#8B5CF6' : percent < 0 ? '#F59E0B' : '#6B7280';
      }
      
      return { metric, percent, fillColor };
    });
  }, [storeMetrics, benchMetrics, benchmarkType]);
  const comparisonData = useMemo(() => [
    { metric: '총 매출', selected: storeMetrics.totalSales, top: topMetrics.totalSales, bottom: bottomMetrics.totalSales },
    { metric: '결제수', selected: storeMetrics.totalTx, top: topMetrics.totalTx, bottom: bottomMetrics.totalTx },
    { metric: '객단가 평균', selected: storeMetrics.avgTransaction, top: topMetrics.avgTransaction, bottom: bottomMetrics.avgTransaction },
    { metric: '객단가 중앙값', selected: storeMetrics.medianTransaction, top: topMetrics.medianTransaction, bottom: bottomMetrics.medianTransaction },
  ], [storeMetrics, topMetrics, bottomMetrics]);

  // 색상 및 스타일 변수
  const benchBgClass = benchmarkType === BENCHMARK_TOP ? 'bg-green-50' : 'bg-orange-50';
  const benchmarkColor = benchmarkType === BENCHMARK_TOP ? '#22C55E' : '#F97316';

  /* -------------------------- 벤치마크 종합 분석 함수 -------------------------- */
  
  // 벤치마크 비교 종합 분석 요청 함수 (페이지 전체 데이터 활용)
  const handleBenchmarkSummaryAnalysis = useCallback(async () => {
    if (!dailyDataStore.length || !dailyDataTop.length || !dailyDataBottom.length) {
      setBenchmarkSummaryError('분석할 데이터가 없습니다.');
      return;
    }

    setBenchmarkSummaryLoading(true);
    setBenchmarkSummaryError('');
    setBenchmarkSummaryResult('');

    try {
      // 페이지 전체 벤치마크 비교 데이터 준비
      const benchmarkData = {
        // 기본 정보
        targetStore: targetStore,
        benchmarkType: benchmarkType,
        benchmarkLabel: benchmarkLabel,
        benchmarkStoreName: fetchBenchmarkName,
        
        // KPI 메트릭 비교
        storeMetrics: storeMetrics,
        benchmarkMetrics: benchMetrics,
        topMetrics: topMetrics,
        bottomMetrics: bottomMetrics,
        
        // 일별 데이터 비교
        dailyComparison: {
          targetStore: dailyDataStore.map(item => ({
            date: item.date,
            totalSales: item.total_sales,
            transactionCount: item.transaction_count,
            avgTransactionValue: item.avg_transaction_value
          })),
          topStore: dailyDataTop.map(item => ({
            date: item.date,
            totalSales: item.total_sales,
            transactionCount: item.transaction_count,
            avgTransactionValue: item.avg_transaction_value
          })),
          bottomStore: dailyDataBottom.map(item => ({
            date: item.date,
            totalSales: item.total_sales,
            transactionCount: item.transaction_count,
            avgTransactionValue: item.avg_transaction_value
          }))
        },
        
        // 상품별 데이터 비교
        productComparison: {
          targetStoreProducts: productDataStore.slice(0, 10).map(item => ({
            productName: item.product_name,
            totalSales: item.total_sales,
            quantity: item.quantity,
            avgPrice: item.avg_price
          })),
          benchmarkStoreProducts: productDataBenchmark.slice(0, 10).map(item => ({
            productName: item.product_name,
            totalSales: item.total_sales,
            quantity: item.quantity,
            avgPrice: item.avg_price
          }))
        },
        
        // ROI 지표 비교
        roiComparison: {
          targetStore: {
            salesPerSqm: Math.round(storeMetrics.totalSales / 22),
            salesPerEmployee: Math.round(storeMetrics.totalSales / 4),
            laborCostRatio: Math.round((storeMetrics.totalSales / 12000000) * 100),
            area: 22,
            employees: 4,
            laborCost: 12000000
          },
          benchmarkStore: {
            salesPerSqm: Math.round(benchMetrics.totalSales / (benchmarkType === BENCHMARK_TOP ? 20 : 45)),
            salesPerEmployee: Math.round(benchMetrics.totalSales / (benchmarkType === BENCHMARK_TOP ? 4 : 6)),
            laborCostRatio: Math.round((benchMetrics.totalSales / (benchmarkType === BENCHMARK_TOP ? 14250000 : 15000000)) * 100),
            area: benchmarkType === BENCHMARK_TOP ? 20 : 45,
            employees: benchmarkType === BENCHMARK_TOP ? 4 : 6,
            laborCost: benchmarkType === BENCHMARK_TOP ? 14250000 : 15000000
          }
        },
        
        // 비교 분석용 퍼센트 데이터
        percentageComparison: percentData,
        
        // 기간 정보
        period: {
          startDate: filters.dateRange.startDate,
          endDate: filters.dateRange.endDate
        }
      };

      // 벤치마크 비교 종합 분석 API 호출
      const response = await fetch(`${API_URL}/api/ai/analyze-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_data: benchmarkData,
          context: {
            pageTitle: '매장 벤치마크 비교 종합 분석 리포트',
            analysisType: 'benchmark_comparison_comprehensive',
            userPrompt: `다음 매장 벤치마크 비교 데이터를 종합적으로 분석해주세요:

**분석 기간**: ${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}
**대상 매장**: ${targetStore}
**비교 기준**: ${benchmarkLabel} (${fetchBenchmarkName})

제공된 데이터:
1. 월간 주요 KPI 지표 비교 (총매출, 결제수, 객단가)
2. 일별 매출 및 결제 건수 추이 비교
3. 상품별 매출 및 판매량 포트폴리오 비교
4. ROI 지표 비교 (면적당 매출, 직원당 매출, 인건비 대비 매출)
5. 퍼센트 차이 분석

다음 관점에서 종합적이고 상세한 분석을 제공해주세요:

**1. 전반적인 경쟁력 평가**
- ${targetStore}의 ${benchmarkLabel} 대비 전반적 성과 평가
- 강점과 약점 영역 식별
- 경쟁력 수준 진단

**2. 핵심 성과 격차 분석**
- 매출, 결제수, 객단가 차이의 근본 원인
- 성과 격차가 발생하는 주요 요인
- 일별 추이에서 나타나는 패턴 차이

**3. 상품 전략 비교 분석**
- 인기 상품 포트폴리오 차이점
- 상품 믹스 전략의 차별화 요소
- 벤치마크 매장의 성공 상품 벤치마킹 포인트

**4. 운영 효율성 비교**
- 면적 활용도 및 공간 효율성
- 인력 운영 효율성 및 생산성
- 비용 대비 수익성 분석

**5. 구체적 개선 전략**
- ${benchmarkLabel} 수준에 도달하기 위한 단계별 개선 과제
- 즉시 실행 가능한 액션 아이템 (1-2개월)
- 중장기 전략적 개선 방안 (3-12개월)
- 벤치마크 매장 성공 요인의 적용 방안

**6. 리스크 및 기회 요인**
- 현재 성과 격차로 인한 리스크
- 개선을 통한 매출 증대 기회
- 벤치마킹을 통한 성장 잠재력

경영진이 즉시 실행할 수 있는 구체적이고 실용적인 벤치마킹 인사이트를 2000자 내외로 제공해주세요.`
          }
        })
      });

      if (!response.ok) {
        throw new Error(`분석 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      const analysisResult = result.analysis || '분석 결과를 받을 수 없습니다.';
      setBenchmarkSummaryResult(analysisResult);
      setBenchmarkSummaryText(analysisResult);

    } catch (error) {
      console.error('벤치마크 종합 분석 오류:', error);
      setBenchmarkSummaryError(`분석 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setBenchmarkSummaryLoading(false);
    }
  }, [dailyDataStore, dailyDataTop, dailyDataBottom, targetStore, benchmarkType, benchmarkLabel, 
      fetchBenchmarkName, storeMetrics, benchMetrics, topMetrics, bottomMetrics, 
      productDataStore, productDataBenchmark, percentData, filters]);

  // 벤치마크 분석 결과 저장 함수
  const handleBenchmarkSummarySave = () => {
    fetch(`${API_URL}/api/summary/benchmark_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: benchmarkSummaryText }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed');
        setBenchmarkSummaryPage(benchmarkSummaryText);
        setBenchmarkSummaryEditMode(false);
      })
      .catch(err => setError(err.toString()));
  };

  // 벤치마크 분석 편집 시작 함수
  const handleBenchmarkSummaryEdit = () => {
    setBenchmarkSummaryEditMode(true);
  };

  /* -------------------------- 상품 데이터 Top N -------------------------- */
  const topNProducts = (data, key, N = 20) => {
    return [...data].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, N);
  };

  // 도넛 차트용 색상 생성 함수
  const generateColors = (count, storeType = 'target') => {
    const mainBlue = [48, 127, 226]; // CWDF BLUE
    const lightBlue = [179, 221, 249]; // CWDF BLUE SOFT (가장 옅은 색으로 사용)
    const mainEmerald = [20, 160, 166]; // CWDF EMERALD
    const lightEmerald = [177, 228, 227]; // CWDF EMERALD SOFT (가장 옅은 색으로 사용)

    let colors = [];
    let baseColor = storeType === 'target' ? mainBlue : mainEmerald;
    let endColor = storeType === 'target' ? lightBlue : lightEmerald;

    if (count === 1) return [`rgb(${baseColor.join(',')})`];

    for (let i = 0; i < count; i++) {
      const ratio = i / (count - 1);
      const r = Math.round(baseColor[0] + (endColor[0] - baseColor[0]) * ratio);
      const g = Math.round(baseColor[1] + (endColor[1] - baseColor[1]) * ratio);
      const b = Math.round(baseColor[2] + (endColor[2] - baseColor[2]) * ratio);
      colors.push(`rgb(${r},${g},${b})`);
    }
    return colors;
  };

  // 도넛 차트 라벨 렌더링 함수
  const renderLabel = (entry) => {
    return `${entry.name}\n${entry.value.toLocaleString()}`;
  };

  // 매출액용 라벨 렌더링 함수
  const renderSalesLabel = (entry) => {
    return `${entry.name}\n${entry.value.toLocaleString()}원`;
  };

  // 판매건수용 라벨 렌더링 함수
  const renderQuantityLabel = (entry) => {
    return `${entry.name}\n${entry.value.toLocaleString()}건`;
  };

  // 전반적 경영 성과 요약 AI 분석 상태 추가
  const [summaryAiAnalysisLoading, setSummaryAiAnalysisLoading] = useState(false);
  const [summaryAiAnalysisResult, setSummaryAiAnalysisResult] = useState('');
  const [summaryAiAnalysisError, setSummaryAiAnalysisError] = useState('');
  const [summaryEditMode, setSummaryEditMode] = useState(false);

  // 벤치마크 비교 종합 분석 상태 추가 (독립적)
  const [benchmarkSummaryLoading, setBenchmarkSummaryLoading] = useState(false);
  const [benchmarkSummaryResult, setBenchmarkSummaryResult] = useState('');
  const [benchmarkSummaryError, setBenchmarkSummaryError] = useState('');
  const [benchmarkSummaryEditMode, setBenchmarkSummaryEditMode] = useState(false);
  const [benchmarkSummaryText, setBenchmarkSummaryText] = useState('');
  const [benchmarkSummaryPage, setBenchmarkSummaryPage] = useState(false);
  // 벤치마크 분석 접어두기 상태 추가
  const [benchmarkSummaryExpanded, setBenchmarkSummaryExpanded] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* BenchmarkComparePage 전용 기본 필터 설정
     - 목적: 페이지가 처음 로드되거나 매장 목록(stores) 정보가 갱신될 때
       기본 분석 기간(2025-02-01 ~ 2025-02-28)과 기본 매장(석촌점)을 강제로 적용해
       사용자가 다른 페이지에서 이동해 올 때 필터가 초기화되지 않는 문제 방지
     - BlankPage.js 의 동일 로직을 재사용하되, 필요 변수명만 맞춰 조정
  ---------------------------------------------------------------------- */
  useEffect(() => {
    // 매장 목록이 아직 준비되지 않았다면 대기
    if (!stores || stores.length === 0) return;

    const defaultDateRange = { startDate: '2025-02-01', endDate: '2025-02-28' };
    const defaultStore = '석촌점';

    // 석촌점이 실제 매장 목록에 존재할 때만 적용 (없으면 첫 번째 실매장 사용)
    const isStoreAvailable = stores.includes(defaultStore);
    const fallbackStore = stores.find((s) => s !== '전체') || defaultStore;

    const finalStore = isStoreAvailable ? defaultStore : fallbackStore;

    const needsUpdate =
      filters.dateRange.startDate !== defaultDateRange.startDate ||
      filters.dateRange.endDate !== defaultDateRange.endDate ||
      filters.selectedStore !== finalStore;

    if (needsUpdate) {
      updateFilters({
        dateRange: defaultDateRange,
        selectedStore: finalStore,
      });
    }
  }, [stores]);

  /* ------------------------------- 렌더링 ------------------------------- */
  return (
    <div ref={componentRef} className="px-4 py-6">
      {/* 페이지 제목 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">타 매장 비교 분석</h1>
      </div>

      {/* 벤치마크 선택 섹션 - 더 눈에 띄게 배치 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">비교 기준 선택</h2>
          
          {/* 탭 스타일의 버튼 그룹 */}
          <div className="bg-white rounded-lg p-1 shadow-sm">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium relative ${
                benchmarkType === BENCHMARK_TOP
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => {
                setBenchmarkType(BENCHMARK_TOP);
                const newViewedTypes = new Set(viewedTypes);
                newViewedTypes.add(BENCHMARK_TOP);
                setViewedTypes(newViewedTypes);
                if (newViewedTypes.size === 2) setHasViewedBoth(true);
              }}
            >
              <div className="flex items-center space-x-1.5">
                <span>📈</span>
                <span>상위 25%</span>
              </div>
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium relative ${
                benchmarkType === BENCHMARK_BOTTOM
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => {
                setBenchmarkType(BENCHMARK_BOTTOM);
                const newViewedTypes = new Set(viewedTypes);
                newViewedTypes.add(BENCHMARK_BOTTOM);
                setViewedTypes(newViewedTypes);
                if (newViewedTypes.size === 2) setHasViewedBoth(true);
              }}
            >
              <div className="flex items-center space-x-1.5">
                <span>📉</span>
                <span>하위 25%</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* 현재 선택된 비교 기준 설명 */}
        <div className="p-3 bg-white/80 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <span>
              {benchmarkType === BENCHMARK_TOP ? '📈' : '📉'}
            </span>
            <span>
              {benchmarkType === BENCHMARK_TOP ? (
                <span>
                  <strong>상위 25% 매장</strong>과 비교하여 성장 방향을 찾아보세요
                </span>
              ) : (
                <span>
                  <strong>하위 25% 매장</strong>과 비교하여 현재 우위점을 확인해보세요
                </span>
              )}
            </span>
          </div>
        </div>
      </div>


      {/* 벤치마크 비교 종합 요약 - 개선된 UI */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">📊 벤치마크 비교 종합 분석</h2>
          {!benchmarkSummaryPage && !benchmarkSummaryEditMode && (
            <button
              onClick={handleBenchmarkSummaryAnalysis}
              disabled={benchmarkSummaryLoading || !dailyDataStore.length}
              className={`px-4 py-2 rounded-md font-medium ${
                benchmarkSummaryLoading || !dailyDataStore.length
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 transition-colors'
              }`}
            >
              {benchmarkSummaryLoading ? '분석 중...' : '종합 비교 분석 시작'}
            </button>
          )}
          {(benchmarkSummaryPage || benchmarkSummaryEditMode) && (
            <div className="flex space-x-2">
              {!benchmarkSummaryEditMode && (
                <>
                  <button
                    onClick={handleBenchmarkSummaryEdit}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    편집
                  </button>
                  <button
                    onClick={() => setBenchmarkSummaryPage('')}
                    className="px-3 py-1 text-sm bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                  >
                    새 분석
                  </button>
                </>
              )}
              {benchmarkSummaryEditMode && (
                <>
                  <button
                    onClick={handleBenchmarkSummarySave}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setBenchmarkSummaryEditMode(false);
                      setBenchmarkSummaryText(benchmarkSummaryPage);
                    }}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          <p>선택 매장({storeDisplayNames[targetStore] || targetStore})과 {benchmarkLabel} 매장의 모든 비교 데이터를 종합하여 벤치마킹 인사이트를 제공합니다.</p>
        </div>

        {/* 분석 로딩 상태 */}
        {benchmarkSummaryLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">벤치마크 비교 데이터를 종합 분석하고 있습니다...</span>
          </div>
        )}

        {/* 분석 오류 메시지 */}
        {benchmarkSummaryError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">분석 오류</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{benchmarkSummaryError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 편집 모드 */}
        {benchmarkSummaryEditMode && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">벤치마크 비교 분석 내용 편집</label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 min-h-[400px] text-sm"
              value={benchmarkSummaryText}
              onChange={(e) => setBenchmarkSummaryText(e.target.value)}
              placeholder="벤치마크 비교 분석 내용을 입력하거나 수정하세요..."
            />
          </div>
        )}

        {/* 저장된 분석 결과 표시 */}
        {benchmarkSummaryPage && !benchmarkSummaryEditMode && (
          <div>
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h5 className="text-md font-semibold text-purple-800">벤치마크 비교 분석 결과</h5>
              </div>
              <div className="prose max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkBreaks]}
                  className="text-gray-700 leading-relaxed"
                >
                  {benchmarkSummaryExpanded 
                    ? benchmarkSummaryPage 
                    : benchmarkSummaryPage.split('\n').slice(0, 10).join('\n') + (benchmarkSummaryPage.split('\n').length > 10 ? '\n...' : '')
                  }
                </ReactMarkdown>
              </div>
              {benchmarkSummaryPage.split('\n').length > 10 && (
                <button
                  onClick={() => setBenchmarkSummaryExpanded(prev => !prev)}
                  className="mt-3 mx-auto block px-4 py-2 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 transition-colors"
                >
                  {benchmarkSummaryExpanded ? '접기' : '전체 분석 결과 보기'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 새로운 분석 결과 (아직 저장되지 않음) */}
        {benchmarkSummaryResult && !benchmarkSummaryLoading && !benchmarkSummaryPage && !benchmarkSummaryEditMode && (
          <div>
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6 mb-4">
              <div className="flex items-center mb-3">
                <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h5 className="text-md font-semibold text-purple-800">벤치마크 비교 분석 결과</h5>
              </div>
              <div className="prose max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkBreaks]}
                  className="text-gray-700 leading-relaxed"
                >
                  {benchmarkSummaryExpanded 
                    ? benchmarkSummaryResult 
                    : benchmarkSummaryResult.split('\n').slice(0, 15).join('\n') + (benchmarkSummaryResult.split('\n').length > 15 ? '\n...' : '')
                  }
                </ReactMarkdown>
              </div>
              {benchmarkSummaryResult.split('\n').length > 15 && (
                <button
                  onClick={() => setBenchmarkSummaryExpanded(prev => !prev)}
                  className="mt-3 mx-auto block px-4 py-2 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 transition-colors"
                >
                  {benchmarkSummaryExpanded ? '접기' : '전체 분석 결과 보기'}
                </button>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setBenchmarkSummaryEditMode(true)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                편집
              </button>
              <button
                onClick={handleBenchmarkSummarySave}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        )}

        {/* 초기 상태 안내 메시지 */}
        {!benchmarkSummaryResult && !benchmarkSummaryLoading && !benchmarkSummaryError && !benchmarkSummaryPage && !benchmarkSummaryEditMode && (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>종합 비교 분석을 시작하려면 위의 "종합 비교 분석 시작" 버튼을 클릭하세요.</p>
            <p className="text-sm mt-2">선택 매장과 벤치마크 매장의 모든 데이터를 종합하여 벤치마킹 인사이트를 제공합니다.</p>
          </div>
        )}
      </div>

      {/* 월간 KPI 카드 */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-6 text-center">월간 주요지표 비교</h2>
        
        {/* 테이블 헤더 */}
        <div className="grid gap-4 mb-4 pb-3 border-b border-gray-200" style={{ gridTemplateColumns: '120px 1fr 1fr 2fr' }}>
          <div className="text-lg font-bold text-gray-700 flex items-center justify-center">지표</div>
          <div className="text-lg font-bold text-gray-700 flex items-center justify-center">{storeDisplayNames[targetStore] || targetStore}</div>
          <div className="text-lg font-bold text-gray-700 flex items-center justify-center">{benchmarkLabel}</div>
          <div className="text-lg font-bold text-gray-700 flex items-center justify-center">차이</div>
        </div>

        {/* KPI 비교 행들 */}
        {[
          {
            label: '총 매출',
            selected: storeMetrics.totalSales,
            benchmark: benchMetrics.totalSales,
            formatter: (v) => `${v.toLocaleString()}원`,
            unit: '매출이'
          },
          {
            label: '총 결제수',
            selected: storeMetrics.totalTx,
            benchmark: benchMetrics.totalTx,
            formatter: (v) => `${v.toLocaleString()}건`,
            unit: '결제수가'
          },
          {
            label: '객단가 평균값',
            selected: storeMetrics.avgTransaction,
            benchmark: benchMetrics.avgTransaction,
            formatter: (v) => `${Math.round(v).toLocaleString()}원`,
            unit: '객단가가'
          },
          {
            label: '객단가 중앙값',
            selected: storeMetrics.medianTransaction,
            benchmark: benchMetrics.medianTransaction,
            formatter: (v) => `${Math.round(v).toLocaleString()}원`,
            unit: '객단가가'
          }
        ].map((item, index) => {
          const diff = item.selected - item.benchmark;
          const diffPercent = item.benchmark ? (diff / item.benchmark) * 100 : 0;
          const isPositive = diff > 0;
          
          // 네러티브 텍스트 생성
          const comparisonText = isPositive ? '많아요' : '적어요';
          const narrativeText = diff === 0 ? 
            `${benchmarkLabel} 매장과 동일해요` :
            `${benchmarkLabel} 매장과 비교하여 ${Math.abs(diffPercent).toFixed(1)}%만큼 ${item.unit} ${comparisonText}`;
          const absoluteText = diff === 0 ? 
            '' :
            `${item.formatter(Math.abs(diff))} 만큼 ${item.unit} ${comparisonText}`;
          
          return (
            <div key={index} className="grid gap-4 py-4 border-b border-gray-100" style={{ gridTemplateColumns: '120px 1fr 1fr 2fr' }}>
              {/* 지표 이름 */}
              <div className="text-lg font-medium text-gray-800 flex items-center justify-center">
                {item.label}
              </div>
              
              {/* 대상 매장 값 */}
              <div className="flex items-center justify-center">
                <div className="text-lg font-bold" style={{ color: 'rgb(48, 127, 226)' }}> {/* CWDF BLUE */}
                  {item.formatter(item.selected)}
                </div>
              </div>
              
              {/* 비교 매장 값 */}
              <div className="flex items-center justify-center">
                <div className={`text-lg font-bold`} style={{ color: benchmarkType === BENCHMARK_TOP ? 'rgb(20, 160, 166)' : 'rgb(255, 120, 101)' }}> {/* CWDF EMERALD or CWDF ORANGE */}
                  {item.formatter(item.benchmark)}
                </div>
              </div>
              
              {/* 차이 (네러티브 형태) */}
              <div className="flex items-center justify-center">
                <div className={`rounded-lg p-3 w-full`} style={{ backgroundColor: isPositive ? 'rgb(177, 228, 227)' : diff === 0 ? '#f3f4f6' : 'rgb(255, 207, 190)' }}> {/* CWDF EMERALD SOFT or CWDF ORANGE SOFT or gray */}
                  <div className={`leading-relaxed text-center`} style={{ color: isPositive ? 'rgb(15, 118, 110)' : diff === 0 ? '#374151' : 'rgb(194, 65, 12)' }}> {/* 더 진한 채도의 색상 */}
                    <div className="text-base font-semibold mb-1">{narrativeText}</div>
                    {absoluteText && <div className="text-sm font-medium">({absoluteText})</div>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 일별 매출 비교 라인차트 */}
      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold mb-2">일별 매출 비교</h2>
        <LineChart
          data={dailyDataStore.map((d, idx) => {
            const baseData = {
            date: d.date,
            [targetStore]: d.total_sales,
            };
            
            if (benchmarkType === BENCHMARK_TOP) {
              baseData['상위25%'] = dailyDataTop[idx]?.total_sales || 0;
            } else {
              baseData['하위25%'] = dailyDataBottom[idx]?.total_sales || 0;
            }
            
            return baseData;
          })}
          xDataKey="date"
          lines={[
            { dataKey: targetStore, name: storeDisplayNames[targetStore] || targetStore, color: 'rgb(48, 127, 226)' }, // CWDF BLUE
            ...(benchmarkType === BENCHMARK_TOP 
              ? [{ dataKey: '상위25%', name: '상위25%', color: 'rgb(20, 160, 166)' }] // CWDF EMERALD
              : [{ dataKey: '하위25%', name: '하위25%', color: 'rgb(255, 120, 101)' }] // CWDF ORANGE
            )
          ]}
        />
      </div>

      {/* 일별 결제 건수 비교 라인차트 */}
      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold mb-2">일별 결제 건수 비교</h2>
        <LineChart
          data={dailyDataStore.map((d, idx) => {
            const baseData = {
            date: d.date,
            [targetStore]: d.transaction_count,
            };
            
            if (benchmarkType === BENCHMARK_TOP) {
              baseData['상위25%'] = dailyDataTop[idx]?.transaction_count || 0;
            } else {
              baseData['하위25%'] = dailyDataBottom[idx]?.transaction_count || 0;
            }
            
            return baseData;
          })}
          xDataKey="date"
          lines={[
            { dataKey: targetStore, name: storeDisplayNames[targetStore] || targetStore, color: 'rgb(48, 127, 226)' }, // CWDF BLUE
            ...(benchmarkType === BENCHMARK_TOP 
              ? [{ dataKey: '상위25%', name: '상위25%', color: 'rgb(20, 160, 166)' }] // CWDF EMERALD
              : [{ dataKey: '하위25%', name: '하위25%', color: 'rgb(255, 120, 101)' }] // CWDF ORANGE
            )
          ]}
        />
      </div>

      {/* 상품별 매출 비교 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-md font-medium mb-2">{storeDisplayNames[targetStore] || targetStore} 상품별 매출</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={topNProducts(productDataStore, 'total_sales', 10).map((p, index) => ({
                    name: p.product_name,
                    value: p.total_sales,
            }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderSalesLabel}
                  innerRadius={85}
                  outerRadius={110}
                  labelRadius={130}
                  startAngle={90}
                  endAngle={-270}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {topNProducts(productDataStore, 'total_sales', 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={generateColors(10, 'target')[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value.toLocaleString()}원`, '매출액']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{storeDisplayNames[targetStore] || targetStore}</div>
                <div className="text-sm text-gray-600">매출 분석</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-md font-medium mb-2">{benchmarkLabel} 상품별 매출</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={topNProducts(productDataBenchmark, 'total_sales', 10).map((p, index) => ({
                    name: p.product_name,
                    value: p.total_sales,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderSalesLabel}
                  innerRadius={85}
                  outerRadius={110}
                  labelRadius={130}
                  startAngle={90}
                  endAngle={-270}
                  fill={benchmarkColor}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {topNProducts(productDataBenchmark, 'total_sales', 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={generateColors(10, 'benchmark')[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value.toLocaleString()}원`, '매출액']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{benchmarkLabel}</div>
                <div className="text-sm text-gray-600">매출 분석</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 상품별 판매건수 비교 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-md font-medium mb-2">{storeDisplayNames[targetStore] || targetStore} 상품별 판매건수</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={topNProducts(productDataStore, 'quantity', 10).map((p, index) => ({
                    name: p.product_name,
                    value: p.quantity,
            }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderQuantityLabel}
                  innerRadius={85}
                  outerRadius={110}
                  labelRadius={130}
                  startAngle={90}
                  endAngle={-270}
                  fill="#10B981"
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {topNProducts(productDataStore, 'quantity', 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={generateColors(10, 'target')[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value.toLocaleString()}건`, '판매건수']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{storeDisplayNames[targetStore] || targetStore}</div>
                <div className="text-sm text-gray-600">판매건수 분석</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-md font-medium mb-2">{benchmarkLabel} 상품별 판매건수</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={topNProducts(productDataBenchmark, 'quantity', 10).map((p, index) => ({
                    name: p.product_name,
                    value: p.quantity,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderQuantityLabel}
                  innerRadius={85}
                  outerRadius={110}
                  labelRadius={130}
                  startAngle={90}
                  endAngle={-270}
                  fill={benchmarkType === BENCHMARK_TOP ? '#059669' : '#EA580C'}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {topNProducts(productDataBenchmark, 'quantity', 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={generateColors(10, 'benchmark')[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value.toLocaleString()}건`, '판매건수']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{benchmarkLabel}</div>
                <div className="text-sm text-gray-600">판매건수 분석</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 리뷰 분석 비교 섹션 */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-6">리뷰 분석 비교</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 선택 매장 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <ReviewAnalysisSection storeName={targetStore} />
          </div>
          {/* 벤치마크 매장 */}
          <div className={`p-4 rounded-lg shadow ${benchBgClass}`}>
            <ReviewAnalysisSection storeName={fetchBenchmarkName} />
          </div>
        </div>
      </div>

      {/* ROI 지표 비교 섹션 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-6">ROI 지표 비교</h2>
        
        {/* ROI 카드 비교 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 선택 매장 ROI */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">{storeDisplayNames[targetStore] || targetStore} ROI 지표</h3>
            <div className="grid grid-cols-1 gap-4">
              <div style={{ backgroundColor: 'rgb(179, 221, 249)' }} className="p-4 rounded-lg flex items-center space-x-4"> {/* CWDF BLUE SOFT */}
                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(48, 127, 226)" className="w-8 h-8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> {/* CWDF BLUE */}
                  <path d="M3 3h18v18H3V3z" />
                  <path d="M3 10h18" />
                  <path d="M10 3v18" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">면적당 매출</p>
                  <p className="text-2xl font-bold" style={{ color: 'rgb(48, 127, 226)' }}> {/* CWDF BLUE */}
                    {Math.round(storeMetrics.totalSales / 22).toLocaleString()}원/평
                  </p>
                </div>
              </div>
              <div style={{ backgroundColor: 'rgb(179, 221, 249)' }} className="p-4 rounded-lg flex items-center space-x-4"> {/* CWDF BLUE SOFT */}
                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(48, 127, 226)" className="w-8 h-8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> {/* CWDF BLUE */}
                  <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">직원 1인당 매출</p>
                  <p className="text-2xl font-bold" style={{ color: 'rgb(48, 127, 226)' }}> {/* CWDF BLUE */}
                    {Math.round(storeMetrics.totalSales / 4).toLocaleString()}원/인
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 벤치마크 매장 ROI */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">{benchmarkLabel} ROI 지표</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className={`p-4 rounded-lg flex items-center space-x-4`} style={{backgroundColor: benchmarkType === BENCHMARK_TOP ? 'rgb(177, 228, 227)' : 'rgb(255, 207, 190)'}}> {/* CWDF EMERALD SOFT or CWDF ORANGE SOFT */}
                <svg viewBox="0 0 24 24" fill="none" stroke={benchmarkType === BENCHMARK_TOP ? 'rgb(20, 160, 166)' : 'rgb(255, 120, 101)'} className={`w-8 h-8`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> {/* CWDF EMERALD or CWDF ORANGE */}
                  <path d="M3 3h18v18H3V3z" />
                  <path d="M3 10h18" />
                  <path d="M10 3v18" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">면적당 매출</p>
                  <p className={`text-2xl font-bold`} style={{color: benchmarkType === BENCHMARK_TOP ? 'rgb(20, 160, 166)' : 'rgb(255, 120, 101)'}}> {/* CWDF EMERALD or CWDF ORANGE */}
                    {Math.round(benchMetrics.totalSales / (benchmarkType === BENCHMARK_TOP ? 20 : 45)).toLocaleString()}원/평
                  </p>
                </div>
              </div>
              <div className={`p-4 rounded-lg flex items-center space-x-4`} style={{backgroundColor: benchmarkType === BENCHMARK_TOP ? 'rgb(177, 228, 227)' : 'rgb(255, 207, 190)'}}> {/* CWDF EMERALD SOFT or CWDF ORANGE SOFT */}
                <svg viewBox="0 0 24 24" fill="none" stroke={benchmarkType === BENCHMARK_TOP ? 'rgb(20, 160, 166)' : 'rgb(255, 120, 101)'} className={`w-8 h-8`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> {/* CWDF EMERALD or CWDF ORANGE */}
                  <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">직원 1인당 매출</p>
                  <p className={`text-2xl font-bold`} style={{color: benchmarkType === BENCHMARK_TOP ? 'rgb(20, 160, 166)' : 'rgb(255, 120, 101)'}}> {/* CWDF EMERALD or CWDF ORANGE */}
                    {Math.round(benchMetrics.totalSales / (benchmarkType === BENCHMARK_TOP ? 4 : 6)).toLocaleString()}원/인
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROI 비교 요약 테이블 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">상세 ROI 지표 요약</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-base font-semibold text-gray-600">매장명</th>
                <th className="px-4 py-3 text-base font-semibold text-gray-600">총매출</th>
                <th className="px-4 py-3 text-base font-semibold text-gray-600">면적</th>
                <th className="px-4 py-3 text-base font-semibold text-gray-600">직원 수</th>
                <th className="px-4 py-3 text-base font-semibold text-gray-600">월 인건비 (총)</th>
                <th className="px-4 py-3 text-base font-semibold text-gray-600">면적당 매출</th>
                <th className="px-4 py-3 text-base font-semibold text-gray-600">인건비 대비 매출</th>
                <th className="px-4 py-3 text-base font-semibold text-gray-600">직원 1인당 매출</th>
              </tr>
            </thead>
            <tbody>
              {/* 선택 매장 행 */}
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium" style={{ color: 'rgb(48, 127, 226)' }}>{storeDisplayNames[targetStore] || targetStore}</td> {/* CWDF BLUE */}
                <td className="px-4 py-3">{storeMetrics.totalSales.toLocaleString()}원</td>
                <td className="px-4 py-3">22평</td>
                <td className="px-4 py-3">4명</td>
                <td className="px-4 py-3">12,000,000원</td>
                <td className="px-4 py-3">{Math.round(storeMetrics.totalSales / 22).toLocaleString()}원/평</td>
                <td className="px-4 py-3">{Math.round((storeMetrics.totalSales / 12000000) * 100)}%</td>
                <td className="px-4 py-3">{Math.round(storeMetrics.totalSales / 4).toLocaleString()}원/인</td>
              </tr>
              {/* 벤치마크 매장 행 */}
              <tr className="border-b border-gray-100">
                <td className={`px-4 py-3 font-medium`} style={{ color: benchmarkType === BENCHMARK_TOP ? 'rgb(20, 160, 166)' : 'rgb(255, 120, 101)' }}> {/* CWDF EMERALD or CWDF ORANGE */}
                  {benchmarkLabel}
                </td>
                <td className="px-4 py-3">{benchMetrics.totalSales.toLocaleString()}원</td>
                <td className="px-4 py-3">{benchmarkType === BENCHMARK_TOP ? '20평' : '45평'}</td>
                <td className="px-4 py-3">{benchmarkType === BENCHMARK_TOP ? '4명' : '6명'}</td>
                <td className="px-4 py-3">{benchmarkType === BENCHMARK_TOP ? '14,250,000원' : '15,000,000원'}</td>
                <td className="px-4 py-3">
                  {Math.round(benchMetrics.totalSales / (benchmarkType === BENCHMARK_TOP ? 20 : 45)).toLocaleString()}원/평
                </td>
                <td className="px-4 py-3">
                  {Math.round((benchMetrics.totalSales / (benchmarkType === BENCHMARK_TOP ? 14250000 : 15000000)) * 100)}%
                </td>
                <td className="px-4 py-3">
                  {Math.round(benchMetrics.totalSales / (benchmarkType === BENCHMARK_TOP ? 4 : 6)).toLocaleString()}원/인
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </div>
      {/* PDF 추출 버튼 */}
      <div className="flex justify-center mt-6 mb-4">
        <button 
          onClick={handleExportPdf} 
          className="px-6 py-2 text-white font-bold rounded-md shadow hover:opacity-90 transition"
          style={{ backgroundColor: 'rgb(20, 160, 166)' }} // CWDF EMERALD
        >
          PDF로 추출
        </button>
      </div>
      <CacheClearButton />

      {/* 로딩 팝업 */}
      <LoadingPopup 
        isVisible={showLoadingPopup}
        message="매장 비교 데이터를 가져오고 있습니다"
        duration={350}
        onComplete={() => setShowLoadingPopup(false)}
      />
    </div>
  );
};

export default BenchmarkComparePage; 