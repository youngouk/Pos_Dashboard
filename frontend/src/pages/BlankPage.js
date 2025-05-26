import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { salesService } from '../services/api';
import KpiCard from '../components/dashboard/KPICard';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { FiDollarSign, FiShoppingCart, FiInfo } from 'react-icons/fi';
import StoreSelector from '../components/common/StoreSelector';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import ReviewAnalysisSection from '../components/dashboard/ReviewAnalysisSection';
import DeltaBadge from '../components/common/DeltaBadge';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import CacheClearButton from '../components/common/CacheClearButton';
import LoadingPopup from '../components/common/LoadingPopup';

// API URL 설정
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const StoreStatusAnalysisPage = () => {
  const { filters, updateFilters, stores, fetchApiData, setError } = useDashboard();
  const [markdownText, setMarkdownText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [dailyData, setDailyData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [hourlyProductData, setHourlyProductData] = useState([]);
  const [monthlyMarkdownText, setMonthlyMarkdownText] = useState('');
  const [monthlySavedText, setMonthlySavedText] = useState('');
  const [monthlyShowAll, setMonthlyShowAll] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [weeklyMarkdownText, setWeeklyMarkdownText] = useState('');
  const [weeklySavedText, setWeeklySavedText] = useState('');
  const [weeklyShowAll, setWeeklyShowAll] = useState(false);

  const [showTimeTooltip, setShowTimeTooltip] = useState(false);
  
  // AI 분석 상태 추가
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');
  const [aiAnalysisError, setAiAnalysisError] = useState('');
  
  // 상품별 AI 분석 상태 추가 (독립적)
  const [productAiAnalysisLoading, setProductAiAnalysisLoading] = useState(false);
  const [productAiAnalysisResult, setProductAiAnalysisResult] = useState('');
  const [productAiAnalysisError, setProductAiAnalysisError] = useState('');
  
  // 시간대별 AI 분석 상태 추가 (독립적)
  const [timeAiAnalysisLoading, setTimeAiAnalysisLoading] = useState(false);
  const [timeAiAnalysisResult, setTimeAiAnalysisResult] = useState('');
  const [timeAiAnalysisError, setTimeAiAnalysisError] = useState('');
  
  // 분석 결과 저장/편집 상태 추가
  const [analysisMarkdownText, setAnalysisMarkdownText] = useState('');
  const [analysisSavedText, setAnalysisSavedText] = useState('');
  const [analysisShowAll, setAnalysisShowAll] = useState(false);
  const [analysisEditMode, setAnalysisEditMode] = useState(false);
  
  // 상품별 분석 결과 저장/편집 상태 추가
  const [productAnalysisMarkdownText, setProductAnalysisMarkdownText] = useState('');
  const [productAnalysisSavedText, setProductAnalysisSavedText] = useState('');
  const [productAnalysisShowAll, setProductAnalysisShowAll] = useState(false);
  const [productAnalysisEditMode, setProductAnalysisEditMode] = useState(false);
  
  // 시간대별 분석 결과 저장/편집 상태 추가
  const [timeAnalysisMarkdownText, setTimeAnalysisMarkdownText] = useState('');
  const [timeAnalysisSavedText, setTimeAnalysisSavedText] = useState('');
  const [timeAnalysisShowAll, setTimeAnalysisShowAll] = useState(false);
  const [timeAnalysisEditMode, setTimeAnalysisEditMode] = useState(false);
  
  const componentRef = useRef(null);

  // 전반적 경영 성과 요약 AI 분석 상태 추가
  const [summaryAiAnalysisLoading, setSummaryAiAnalysisLoading] = useState(false);
  const [summaryAiAnalysisResult, setSummaryAiAnalysisResult] = useState('');
  const [summaryAiAnalysisError, setSummaryAiAnalysisError] = useState('');
  const [summaryEditMode, setSummaryEditMode] = useState(false);

  // 내 매장 상세 리포트 AI 분석 상태 추가
  const [detailReportAiAnalysisLoading, setDetailReportAiAnalysisLoading] = useState(false);
  const [detailReportAiAnalysisResult, setDetailReportAiAnalysisResult] = useState('');
  const [detailReportAiAnalysisError, setDetailReportAiAnalysisError] = useState('');
  const [detailReportEditMode, setDetailReportEditMode] = useState(false);
  const [detailReportMarkdownText, setDetailReportMarkdownText] = useState('');
  const [detailReportSavedText, setDetailReportSavedText] = useState('');
  const [detailReportShowAll, setDetailReportShowAll] = useState(false);

  // 로딩 팝업 상태 추가
  const [showLoadingPopup, setShowLoadingPopup] = useState(true);

  // BlankPage 전용 기본 필터 설정 (2월달, 석촌점)
  useEffect(() => {
    console.log('🎯 BlankPage 기본 필터 설정 시작');
    console.log('🎯 현재 stores 목록:', stores);
    console.log('🎯 현재 필터 상태:', filters);
    
    // 매장 목록이 로드되지 않았으면 대기
    if (!stores || stores.length === 0) {
      console.log('🎯 매장 목록이 아직 로드되지 않음, 대기 중...');
      return;
    }
    
    // 2025년 2월 1일 ~ 2월 28일로 설정
    const defaultDateRange = {
      startDate: '2025-02-01',
      endDate: '2025-02-28'
    };
    
    const defaultStore = '석촌점';
    
    // 석촌점이 매장 목록에 있는지 확인
    const isStoreAvailable = stores.includes(defaultStore);
    console.log('🎯 석촌점 매장 존재 여부:', isStoreAvailable);
    
    if (!isStoreAvailable) {
      console.log('🎯 석촌점이 매장 목록에 없음. 사용 가능한 매장:', stores);
      // 석촌점이 없으면 첫 번째 매장을 선택 (전체 제외)
      const availableStores = stores.filter(store => store !== '전체');
      if (availableStores.length > 0) {
        const fallbackStore = availableStores[0];
        console.log('🎯 대체 매장으로 설정:', fallbackStore);
        
        // 대체 매장으로 필터 업데이트
        updateFilters({
          dateRange: defaultDateRange,
          selectedStore: fallbackStore
        });
      } else {
        console.log('🎯 사용 가능한 매장이 없음');
      }
      return;
    }
    
    // 현재 필터와 다른 경우에만 업데이트
    const needsUpdate = 
      filters.dateRange.startDate !== defaultDateRange.startDate ||
      filters.dateRange.endDate !== defaultDateRange.endDate ||
      filters.selectedStore !== defaultStore;
    
    if (needsUpdate) {
      console.log('🎯 BlankPage 기본 필터 적용:', {
        dateRange: defaultDateRange,
        selectedStore: defaultStore
      });
      
      updateFilters({
        dateRange: defaultDateRange,
        selectedStore: defaultStore
      });
    } else {
      console.log('🎯 BlankPage 기본 필터가 이미 설정되어 있음');
    }
  }, [stores, updateFilters]); // stores와 updateFilters를 의존성에 추가

  // Load saved performance summary on mount
  useEffect(() => {
    fetch(`${API_URL}/api/summary/performance_summary`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.text();
      })
      .then(text => {
        setSavedText(text);
        setMarkdownText(text);
      })
      .catch(() => {
        setSavedText('');
        setMarkdownText('');
      });
  }, []);

  // Load saved monthly summary from server on mount
  useEffect(() => {
    fetch(`${API_URL}/api/summary/monthly_summary`)
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.text(); })
      .then(text => {
        setMonthlySavedText(text);
        setMonthlyMarkdownText(text);
      })
      .catch(() => {
        setMonthlySavedText('');
        setMonthlyMarkdownText('');
      });
  }, []);

  // Load saved weekly summary on mount
  useEffect(() => {
    fetch(`${API_URL}/api/summary/weekday_summary`)
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.text(); })
      .then(text => {
        setWeeklySavedText(text);
        setWeeklyMarkdownText(text);
      })
      .catch(() => {
        setWeeklySavedText('');
        setWeeklyMarkdownText('');
      });
  }, []);
  


  // Load saved analysis summary on mount
  useEffect(() => {
    fetch(`${API_URL}/api/summary/analysis_summary`)
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.text(); })
      .then(text => {
        setAnalysisSavedText(text);
        setAnalysisMarkdownText(text);
      })
      .catch(() => {
        setAnalysisSavedText('');
        setAnalysisMarkdownText('');
      });
  }, []);

  // Load saved product analysis summary on mount
  useEffect(() => {
    fetch(`${API_URL}/api/summary/product_analysis_summary`)
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.text(); })
      .then(text => {
        setProductAnalysisSavedText(text);
        setProductAnalysisMarkdownText(text);
      })
      .catch(() => {
        setProductAnalysisSavedText('');
        setProductAnalysisMarkdownText('');
      });
  }, []);

  // Load saved time analysis summary on mount
  useEffect(() => {
    fetch(`${API_URL}/api/summary/time_analysis_summary`)
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.text(); })
      .then(text => {
        setTimeAnalysisSavedText(text);
        setTimeAnalysisMarkdownText(text);
      })
      .catch(() => {
        setTimeAnalysisSavedText('');
        setTimeAnalysisMarkdownText('');
      });
  }, []);

  // Load saved detail report summary on mount
  useEffect(() => {
    fetch(`${API_URL}/api/summary/detail_report_summary`)
      .then(res => { if (!res.ok) throw new Error('Not found'); return res.text(); })
      .then(text => {
        setDetailReportSavedText(text);
        setDetailReportMarkdownText(text);
      })
      .catch(() => {
        setDetailReportSavedText('');
        setDetailReportMarkdownText('');
      });
  }, []);

  const handleStoreChange = (selectedStore) => {
    updateFilters({ selectedStore });
  };

  const handleMonthlySave = () => {
    fetch(`${API_URL}/api/summary/monthly_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: monthlyMarkdownText }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed');
        setMonthlySavedText(monthlyMarkdownText);
      })
      .catch(err => setError(err.toString()));
  };

  // Save weekly summary
  const handleWeeklySave = () => {
    fetch(`${API_URL}/api/summary/weekday_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: weeklyMarkdownText }),
    })
      .then(res => { if (!res.ok) throw new Error('Save failed'); setWeeklySavedText(weeklyMarkdownText); })
      .catch(err => setError(err.toString()));
  };
  


  // Save analysis summary
  const handleAnalysisSave = () => {
    fetch(`${API_URL}/api/summary/analysis_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: analysisMarkdownText }),
    })
      .then(res => { 
        if (!res.ok) throw new Error('Save failed'); 
        setAnalysisSavedText(analysisMarkdownText);
        setAnalysisEditMode(false);
      })
      .catch(err => setError(err.toString()));
  };

  // Edit analysis summary
  const handleAnalysisEdit = () => {
    setAnalysisEditMode(true);
  };

  // Save product analysis summary
  const handleProductAnalysisSave = () => {
    fetch(`${API_URL}/api/summary/product_analysis_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify({ content: productAnalysisMarkdownText }),
    })
      .then(res => { 
        if (!res.ok) throw new Error('Save failed'); 
        setProductAnalysisSavedText(productAnalysisMarkdownText);
        setProductAnalysisEditMode(false);
      })
      .catch(err => setError(err.toString()));
  };

  // Edit product analysis summary
  const handleProductAnalysisEdit = () => {
    setProductAnalysisEditMode(true);
  };

  // Save time analysis summary
  const handleTimeAnalysisSave = () => {
    fetch(`${API_URL}/api/summary/time_analysis_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: timeAnalysisMarkdownText }),
    })
      .then(res => { 
        if (!res.ok) throw new Error('Save failed'); 
        setTimeAnalysisSavedText(timeAnalysisMarkdownText);
        setTimeAnalysisEditMode(false);
      })
      .catch(err => setError(err.toString()));
  };

  // Edit time analysis summary
  const handleTimeAnalysisEdit = () => {
    setTimeAnalysisEditMode(true);
  };

  const handleExportPdf = async () => {
    if (!componentRef.current) return;
    const element = componentRef.current;
    const canvas = await html2canvas(element, {
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('매장현황분석.pdf');
  };

  useEffect(() => {
    console.log('🚀 BlankPage useEffect 실행됨!');
    console.log('🚀 필터 변경 감지:', {
      selectedStore: filters.selectedStore,
      startDate: filters.dateRange.startDate,
      endDate: filters.dateRange.endDate,
      전체필터객체: filters
    });
    
    // 필터 변경 시 관련 캐시 무효화
    const cachePattern = `store_status_${filters.selectedStore || 'all'}_${filters.dateRange.startDate}_${filters.dateRange.endDate}`;
    console.log('🗑️ 캐시 무효화 패턴:', cachePattern);
    
    const params = {
      start_date: filters.dateRange.startDate,
      end_date: filters.dateRange.endDate,
      ...(filters.selectedStore ? { store_name: filters.selectedStore } : {})
    };
    console.log('🔍 API 호출 파라미터:', params);
    console.log('🔍 현재 필터 상태:', filters);
    const dailyKey = `store_status_daily_${filters.selectedStore || 'all'}_${filters.dateRange.startDate}_${filters.dateRange.endDate}`;
    const prodKey = `store_status_products_${filters.selectedStore || 'all'}_${filters.dateRange.startDate}_${filters.dateRange.endDate}`;
    fetchApiData(salesService, 'getDailySales', params, dailyKey)
      .then(data => {
        console.log('🔍 Daily API 원본 데이터:', data);
        console.log('🔍 선택된 매장:', filters.selectedStore);
        // 데이터가 존재하고 선택된 매장이 있을 때만 필터링
        if (data && Array.isArray(data) && data.length > 0) {
          let processedData;
          
          if (filters.selectedStore) {
            // 특정 매장 선택 시: 해당 매장 데이터만 필터링
            processedData = data.filter(item => item.store_name === filters.selectedStore);
          } else {
            // 전체 매장 선택 시: 일자별로 모든 매장 데이터 합산
            const aggregatedByDate = {};
            
            data.forEach(item => {
              const date = item.date;
              if (!aggregatedByDate[date]) {
                aggregatedByDate[date] = {
                  date: date,
                  total_sales: 0,
                  transaction_count: 0,
                  store_name: '전체 매장' // 표시용
                };
              }
              
              aggregatedByDate[date].total_sales += (item.total_sales || 0);
              aggregatedByDate[date].transaction_count += (item.transaction_count || 0);
            });
            
            // 객단가 계산 (매출 / 거래 수)
            processedData = Object.values(aggregatedByDate).map(item => ({
              ...item,
              avg_transaction_value: item.transaction_count > 0 
                ? item.total_sales / item.transaction_count 
                : 0
            }));
            
            // 날짜순 정렬
            processedData.sort((a, b) => new Date(a.date) - new Date(b.date));
          }
          
          console.log('🔍 처리된 Daily 데이터:', processedData);
          setDailyData(processedData);
        } else {
          console.log('🔍 Daily 데이터가 비어있음');
          setDailyData([]);
        }
      })
      .catch(err => setError(err.toString()));
    fetchApiData(salesService, 'getProductSales', { ...params, limit: 50 }, prodKey)
      .then(data => {
        console.log('🔍 Product API 원본 데이터:', data);
        console.log('🔍 선택된 매장:', filters.selectedStore);
        // 백엔드에서 이미 필터링된 데이터를 그대로 사용 (중복 필터링 제거)
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('🔍 Product 데이터 설정:', data);
          setProductData(data);
        } else {
          console.log('🔍 Product 데이터가 비어있음');
          setProductData([]);
        }
      })
      .catch(err => setError(err.toString()));
    // Fetch time-of-day (hourly) sales data
    const hourlyKey = `store_status_hourly_${filters.selectedStore || 'all'}_${filters.dateRange.startDate}_${filters.dateRange.endDate}`;
    fetchApiData(salesService, 'getHourlySales', params, hourlyKey)
      .then(data => {
        console.log('🔍 Hourly API 원본 데이터:', data);
        // 백엔드에서 이미 필터링된 데이터를 그대로 사용 (중복 필터링 제거)
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('🔍 Hourly 데이터 설정:', data);
          setHourlyData(data);
        } else {
          console.log('🔍 Hourly 데이터가 비어있음');
          setHourlyData([]);
        }
      })
      .catch(err => setError(err.toString()));
    // Fetch hourly product sales for top3 analysis
    const hourlyProdKey = `store_status_hourly_products_${filters.selectedStore || 'all'}_${filters.dateRange.startDate}_${filters.dateRange.endDate}`;
    fetchApiData(salesService, 'getHourlyProductSales', params, hourlyProdKey)
      .then(data => {
        console.log('🔍 Hourly Product API 원본 데이터:', data);
        console.log('🔍 API 파라미터:', params);
        console.log('🔍 선택된 매장:', filters.selectedStore);
        
        // 백엔드에서 이미 필터링된 데이터를 그대로 사용 (중복 필터링 제거)
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('🔍 Hourly Product 데이터 설정:', data);
          setHourlyProductData(data);
        } else {
          console.log('🔍 Hourly Product 데이터가 비어있음');
          setHourlyProductData([]);
        }
      })
      .catch(err => setError(err.toString()));
  }, [filters.selectedStore, filters.dateRange.startDate, filters.dateRange.endDate, fetchApiData, setError]);

  // aggregate metrics
  const totalMonthlySales = dailyData.reduce((sum, item) => sum + (item.total_sales || 0), 0);
  console.log('🔍 totalMonthlySales 계산 디버깅:', {
    dailyDataLength: dailyData.length,
    dailyDataSample: dailyData.slice(0, 3),
    totalMonthlySales: totalMonthlySales,
    dailyDataTotalSalesValues: dailyData.map(item => item.total_sales)
  });
  const totalMonthlyTransactions = dailyData.reduce((sum, item) => sum + (item.transaction_count || 0), 0);
  const avgList = dailyData.map(item => item.avg_transaction_value || 0);
  const filteredAvgList = dailyData
    .map(item => item.avg_transaction_value || 0)
    .filter(value => value >= 1000);
    
  const avgTransactionValue = filteredAvgList.length ? filteredAvgList.reduce((a, b) => a + b, 0) / filteredAvgList.length : 0;
  const medianTransactionValue = (() => {
    if (!filteredAvgList.length) return 0;
    const sorted = [...filteredAvgList].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  })();

  // monthly average values for day-of-week reference lines
  const monthlyAverageSales = dailyData.length ? totalMonthlySales / dailyData.length : 0;
  console.log('🔍 monthlyAverageSales 디버깅:', {
    dailyDataLength: dailyData.length,
    totalMonthlySales: totalMonthlySales,
    monthlyAverageSales: monthlyAverageSales,
    roundedValue: Math.round(monthlyAverageSales),
    formattedValue: Math.round(monthlyAverageSales).toLocaleString()
  });
  const monthlyAverageTransactions = dailyData.length ? totalMonthlyTransactions / dailyData.length : 0;
  // monthly median values for day-of-week reference lines
  const monthlyMedianSales = useMemo(() => {
    if (!dailyData.length) return 0;
    const arr = dailyData.map(item => item.total_sales || 0).sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }, [dailyData]);
  const monthlyMedianTransactions = useMemo(() => {
    if (!dailyData.length) return 0;
    const arr = dailyData.map(item => item.transaction_count || 0).sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }, [dailyData]);

  // 객단가 분포 데이터 (히스토그램) - 1,000원 이상만 사용
  const distributionData = useMemo(() => {
    const values = filteredAvgList.filter(v => typeof v === 'number');
    const bins = 20;
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = Math.ceil((max - min) / bins); // 정수로 반올림
    return Array.from({ length: bins }).map((_, i) => {
      const lower = min + i * binSize;
      const upper = i === bins - 1 ? max : lower + binSize;
      const count = values.filter(v => v >= lower && v < upper).length;
      const mid = Math.round((lower + upper) / 2); // 정수로 반올림
      return { value: mid, count };
    });
  }, [filteredAvgList]);

  // 요일별 지표 데이터 계산
  const dayOfWeekData = useMemo(() => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const dayIndexMap = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0 };
    const map = days.map(day => ({ day, salesSum: 0, ordersSum: 0, count: 0, avgList: [] }));
    
    dailyData.forEach(item => {
      const dayOfWeek = new Date(item.date).getDay();
      const dayName = Object.keys(dayIndexMap).find(key => dayIndexMap[key] === dayOfWeek);
      const idx = days.indexOf(dayName);
      if (idx !== -1) {
      map[idx].salesSum += item.total_sales || 0;
      map[idx].ordersSum += item.transaction_count || 0;
      map[idx].count += 1;
        // 1,000원 이상인 객단가만 포함
        if (item.avg_transaction_value != null && item.avg_transaction_value >= 1000) {
          map[idx].avgList.push(item.avg_transaction_value);
        }
      }
    });
    
    return map.map((d, index) => {
      const sales = d.count ? d.salesSum / d.count : 0;
      const orders = d.count ? d.ordersSum / d.count : 0;
      const avg = d.avgList.length ? d.avgList.reduce((a,b)=>a+b,0)/d.avgList.length : 0;
      const sorted = [...d.avgList].sort((a,b)=>a-b);
      const mid = Math.floor(sorted.length/2);
      const median = sorted.length ? (sorted.length%2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2) : 0;
      // 토요일(5), 일요일(6) 인덱스에 주말 색상 적용
      const isWeekend = index >= 5;
      return { 
        day: d.day, 
        sales, 
        orders, 
        avg, 
        median,
        fill: isWeekend ? 'rgb(255, 120, 101)' : 'rgb(20, 160, 166)' // 주말: CWDF ORANGE, 평일: CWDF EMERALD
      };
    });
  }, [dailyData]);

  // Top 25 products by sales
  const topSellingProducts = useMemo(() => {
    return [...productData]
      .sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
      .slice(0, 25);
  }, [productData]);

  // Top 25 products by quantity
  const topCountProducts = useMemo(() => {
    return [...productData]
      .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
      .slice(0, 25);
  }, [productData]);

  // FIRST_EDIT: Compute time-of-day metrics
  const avgHourlySales = useMemo(() => {
    if (!hourlyData.length) return 0;
    return hourlyData.reduce((sum, item) => sum + (item.total_sales || 0), 0) / hourlyData.length;
  }, [hourlyData]);

  const totalHourlyOrders = useMemo(() => {
    return hourlyData.reduce((sum, item) => sum + (item.transaction_count || 0), 0);
  }, [hourlyData]);

  const avgHourlyTransaction = useMemo(() => {
    if (!hourlyData.length) return 0;
    return hourlyData.reduce((sum, item) => sum + (item.avg_transaction_value || 0), 0) / hourlyData.length;
  }, [hourlyData]);

  const medianHourlyTransaction = useMemo(() => {
    if (!hourlyData.length) return 0;
    const values = hourlyData.map(item => item.avg_transaction_value || 0);
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }, [hourlyData]);

  // ADD: Define 4 time segments and aggregate hourly data into them for various metrics
  const timeSegments = useMemo(() => [
    { label: '09~12시', hours: [9, 10, 11] },
    { label: '12~15시', hours: [12, 13, 14] },
    { label: '15~18시', hours: [15, 16, 17] },
    { label: '18~21시', hours: [18, 19, 20] }
  ], []);

  const segmentData = useMemo(() => timeSegments.map(seg => {
    const entries = hourlyData.filter(item => seg.hours.includes(item.hour));
    const sumSales = entries.reduce((sum, item) => sum + (item.total_sales || 0), 0);
    const sumOrders = entries.reduce((sum, item) => sum + (item.transaction_count || 0), 0);
    const avgSales = entries.length ? sumSales / entries.length : 0;
    const avgOrders = entries.length ? sumOrders / entries.length : 0;
    const transValues = entries.map(item => item.avg_transaction_value || 0);
    const avgTrans = sumOrders ? sumSales / sumOrders : 0; // Weighted average 객단가
    const sortedVals = [...transValues].sort((a, b) => a - b);
    const m = Math.floor(sortedVals.length / 2);
    const medTrans = sortedVals.length ? (sortedVals.length % 2 ? sortedVals[m] : (sortedVals[m - 1] + sortedVals[m]) / 2) : 0;
    return {
      segment: seg.label,
      sumSales,
      sumOrders,
      avgSales,
      avgOrders,
      avgTrans,
      medTrans
    };
  }), [hourlyData, timeSegments]);

  const averageSalesData = useMemo(() => segmentData.map(d => ({ segment: d.segment, 평균매출: Math.round(d.avgSales) })), [segmentData]);
  const averageOrdersData = useMemo(() => segmentData.map(d => ({ segment: d.segment, 평균주문건수: Math.round(d.avgOrders) })), [segmentData]);
  const avgTransactionData = useMemo(() => segmentData.map(d => ({ segment: d.segment, 평균객단가: Math.round(d.avgTrans) })), [segmentData]);
  const medianTransactionData = useMemo(() => segmentData.map(d => ({ segment: d.segment, 중앙객단가: Math.round(d.medTrans) })), [segmentData]);
  const totalSalesSegmentData = useMemo(() => segmentData.map(d => ({ segment: d.segment, 총매출: Math.round(d.sumSales) })), [segmentData]);
  const totalOrdersSegmentData = useMemo(() => segmentData.map(d => ({ segment: d.segment, 총판매건수: Math.round(d.sumOrders) })), [segmentData]);

  // Compute top 5 products per time segment
  const segmentTopProducts = useMemo(() => {
    console.log('🔍 segmentTopProducts 계산 시작');
    console.log('🔍 hourlyProductData:', hourlyProductData);
    console.log('🔍 hourlyProductData 길이:', hourlyProductData.length);
    console.log('🔍 timeSegments:', timeSegments);
    
    return timeSegments.map(seg => {
      console.log(`🔍 ${seg.label} 시간대 처리 중...`);
      console.log(`🔍 ${seg.label} 시간대 hours:`, seg.hours);
      
      // Exclude '봉투' from top5 aggregation
      const entries = hourlyProductData.filter(item =>
        seg.hours.includes(item.hour) && item.product_name !== '봉투'
      );
      console.log(`🔍 ${seg.label} 필터링된 entries:`, entries);
      
      const agg = entries.reduce((acc, item) => {
        acc[item.product_name] = (acc[item.product_name] || 0) + item.quantity;
        return acc;
      }, {});
      console.log(`🔍 ${seg.label} 집계 결과:`, agg);
      
      const sorted = Object.entries(agg)
        .map(([product_name, quantity]) => ({ product_name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      console.log(`🔍 ${seg.label} Top5 결과:`, sorted);
      
      return { segment: seg.label, top: sorted };
    });
  }, [hourlyProductData, timeSegments]);

  // 일자별 매출 기준선 데이터 계산
  const dailySalesStats = useMemo(() => {
    if (!dailyData.length) return [];
    
    const salesValues = dailyData.map(item => item.total_sales || 0);
    
    // 10만원 이상인 값들만 필터링
    const filteredSalesValues = salesValues.filter(value => value >= 100000);
    
    const minSales = filteredSalesValues.length > 0 ? Math.min(...filteredSalesValues) : null;
    const maxSales = Math.max(...salesValues);
    
    // 중위값 계산 (전체 데이터 기준)
    const sortedSales = [...salesValues].sort((a, b) => a - b);
    const mid = Math.floor(sortedSales.length / 2);
    const medianSales = sortedSales.length % 2 
      ? sortedSales[mid] 
      : (sortedSales[mid - 1] + sortedSales[mid]) / 2;
    
    const references = [];
    
    // 10만원 이상인 최저 매출이 있는 경우만 표시
    if (minSales !== null) {
      references.push({ 
        value: minSales, 
        label: `최저 매출 ${minSales.toLocaleString()}원`, 
        stroke: 'rgb(255, 120, 101)', // CWDF ORANGE
        strokeDasharray: '4 4' 
      });
    }
    
    // 최고 매출은 항상 표시
    references.push({ 
      value: maxSales, 
      label: `최고 매출 ${maxSales.toLocaleString()}원`, 
      stroke: 'rgb(20, 160, 166)', // CWDF EMERALD
      strokeDasharray: '4 4' 
    });
    
    // 중위값은 항상 표시
    references.push({ 
      value: medianSales, 
      label: `중위값 ${Math.round(medianSales).toLocaleString()}원`, 
      stroke: 'rgb(48, 127, 226)', // CWDF BLUE
      strokeDasharray: '4 4' 
    });
    
    return references;
  }, [dailyData]);

  // 일자별 결제수 기준선 데이터 계산
  const dailyTransactionStats = useMemo(() => {
    if (!dailyData.length) return [];
    
    const transactionValues = dailyData.map(item => item.transaction_count || 0);
    
    // 10건 이상인 값들만 필터링
    const filteredTransactionValues = transactionValues.filter(value => value >= 10);
    
    const minTransactions = filteredTransactionValues.length > 0 ? Math.min(...filteredTransactionValues) : null;
    const maxTransactions = Math.max(...transactionValues);
    
    // 중위값 계산 (전체 데이터 기준)
    const sortedTransactions = [...transactionValues].sort((a, b) => a - b);
    const mid = Math.floor(sortedTransactions.length / 2);
    const medianTransactions = sortedTransactions.length % 2 
      ? sortedTransactions[mid] 
      : (sortedTransactions[mid - 1] + sortedTransactions[mid]) / 2;
    
    const references = [];
    
    // 10건 이상인 최저 결제수가 있는 경우만 표시
    if (minTransactions !== null) {
      references.push({ 
        value: minTransactions, 
        label: `최저 결제수 ${minTransactions.toLocaleString()}건`, 
        stroke: 'rgb(255, 120, 101)', // CWDF ORANGE
        strokeDasharray: '4 4' 
      });
    }
    
    // 최고 결제수는 항상 표시
    references.push({ 
      value: maxTransactions, 
      label: `최고 결제수 ${maxTransactions.toLocaleString()}건`, 
      stroke: 'rgb(20, 160, 166)', // CWDF EMERALD
      strokeDasharray: '4 4' 
    });
    
    // 중위값은 항상 표시
    references.push({ 
      value: medianTransactions, 
      label: `중위값 ${Math.round(medianTransactions).toLocaleString()}건`, 
      stroke: 'rgb(48, 127, 226)', // CWDF BLUE
      strokeDasharray: '4 4' 
    });
    
    return references;
  }, [dailyData]);

  // AI 분석 요청 함수
  const handleAiAnalysis = useCallback(async () => {
    if (!dailyData.length) {
      setAiAnalysisError('분석할 데이터가 없습니다.');
      return;
    }

    setAiAnalysisLoading(true);
    setAiAnalysisError('');
    setAiAnalysisResult('');

    try {
      // 분석용 데이터 준비
      const analysisData = {
        monthlyTotals: {
          totalSales: totalMonthlySales,
          totalTransactions: totalMonthlyTransactions,
          avgTransactionValue: avgTransactionValue,
          medianTransactionValue: medianTransactionValue
        },
        dailySalesData: dailyData.map(item => ({
          date: item.date,
          totalSales: item.total_sales,
          transactionCount: item.transaction_count,
          avgTransactionValue: item.avg_transaction_value
        })),
        distributionData: distributionData,
        period: `${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}`,
        store: filters.selectedStore || '전체 매장'
      };

      // AI 분석 API 호출
      const response = await fetch(`${API_URL}/api/ai/analyze-chart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chart_type: 'dailySales',
          chart_data: analysisData.dailySalesData,
          context: {
            chartTitle: '월간 매출 현황 종합 분석',
            dateRange: analysisData.period,
            selectedStores: analysisData.store,
            monthlyTotals: analysisData.monthlyTotals,
            distributionData: analysisData.distributionData,
            userPrompt: `다음 월간 매출 데이터를 종합적으로 분석해주세요:

월간 총계:
- 총 매출: ${totalMonthlySales.toLocaleString()}원
- 총 결제수: ${totalMonthlyTransactions.toLocaleString()}건  
- 객단가 평균: ${Math.round(avgTransactionValue).toLocaleString()}원
- 객단가 중앙값: ${Math.round(medianTransactionValue).toLocaleString()}원

일자별 데이터를 기반으로 다음 사항을 중점 분석해주세요:
1. 매출 추세와 성장 패턴 분석
2. 일자별 매출 변동성과 안정성 평가  
3. 객단가 분포와 고객 구매 패턴 분석
4. 매출 성과의 주요 동인 분석
5. 향후 매출 개선을 위한 구체적 제안

경영진 관점에서 실행 가능한 인사이트를 제공해주세요.`
          }
        })
      });

      if (!response.ok) {
        throw new Error(`분석 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      const analysisResult = result.analysis || '분석 결과를 받을 수 없습니다.';
      setAiAnalysisResult(analysisResult);
      setAnalysisMarkdownText(analysisResult); // 분석 결과를 편집 가능한 텍스트로도 설정

    } catch (error) {
      console.error('분석 오류:', error);
      setAiAnalysisError(`분석 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setAiAnalysisLoading(false);
    }
  }, [dailyData, totalMonthlySales, totalMonthlyTransactions, avgTransactionValue, medianTransactionValue, distributionData, filters]);

  // 상품별 분석 요청 함수
  const handleProductAnalysis = useCallback(async () => {
    if (!productData.length) {
      setProductAiAnalysisError('분석할 상품 데이터가 없습니다.');
      return;
    }

    setProductAiAnalysisLoading(true);
    setProductAiAnalysisError('');
    setProductAiAnalysisResult('');

    try {
      // 상품별 분석용 데이터 준비
      const productAnalysisData = {
        productSalesData: productData.map(item => ({
          productName: item.product_name,
          totalSales: item.total_sales,
          quantity: item.quantity,
          averagePrice: item.avg_price,
          salesRatio: item.sales_ratio
        })),
        topProducts: {
          bySales: productData.slice(0, 5),
          byQuantity: topCountProducts.slice(0, 5)
        },
        productMetrics: {
          totalProducts: productData.length,
          totalProductSales: productData.reduce((sum, item) => sum + item.total_sales, 0),
          totalQuantitySold: productData.reduce((sum, item) => sum + item.quantity, 0),
          averageProductPrice: productData.reduce((sum, item) => sum + item.avg_price, 0) / productData.length || 0
        }
      };

      // API 호출
      const response = await fetch(`${API_URL}/api/ai/analyze-chart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chart_type: 'productAnalysis',
          chart_data: productAnalysisData.productSalesData,
          context: {
            chartTitle: '상품별 판매 데이터 종합 분석',
            dateRange: `${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}`,
            selectedStores: filters.selectedStore || '전체 매장',
            productMetrics: productAnalysisData.productMetrics,
            topProducts: productAnalysisData.topProducts,
            userPrompt: `다음 상품별 판매 데이터를 종합적으로 분석해주세요:

총 상품 수: ${productAnalysisData.productMetrics.totalProducts}개
총 상품 매출: ${productAnalysisData.productMetrics.totalProductSales.toLocaleString()}원  
총 판매 수량: ${productAnalysisData.productMetrics.totalQuantitySold.toLocaleString()}개
평균 상품 단가: ${Math.round(productAnalysisData.productMetrics.averageProductPrice).toLocaleString()}원

다음 사항을 중점적으로 분석해주세요:
1. 매출 상위 제품과 판매량 상위 제품 비교 분석
2. 가격대별 제품 성과 및 수익성 분석  
3. 제품 포트폴리오 다양성 및 균형도 평가
4. 고수익 제품과 인기 제품 간의 상관관계
5. 제품별 평균 단가와 판매 전략 최적화 방안
6. 추가 프로모션이나 마케팅이 필요한 제품군 식별

경영진 관점에서 상품 전략 개선에 도움이 되는 실행 가능한 인사이트를 제공해주세요.`
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`분석 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.analysis) {
        setProductAiAnalysisResult(result.analysis);
        setProductAnalysisMarkdownText(result.analysis);
      } else {
        throw new Error('분석 결과를 받지 못했습니다.');
      }

    } catch (error) {
      console.error('분석 오류:', error);
      setProductAiAnalysisError(error.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setProductAiAnalysisLoading(false);
    }
  }, [productData, topCountProducts]);

  // 시간대별 분석 요청 함수 (요일별 + 시간대별 + Top5 제품 종합)
  const handleTimeAnalysis = useCallback(async () => {
    if (!dayOfWeekData.length && !hourlyData.length && !segmentTopProducts.length) {
      setTimeAiAnalysisError('분석할 시간대별 데이터가 없습니다.');
      return;
    }

    setTimeAiAnalysisLoading(true);
    setTimeAiAnalysisError('');
    setTimeAiAnalysisResult('');

    try {
      // 시간대별 종합 분석용 데이터 준비
      const timeAnalysisData = {
        dayOfWeekData: dayOfWeekData.map(item => ({
          day: item.day,
          avgSales: item.sales,
          avgOrders: item.orders,
          avgTransactionValue: item.avg,
          medianTransactionValue: item.median
        })),
        timeSegmentData: segmentData.map(item => ({
          timeSegment: item.segment,
          avgSales: item.avgSales,
          avgOrders: item.avgOrders,
          totalSales: item.sumSales,
          totalOrders: item.sumOrders,
          avgTransactionValue: item.avgTrans,
          medianTransactionValue: item.medTrans
        })),
        topProductsByTimeSegment: segmentTopProducts.map(item => ({
          timeSegment: item.segment,
          topProducts: item.top.map(product => ({
            productName: product.product_name,
            quantity: product.quantity
          }))
        })),
        overallMetrics: {
          totalHourlyOrders: totalHourlyOrders,
          avgHourlySales: Math.round(avgHourlySales),
          avgHourlyTransaction: Math.round(avgHourlyTransaction),
          medianHourlyTransaction: Math.round(medianHourlyTransaction)
        }
      };

      // API 호출
      const response = await fetch(`${API_URL}/api/ai/analyze-chart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chart_type: 'timeAnalysis',
          chart_data: timeAnalysisData.dayOfWeekData,
          context: {
            chartTitle: '요일별/시간대별 데이터 종합 분석',
            dateRange: `${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}`,
            selectedStores: filters.selectedStore || '전체 매장',
            dayOfWeekData: timeAnalysisData.dayOfWeekData,
            timeSegmentData: timeAnalysisData.timeSegmentData,
            topProductsByTimeSegment: timeAnalysisData.topProductsByTimeSegment,
            overallMetrics: timeAnalysisData.overallMetrics,
            userPrompt: `다음 시간대별 종합 데이터를 분석해주세요:

**요일별 패턴:**
- 요일별 평균 매출, 주문수, 객단가 분석
- 주중 vs 주말 패턴 비교

**시간대별 패턴:**
- 09~12시, 12~15시, 15~18시, 18~21시 구간별 성과
- 피크 시간대와 저조한 시간대 식별

**시간대별 인기 제품:**
- 각 시간대별 Top5 제품 분석
- 시간대별 고객 선호도 변화

다음 사항을 중점적으로 분석해주세요:
1. 요일별 매출 패턴과 운영 효율성 분석
2. 시간대별 매출 동향과 최적 운영 시간 제안
3. 시간대별 인기 제품과 상품 전략 연계 방안
4. 인력 배치 및 재고 관리 최적화 제안
5. 매출 극대화를 위한 시간대별 마케팅 전략

경영진 관점에서 운영 효율성 개선에 도움이 되는 실행 가능한 인사이트를 제공해주세요.`
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`분석 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.analysis) {
        setTimeAiAnalysisResult(result.analysis);
        setTimeAnalysisMarkdownText(result.analysis);
      } else {
        throw new Error('분석 결과를 받지 못했습니다.');
      }

    } catch (error) {
      console.error('분석 오류:', error);
      setTimeAiAnalysisError(error.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setTimeAiAnalysisLoading(false);
    }
  }, [dayOfWeekData, hourlyData, segmentTopProducts, segmentData, totalHourlyOrders, avgHourlySales, avgHourlyTransaction, medianHourlyTransaction, filters]);

  // 전반적 경영 성과 요약 분석 요청 함수 (페이지 전체 데이터 활용)
  const handleSummaryAnalysis = useCallback(async () => {
    if (!dailyData.length) {
      setSummaryAiAnalysisError('분석할 데이터가 없습니다.');
      return;
    }

    setSummaryAiAnalysisLoading(true);
    setSummaryAiAnalysisError('');
    setSummaryAiAnalysisResult('');

    try {
      // 페이지 전체 데이터 준비
      const pageData = {
        // KPI 지표
        kpiMetrics: {
          totalMonthlySales: totalMonthlySales,
          totalMonthlyTransactions: totalMonthlyTransactions,
          avgTransactionValue: avgTransactionValue,
          medianTransactionValue: medianTransactionValue
        },
        
        // 일별 데이터
        dailySalesData: dailyData.map(item => ({
          date: item.date,
          totalSales: item.total_sales,
          transactionCount: item.transaction_count,
          avgTransactionValue: item.avg_transaction_value
        })),
        
        // 요일별 지표
        dayOfWeekMetrics: dayOfWeekData,
        
        // 상품별 데이터
        productMetrics: {
          topSellingProducts: topSellingProducts.slice(0, 10),
          topCountProducts: topCountProducts.slice(0, 10),
          totalProducts: productData.length,
          totalProductSales: productData.reduce((sum, item) => sum + item.total_sales, 0),
          totalQuantitySold: productData.reduce((sum, item) => sum + item.quantity, 0)
        },
        
        // 시간대별 데이터
        timeSegmentMetrics: {
          segmentData: segmentData,
          hourlyData: hourlyData.slice(0, 24), // 24시간 데이터
          topProductsByTimeSegment: segmentTopProducts
        },
        
        // 기간 정보
        period: {
          startDate: filters.dateRange.startDate,
          endDate: filters.dateRange.endDate,
          storeName: filters.selectedStore || '전체 매장'
        }
      };

      // 페이지 전체 분석 API 호출
      const response = await fetch(`${API_URL}/api/ai/analyze-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_data: pageData,
          context: {
            pageTitle: '매장 현황분석 종합 리포트',
            analysisType: 'full_page_comprehensive',
            userPrompt: `다음 매장 현황 전체 데이터를 종합적으로 분석해주세요:

**분석 기간**: ${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}
**대상 매장**: ${filters.selectedStore || '전체 매장'}

제공된 데이터:
1. 월간 총 매출/결제수/객단가 지표
2. 일자별 매출 추이 및 변동성
3. 요일별 매출/주문/객단가 패턴
4. 상품별 매출 순위 및 판매량 분석
5. 시간대별 매출 패턴 및 인기 제품

다음 관점에서 종합적이고 상세한 분석을 제공해주세요:

**1. 경영 성과 총평**
- 전반적인 매출 성과 평가
- 핵심 성과 지표(KPI) 달성도
- 성장 잠재력 및 리스크 요인

**2. 매출 구조 심층 분석**
- 일별/요일별 매출 패턴의 의미
- 객단가 분포와 고객 구매력 분석
- 매출 안정성 및 예측 가능성

**3. 상품 포트폴리오 최적화**
- 베스트셀러와 수익 기여도
- 상품 믹스 전략 제안
- 신상품 도입 또는 단종 고려사항

**4. 운영 효율성 개선**
- 시간대별 운영 최적화 방안
- 인력 배치 및 재고 관리 제안
- 피크타임 대응 전략

**5. 전략적 제언**
- 단기 실행 과제 (1-3개월)
- 중장기 성장 전략 (3-12개월)
- 경쟁력 강화 방안

경영진이 즉시 실행할 수 있는 구체적이고 실용적인 인사이트를 2000자 내외로 제공해주세요.`
          }
        })
      });

      if (!response.ok) {
        throw new Error(`분석 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      const analysisResult = result.analysis || '분석 결과를 받을 수 없습니다.';
      setSummaryAiAnalysisResult(analysisResult);
      setMarkdownText(analysisResult); // 분석 결과를 편집 가능한 텍스트로도 설정

    } catch (error) {
      console.error('종합 분석 오류:', error);
      setSummaryAiAnalysisError(`분석 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setSummaryAiAnalysisLoading(false);
    }
  }, [dailyData, totalMonthlySales, totalMonthlyTransactions, avgTransactionValue, medianTransactionValue, 
      dayOfWeekData, topSellingProducts, topCountProducts, productData, segmentData, hourlyData, 
      segmentTopProducts, filters, setMarkdownText]);

  // 기존 handleSave 함수를 수정하여 편집 모드 해제
  const handleSave = () => {
    fetch(`${API_URL}/api/summary/performance_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: markdownText }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed');
        setSavedText(markdownText);
        setSummaryEditMode(false); // 편집 모드 해제
      })
      .catch(err => setError(err.toString()));
  };

  // 편집 시작 함수
  const handleSummaryEdit = () => {
    setSummaryEditMode(true);
  };

  // 내 매장 상세 리포트 분석 요청 함수
  const handleDetailReportAnalysis = useCallback(async () => {
    if (!dailyData.length) {
      setDetailReportAiAnalysisError('분석할 데이터가 없습니다.');
      return;
    }

    setDetailReportAiAnalysisLoading(true);
    setDetailReportAiAnalysisError('');
    setDetailReportAiAnalysisResult('');

    try {
      // 페이지 전체 데이터 준비
      const pageData = {
        // KPI 지표
        kpiMetrics: {
          totalMonthlySales: totalMonthlySales,
          totalMonthlyTransactions: totalMonthlyTransactions,
          avgTransactionValue: avgTransactionValue,
          medianTransactionValue: medianTransactionValue
        },
        
        // 일별 데이터
        dailySalesData: dailyData.map(item => ({
          date: item.date,
          totalSales: item.total_sales,
          transactionCount: item.transaction_count,
          avgTransactionValue: item.avg_transaction_value
        })),
        
        // 요일별 지표
        dayOfWeekMetrics: dayOfWeekData,
        
        // 상품별 데이터
        productMetrics: {
          topSellingProducts: topSellingProducts.slice(0, 10),
          topCountProducts: topCountProducts.slice(0, 10),
          totalProducts: productData.length,
          totalProductSales: productData.reduce((sum, item) => sum + item.total_sales, 0),
          totalQuantitySold: productData.reduce((sum, item) => sum + item.quantity, 0)
        },
        
        // 시간대별 데이터
        timeSegmentMetrics: {
          segmentData: segmentData,
          hourlyData: hourlyData.slice(0, 24), // 24시간 데이터
          topProductsByTimeSegment: segmentTopProducts
        },
        
        // 기간 정보
        period: {
          startDate: filters.dateRange.startDate,
          endDate: filters.dateRange.endDate,
          storeName: filters.selectedStore || '전체 매장'
        }
      };

      // 페이지 전체 분석 API 호출
      const response = await fetch(`${API_URL}/api/ai/analyze-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_data: pageData,
          context: {
            pageTitle: '내 매장 상세 리포트',
            analysisType: 'detailed_store_report',
            userPrompt: `다음 매장 상세 데이터를 기반으로 심층적인 매장 리포트를 작성해주세요:

**분석 기간**: ${filters.dateRange.startDate} ~ ${filters.dateRange.endDate}
**대상 매장**: ${filters.selectedStore || '전체 매장'}

제공된 데이터:
1. 월간 총 매출/결제수/객단가 지표
2. 일자별 매출 추이 및 변동성
3. 요일별 매출/주문/객단가 패턴
4. 상품별 매출 순위 및 판매량 분석
5. 시간대별 매출 패턴 및 인기 제품

다음 관점에서 상세하고 실무적인 분석을 제공해주세요:

**1. 매장 운영 현황 진단**
- 현재 매장의 강점과 약점 분석
- 매출 구조의 안정성 평가
- 고객 구매 패턴 심층 분석

**2. 상품 전략 세부 분석**
- 핵심 수익 상품 식별 및 관리 방안
- 상품 포트폴리오 최적화 제안
- 계절성 및 트렌드 반영 상품 전략

**3. 운영 효율성 극대화**
- 시간대별 최적 인력 배치 계획
- 재고 관리 및 발주 최적화
- 매장 운영 시간 조정 제안

**4. 고객 서비스 개선**
- 피크타임 대응 전략
- 고객 만족도 향상 방안
- 단골 고객 유지 전략

**5. 수익성 개선 로드맵**
- 단기 실행 과제 (1개월 내)
- 중기 개선 계획 (3개월 내)
- 장기 성장 전략 (6개월 이상)

매장 운영자가 즉시 실행할 수 있는 구체적이고 실용적인 가이드를 2500자 내외로 제공해주세요.`
          }
        })
      });

      if (!response.ok) {
        throw new Error(`분석 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      const analysisResult = result.analysis || '분석 결과를 받을 수 없습니다.';
      setDetailReportAiAnalysisResult(analysisResult);
      setDetailReportMarkdownText(analysisResult); // 분석 결과를 편집 가능한 텍스트로도 설정

    } catch (error) {
      console.error('상세 리포트 분석 오류:', error);
      setDetailReportAiAnalysisError(`분석 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setDetailReportAiAnalysisLoading(false);
    }
  }, [dailyData, totalMonthlySales, totalMonthlyTransactions, avgTransactionValue, medianTransactionValue, 
      dayOfWeekData, topSellingProducts, topCountProducts, productData, segmentData, hourlyData, 
      segmentTopProducts, filters]);

  // Save detail report summary
  const handleDetailReportSave = () => {
    fetch(`${API_URL}/api/summary/detail_report_summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: detailReportMarkdownText }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed');
        setDetailReportSavedText(detailReportMarkdownText);
        setDetailReportEditMode(false); // 편집 모드 해제
      })
      .catch(err => setError(err.toString()));
  };

  // Edit detail report summary
  const handleDetailReportEdit = () => {
    setDetailReportEditMode(true);
  };

  return (
    <>
      <div ref={componentRef} className="px-4 py-6 bg-white">
        <h1 className="text-2xl font-bold mb-4">매장 현황분석</h1>
        <div className="mb-6">
        </div>
        
        {/* 전반적 경영 성과 요약 - 개선된 UI */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">📈 전반적 경영 성과 종합 요약</h2>
            {!savedText && !summaryEditMode && (
              <button
                onClick={handleSummaryAnalysis}
                disabled={summaryAiAnalysisLoading || !dailyData.length}
                className={`px-4 py-2 rounded-md font-medium ${
                  summaryAiAnalysisLoading || !dailyData.length
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 transition-colors'
                }`}
              >
                {summaryAiAnalysisLoading ? '분석 중...' : '종합 분석 시작'}
              </button>
            )}
            {(savedText || summaryEditMode) && (
              <div className="flex space-x-2">
                {!summaryEditMode && (
                  <>
                    <button
                      onClick={handleSummaryEdit}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      편집
                    </button>
                    <button
                      onClick={() => setSavedText('')}
                      className="px-3 py-1 text-sm bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                    >
                      새 분석
                    </button>
                  </>
                )}
                {summaryEditMode && (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setSummaryEditMode(false);
                        setMarkdownText(savedText);
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
            <p>페이지 내 모든 데이터(월간, 요일, 시간대, 상품별)를 종합하여 전반적인 경영 성과를 심층 분석합니다.</p>
          </div>

          {/* 분석 로딩 상태 */}
          {summaryAiAnalysisLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">전체 데이터를 종합 분석하고 있습니다...</span>
            </div>
          )}

          {/* 분석 오류 메시지 */}
          {summaryAiAnalysisError && (
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
                    <p>{summaryAiAnalysisError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 편집 모드 */}
          {summaryEditMode && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">종합 분석 내용 편집</label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 min-h-[400px] text-sm"
                value={markdownText}
                onChange={(e) => setMarkdownText(e.target.value)}
                placeholder="종합 분석 내용을 입력하거나 수정하세요..."
              />
            </div>
          )}

          {/* 저장된 분석 결과 표시 */}
          {savedText && !summaryEditMode && (
            <div>
              {(() => {
                const lines = savedText.split('\n');
                const isLong = lines.length > 15;
                const displayText = isLong && !showAll ? lines.slice(0, 15).join('\n') : savedText;
                return (
                  <div>
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                      <div className="flex items-center mb-3">
                        <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h5 className="text-md font-semibold text-indigo-800">종합 분석 결과</h5>
                      </div>
                      <div className="prose max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkBreaks]}
                          className="text-gray-700 leading-relaxed"
                        >
                          {displayText}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {isLong && (
                      <button
                        onClick={() => setShowAll((prev) => !prev)}
                        className="mt-4 mx-auto block px-6 py-2 bg-indigo-500 text-white font-bold rounded-md shadow-lg transition-colors duration-200 hover:bg-indigo-600"
                      >
                        {showAll ? '접기' : '경영 성과요약 전체보기'}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 새로운 분석 결과 (아직 저장되지 않음) */}
          {summaryAiAnalysisResult && !summaryAiAnalysisLoading && !savedText && !summaryEditMode && (
            <div>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-4">
                <div className="flex items-center mb-3">
                  <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h5 className="text-md font-semibold text-indigo-800">종합 분석 결과</h5>
                </div>
                <div className="prose max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkBreaks]}
                    className="text-gray-700 leading-relaxed"
                  >
                    {summaryAiAnalysisResult}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setSummaryEditMode(true)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  편집
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          )}

          {/* 초기 상태 안내 메시지 */}
          {!summaryAiAnalysisResult && !summaryAiAnalysisLoading && !summaryAiAnalysisError && !savedText && !summaryEditMode && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>종합 분석을 시작하려면 위의 "종합 분석 시작" 버튼을 클릭하세요.</p>
              <p className="text-sm mt-2">페이지 내 모든 데이터를 종합하여 경영 성과를 상세히 분석합니다.</p>
            </div>
          )}
        </div>

        {/* 매출 구조 섹션 */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">매출 구조</h2>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">월간 지표</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
              <KpiCard title="월간 총 매출" value={totalMonthlySales} formatter={v => `${v.toLocaleString()}원`} icon={<FiDollarSign />} />
              <KpiCard title="월간 총 결제수" value={totalMonthlyTransactions} formatter={v => v.toLocaleString()} icon={<FiShoppingCart />} />
            </div>
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h4 className="text-md font-medium mb-2">일자별 매출</h4>
              <LineChart
                data={dailyData.map(item => ({ date: item.date, 매출: item.total_sales }))}
                xDataKey="date"
                lines={[{ dataKey: '매출', name: '매출액' }]}
                references={dailySalesStats}
              />
            </div>
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h4 className="text-md font-medium mb-2">일자별 결제수</h4>
              <LineChart
                data={dailyData.map(item => ({ date: item.date, 결제수: item.transaction_count }))}
                xDataKey="date"
                lines={[{ dataKey: '결제수', name: '결제수', color: 'rgb(255, 198, 88)' }]}
                formatter={(value) => value?.toLocaleString() || '0'}
                references={dailyTransactionStats}
              />
            </div>
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-sm text-gray-600">객단가 평균값</p>
                  <p className="text-2xl font-bold">{Math.floor(avgTransactionValue).toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">객단가 중앙값</p>
                  <p className="text-2xl font-bold">{Math.floor(medianTransactionValue).toLocaleString()}원</p>
                </div>
              </div>
              <div className="border-t border-gray-200 my-4" />
              <h4 className="text-md font-medium mb-2">객단가 분포</h4>
              {/* Legend */}
              <div className="flex justify-end space-x-4 text-sm mb-2">
                <div className="flex items-center"><span className="inline-block w-3 h-3 border-2 border-blue-500 bg-transparent mr-1"></span>평균값</div>
                <div className="flex items-center"><span className="inline-block w-3 h-3 border-2 border-red-500 bg-transparent mr-1"></span>중앙값</div>
                <div className="flex items-center"><span className="inline-block w-3 h-3 bg-purple-500 opacity-50 mr-1"></span>분포 밀도</div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={distributionData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(20, 160, 166)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="rgb(20, 160, 166)" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="value" 
                    type="number" 
                    domain={["dataMin", "dataMax"]} 
                    tickFormatter={v => `${Math.round(v).toLocaleString()}원`} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    label={{ value: '객단가 구간 (원)', position: 'bottom', offset: 0, fill: '#334155', fontSize: 14 }}
                  />
                  <YAxis 
                    tickFormatter={v => v.toLocaleString()} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    label={{ value: '빈도', angle: -90, position: 'insideLeft', fill: '#334155', fontSize: 14 }}
                  />
                  <Tooltip formatter={(value, name) => [Math.round(value).toLocaleString(), '빈도']} />
                  <ReferenceLine 
                    x={avgTransactionValue} 
                    stroke="rgb(48, 127, 226)"
                    strokeDasharray="4 4"
                    label={{ position: 'bottom', value: `평균값 ${Math.round(avgTransactionValue).toLocaleString()}원`, fill: 'rgb(48, 127, 226)', fontSize: 12, fontWeight: 'bold', textAnchor: 'start' }}
                  />
                  <ReferenceLine 
                    x={medianTransactionValue} 
                    stroke="rgb(255, 120, 101)"
                    strokeDasharray="4 4"
                    label={{ position: 'top', value: `중앙값 ${Math.round(medianTransactionValue).toLocaleString()}원`, fill: 'rgb(255, 120, 101)', fontSize: 12, fontWeight: 'bold', textAnchor: 'end' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="rgb(20, 160, 166)"
                    fillOpacity={1} 
                    fill="url(#densityGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 분석 컴포넌트 */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">📊 월간 매출 데이터 종합 분석</h4>
                {!analysisSavedText && !analysisEditMode && (
                  <button
                    onClick={handleAiAnalysis}
                    disabled={aiAnalysisLoading || !dailyData.length}
                    className={`px-4 py-2 rounded-md font-medium ${
                      aiAnalysisLoading || !dailyData.length
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                    }`}
                  >
                    {aiAnalysisLoading ? '분석 중...' : '매출 데이터 분석'}
                  </button>
                )}
                {(analysisSavedText || analysisEditMode) && (
                  <div className="flex space-x-2">
                    {!analysisEditMode && (
                      <>
                        <button
                          onClick={handleAnalysisEdit}
                          className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        >
                          편집
                        </button>
                        <button
                          onClick={() => setAnalysisSavedText('')}
                          className="px-3 py-1 text-sm bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                        >
                          새 분석
                        </button>
                      </>
                    )}
                    {analysisEditMode && (
                      <>
                        <button
                          onClick={handleAnalysisSave}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setAnalysisEditMode(false)}
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
                <p>월간 총매출 <strong>{totalMonthlySales.toLocaleString()}원</strong>, 총결제수 <strong>{totalMonthlyTransactions.toLocaleString()}건</strong>, 객단가 평균 <strong>{Math.round(avgTransactionValue).toLocaleString()}원</strong>의 데이터를 기반으로 종합 분석을 제공합니다.</p>
              </div>

              {aiAnalysisLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">데이터를 분석하고 있습니다...</span>
                </div>
              )}

              {aiAnalysisError && (
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
                        <p>{aiAnalysisError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 편집 모드 */}
              {analysisEditMode && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">분석 내용 편집</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-3 min-h-[300px] text-sm"
                    value={analysisMarkdownText}
                    onChange={(e) => setAnalysisMarkdownText(e.target.value)}
                    placeholder="분석 내용을 입력하거나 수정하세요..."
                  />
                </div>
              )}

              {/* 저장된 분석 결과 표시 */}
              {analysisSavedText && !analysisEditMode && (
                <div>
                  {(() => {
                    const lines = analysisSavedText.split('\n');
                    const isLong = lines.length > 20;
                    const displayText = isLong && !analysisShowAll ? lines.slice(0, 20).join('\n') : analysisSavedText;
                    return (
                      <div>
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                          <div className="flex items-center mb-3">
                            <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <h5 className="text-md font-semibold text-blue-800">분석 결과</h5>
                          </div>
                          <div className="prose max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkBreaks]}
                              className="text-gray-700 leading-relaxed"
                            >
                              {displayText}
                            </ReactMarkdown>
                          </div>
                        </div>
                        {isLong && (
                          <button
                            onClick={() => setAnalysisShowAll(prev => !prev)}
                            className="mt-3 mx-auto block px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                          >
                            {analysisShowAll ? '접기' : '전체 분석 결과 보기'}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 새로운 분석 결과 (아직 저장되지 않음) */}
              {aiAnalysisResult && !aiAnalysisLoading && !analysisSavedText && !analysisEditMode && (
                <div>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-4">
                    <div className="flex items-center mb-3">
                      <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <h5 className="text-md font-semibold text-blue-800">분석 결과</h5>
                    </div>
                    <div className="prose max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkBreaks]}
                        className="text-gray-700 leading-relaxed"
                      >
                        {aiAnalysisResult}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setAnalysisEditMode(true)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      편집
                    </button>
                    <button
                      onClick={handleAnalysisSave}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}

              {!aiAnalysisResult && !aiAnalysisLoading && !aiAnalysisError && !analysisSavedText && !analysisEditMode && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p>분석을 시작하려면 위의 "분석 시작" 버튼을 클릭하세요.</p>
                  <p className="text-sm mt-2">월간 매출 데이터를 종합적으로 분석하여 인사이트를 제공합니다.</p>
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6" style={{ minHeight: '800px' }}>
              <h4 className="text-md font-medium mb-2">상품별 매출</h4>
              <div style={{ height: '750px' }}>
              <BarChart
                data={topSellingProducts.map((item, idx) => ({
                  product: item.product_name,
                  매출: item.total_sales,
                  개수: item.quantity,
                  fill: `rgba(52, 152, 219, ${1 - (idx / (topSellingProducts.length - 1)) * 0.5})`
                }))}
                xDataKey="product"
                barDataKey="매출"
                barName="매출액"
                  layout="vertical"
                  height={750}
                  containerClassName=""
                />
            </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow mt-6" style={{ minHeight: '800px' }}>
              <h4 className="text-md font-medium mb-2">상품별 판매 개수</h4>
              <div style={{ height: '750px' }}>
              <BarChart
                data={topCountProducts.map((item, idx) => ({
                  product: item.product_name,
                  개수: item.quantity,
                  fill: `rgba(20, 160, 166, ${1 - (idx / (topCountProducts.length - 1)) * 0.5})`
                }))}
                xDataKey="product"
                barDataKey="개수"
                barName="판매 개수"
                barColor="rgb(20, 160, 166)" // CWDF EMERALD
                formatter={value => value?.toLocaleString() || '0'}
                layout="vertical"
                  height={750}
                  containerClassName=""
              />
              </div>
            </div>

            {/* 상품별 분석 컴포넌트 */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">🏷️ 상품별 판매 데이터 종합 분석</h4>
                {!productAnalysisSavedText && !productAnalysisEditMode && (
                  <button
                    onClick={handleProductAnalysis}
                    disabled={productAiAnalysisLoading || !productData.length}
                    className={`px-4 py-2 rounded-md font-medium ${
                      productAiAnalysisLoading || !productData.length
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 transition-colors'
                    }`}
                  >
                    {productAiAnalysisLoading ? '분석 중...' : '상품 데이터 분석'}
                  </button>
                )}
                {(productAnalysisSavedText || productAnalysisEditMode) && (
                  <div className="flex space-x-2">
                    {!productAnalysisEditMode && (
                      <>
                        <button
                          onClick={handleProductAnalysisEdit}
                          className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        >
                          편집
                        </button>
                        <button
                          onClick={() => setProductAnalysisSavedText('')}
                          className="px-3 py-1 text-sm bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                        >
                          새 분석
                        </button>
                      </>
                    )}
                    {productAnalysisEditMode && (
                      <>
                        <button
                          onClick={handleProductAnalysisSave}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setProductAnalysisEditMode(false);
                            setProductAnalysisMarkdownText(productAnalysisSavedText);
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
                <p>매출 상위 제품, 판매량 상위 제품, 가격대별 성과 등 상품 포트폴리오 전반을 분석하여 상품 전략 최적화 인사이트를 제공합니다.</p>
              </div>

              {/* 분석 로딩 상태 */}
              {productAiAnalysisLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <span className="ml-3 text-gray-600">상품별 판매 데이터를 분석하고 있습니다...</span>
                </div>
              )}

              {/* 분석 오류 메시지 */}
              {productAiAnalysisError && (
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
                        {productAiAnalysisError}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 분석 결과 편집 모드 */}
              {productAnalysisEditMode && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">상품별 분석 내용 편집</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-3 min-h-[300px] text-sm"
                    value={productAnalysisMarkdownText}
                    onChange={e => setProductAnalysisMarkdownText(e.target.value)}
                    placeholder="상품별 분석 내용을 입력하거나 수정하세요..."
                  />
                </div>
              )}

              {/* 저장된 분석 결과 표시 */}
              {productAnalysisSavedText && !productAnalysisEditMode && (
                <div>
                  {(() => {
                    const lines = productAnalysisSavedText.split('\n');
                    const isLong = lines.length > 15;
                    const displayText = isLong && !productAnalysisShowAll ? lines.slice(0, 15).join('\n') : productAnalysisSavedText;
                    return (
                      <div>
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-6">
                          <div className="flex items-center mb-3">
                            <svg className="h-5 w-5 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <h5 className="text-md font-semibold text-emerald-800">상품별 분석 결과</h5>
                          </div>
                          <div className="prose max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkBreaks]}
                              className="text-gray-700 leading-relaxed"
                            >
                              {displayText}
                            </ReactMarkdown>
                          </div>
                        </div>
                        {isLong && (
                          <button
                            onClick={() => setProductAnalysisShowAll(prev => !prev)}
                            className="mt-3 mx-auto block px-4 py-2 bg-emerald-500 text-white rounded-md text-sm hover:bg-emerald-600 transition-colors"
                          >
                            {productAnalysisShowAll ? '접기' : '전체 분석 결과 보기'}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 새로운 분석 결과 표시 */}
              {productAiAnalysisResult && !productAnalysisSavedText && !productAnalysisEditMode && (
                <div>
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-6 mb-4">
                    <div className="flex items-center mb-3">
                      <svg className="h-5 w-5 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <h5 className="text-md font-semibold text-emerald-800">상품별 분석 결과</h5>
                    </div>
                    <div className="prose max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkBreaks]}
                        className="text-gray-700 leading-relaxed"
                      >
                        {productAiAnalysisResult}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setProductAnalysisEditMode(true)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      편집
                    </button>
                    <button
                      onClick={handleProductAnalysisSave}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}

              {/* 기본 안내 메시지 */}
              {productData.length > 0 && !productAiAnalysisResult && !productAiAnalysisLoading && !productAiAnalysisError && !productAnalysisSavedText && !productAnalysisEditMode && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p>분석을 시작하려면 위의 "상품 데이터 분석" 버튼을 클릭하세요.</p>
                  <p className="text-sm mt-2">매출 상위 제품, 판매량 상위 제품, 가격대별 성과를 종합적으로 분석하여 상품 전략 인사이트를 제공합니다.</p>
                </div>
              )}

              {/* 상품 데이터가 없을 때 안내 메시지 */}
              {!productData.length && !productAiAnalysisLoading && !productAiAnalysisResult && !productAnalysisSavedText && (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-sm">상품별 데이터를 불러온 후 분석을 진행할 수 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 요일별 지표 */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">요일별 지표</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-md font-medium mb-2">평균 매출</h4>
              <BarChart
                data={dayOfWeekData.map(d => ({ day: d.day, 매출: d.sales, fill: d.fill }))}
                xDataKey="day"
                barDataKey="매출"
                barName="평균 매출"
                layout="horizontal"
                references={[
                  { value: monthlyAverageSales, label: `매출 평균 ${Math.round(monthlyAverageSales || 0).toLocaleString()}원`, stroke: 'rgb(48, 127, 226)', strokeDasharray: '4 4' }, // CWDF BLUE
                  { value: monthlyMedianSales, label: `매출 중앙값 ${Math.round(monthlyMedianSales || 0).toLocaleString()}원`, stroke: 'rgb(20, 160, 166)', strokeDasharray: '4 4' } // CWDF EMERALD
                ]}
                removeReferenceLabelBackground={true}
              />
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-md font-medium mb-2">주문 건수</h4>
              <BarChart
                data={dayOfWeekData.map(d => ({ day: d.day, 주문: d.orders, fill: d.fill }))}
                xDataKey="day"
                barDataKey="주문"
                barName="주문 건수"
                formatter={value => value?.toLocaleString() || '0'}
                layout="horizontal"
                references={[
                  { value: monthlyAverageTransactions, label: `주문 평균값 ${Math.round(monthlyAverageTransactions).toLocaleString()}건`, stroke: 'rgb(255, 198, 88)', strokeDasharray: '4 4' }, // CWDF YELLOW
                  { value: monthlyMedianTransactions, label: `주문 중앙값 ${Math.round(monthlyMedianTransactions).toLocaleString()}건`, stroke: 'rgb(20, 160, 166)', strokeDasharray: '4 4' } // CWDF EMERALD
                ]}
                removeReferenceLabelBackground={true}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-md font-medium mb-2">객단가 평균값</h4>
              <BarChart
                data={dayOfWeekData.map(d => ({ day: d.day, 객단가: d.avg, fill: d.fill }))}
                xDataKey="day"
                barDataKey="객단가"
                barName="평균 객단가"
                formatter={value => `${value.toFixed(0)}원`}
                layout="horizontal"
                reference={{ value: avgTransactionValue, label: `월평균 ${Math.round(avgTransactionValue).toLocaleString()}원`, stroke: 'rgb(20, 160, 166)', strokeDasharray: '4 4' }}
                removeReferenceLabelBackground={true}
              />
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-md font-medium mb-2">객단가 중앙값</h4>
              <BarChart
                data={dayOfWeekData.map(d => ({ day: d.day, 객단가_중앙값: d.median, fill: d.fill }))}
                xDataKey="day"
                barDataKey="객단가_중앙값"
                barName="중앙 객단가"
                formatter={value => `${value.toFixed(0)}원`}
                layout="horizontal"
                reference={{ value: medianTransactionValue, label: `월중앙값 ${Math.round(medianTransactionValue).toLocaleString()}원`, stroke: 'rgb(48, 127, 226)', strokeDasharray: '4 4' }}
                removeReferenceLabelBackground={true}
              />
            </div>
          </div>
        </div>
        {/* 시간대별 지표 */}
        <div className="mt-8">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-bold">시간대별 지표</h2>
            <div className="relative ml-2">
              <FiInfo 
                className="w-5 h-5 text-gray-500 cursor-help"
                onMouseEnter={() => setShowTimeTooltip(true)}
                onMouseLeave={() => setShowTimeTooltip(false)}
              />
              {showTimeTooltip && (
                <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg">
                  <div className="font-semibold mb-2">시간 구간 설명</div>
                  <div className="space-y-1">
                    <div><strong>09~12시:</strong> 09:00 ~ 11:59 (3시간)</div>
                    <div><strong>12~15시:</strong> 12:00 ~ 14:59 (3시간)</div>
                    <div><strong>15~18시:</strong> 15:00 ~ 17:59 (3시간)</div>
                    <div><strong>18~21시:</strong> 18:00 ~ 20:59 (3시간)</div>
                  </div>
                  <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-800 rotate-45"></div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-md font-medium mb-2">평균 매출</h4>
              <BarChart
                data={averageSalesData.map((d, idx) => ({ ...d, fill: `rgba(48, 127, 226, ${1 - (idx / (averageSalesData.length - 1)) * 0.5})` }))}
                xDataKey="segment"
                barDataKey="평균매출"
                formatter={value => `${value.toLocaleString()}원`}
                layout="horizontal"
                barColor="rgb(48, 127, 226)" // CWDF BLUE
              />
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-md font-medium mb-2">평균 주문건수</h4>
              <BarChart
                data={averageOrdersData.map((d, idx) => ({ ...d, fill: `rgba(255, 198, 88, ${1 - (idx / (averageOrdersData.length - 1)) * 0.5})` }))}
                xDataKey="segment"
                barDataKey="평균주문건수"
                formatter={value => `${value.toLocaleString()}건`}
                layout="horizontal"
                barColor="rgb(255, 198, 88)" // CWDF YELLOW
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-md font-medium mb-2">객단가 평균값</h4>
              <BarChart
                data={avgTransactionData.map((d, idx) => ({ ...d, fill: `rgba(20, 160, 166, ${1 - (idx / (avgTransactionData.length - 1)) * 0.5})` }))}
                xDataKey="segment"
                barDataKey="평균객단가"
                formatter={value => `${value.toLocaleString()}원`}
                layout="horizontal"
                barColor="rgb(20, 160, 166)" // CWDF EMERALD
              />
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="text-md font-medium mb-2">객단가 중앙값</h4>
              <BarChart
                data={medianTransactionData.map((d, idx) => ({ ...d, fill: `rgba(255, 120, 101, ${1 - (idx / (medianTransactionData.length - 1)) * 0.5})` }))}
                xDataKey="segment"
                barDataKey="중앙객단가"
                formatter={value => `${value.toLocaleString()}원`}
                layout="horizontal"
                barColor="rgb(255, 120, 101)" // CWDF ORANGE
              />
            </div>
          </div>
        </div>
        {/* 시간대별 Top5 제품 */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">시간대별 Top5 제품</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            {segmentTopProducts.map(s => (
              <div key={s.segment} className="bg-white p-4 rounded-lg shadow">
                <h4 className="text-md font-medium mb-2">{s.segment} Top5</h4>
                <BarChart
                  data={s.top.map(item => ({ product: item.product_name, 개수: item.quantity }))}
                  xDataKey="product"
                  barDataKey="개수"
                  layout="vertical"
                  barColor="rgb(48, 127, 226)" // CWDF BLUE
                  formatter={value => `${value.toLocaleString()}건`}
                  yAxisWidth={60}
                  height={250}
                  tickFormatter={v => v.length > 8 ? v.slice(0,8)+'…' : v}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 시간대별 종합 분석 컴포넌트 */}
        <div className="bg-white p-6 rounded-lg shadow mb-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">⏰ 요일별/시간대별 데이터 종합 분석</h4>
            {!timeAnalysisSavedText && !timeAnalysisEditMode && (
              <button
                onClick={handleTimeAnalysis}
                disabled={timeAiAnalysisLoading || (!dayOfWeekData.length && !hourlyData.length)}
                className={`px-4 py-2 rounded-md font-medium ${
                  timeAiAnalysisLoading || (!dayOfWeekData.length && !hourlyData.length)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 transition-colors'
                }`}
              >
                {timeAiAnalysisLoading ? '분석 중...' : '요일/시간대 데이터 분석'}
              </button>
            )}
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <p>요일별 지표, 시간대별 지표, 시간대별 Top5 제품 데이터를 종합하여 운영 효율성 개선을 위한 인사이트를 제공합니다.</p>
          </div>

          {/* 분석 로딩 상태 */}
          {timeAiAnalysisLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">시간대별 데이터를 종합 분석하고 있습니다...</span>
            </div>
          )}

          {/* 분석 오류 메시지 */}
          {timeAiAnalysisError && (
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
                    {timeAiAnalysisError}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 분석 결과 편집 모드 */}
          {timeAnalysisEditMode && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-md font-medium text-gray-700">시간대별 분석 결과 편집</h5>
                <div className="flex gap-2">
                  <button
                    onClick={handleTimeAnalysisSave}
                    className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setTimeAnalysisEditMode(false);
                      setTimeAnalysisMarkdownText(timeAnalysisSavedText);
                    }}
                    className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 min-h-[300px] text-sm"
                value={timeAnalysisMarkdownText}
                onChange={e => setTimeAnalysisMarkdownText(e.target.value)}
                placeholder="시간대별 분석 결과를 편집하세요..."
              />
            </div>
          )}

          {/* 저장된 분석 결과 표시 */}
          {timeAnalysisSavedText && !timeAnalysisEditMode && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-md font-medium text-gray-700">저장된 시간대별 분석 결과</h5>
                <div className="flex gap-2">
                  <button
                    onClick={handleTimeAnalysisEdit}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    편집
                  </button>
                  <button
                    onClick={() => setTimeAnalysisSavedText('')}
                    className="px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-colors"
                  >
                    새 분석
                  </button>
                </div>
              </div>
              {(() => {
                const lines = timeAnalysisSavedText.split('\n');
                const isLong = lines.length > 15;
                const displayText = isLong && !timeAnalysisShowAll ? lines.slice(0, 15).join('\n') + '...' : timeAnalysisSavedText;
                
                return (
                  <div>
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                          {displayText}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {isLong && (
                      <button
                        onClick={() => setTimeAnalysisShowAll(prev => !prev)}
                        className="mt-3 mx-auto block px-4 py-2 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 transition-colors"
                      >
                        {timeAnalysisShowAll ? '접기' : '전체 분석 결과 보기'}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 새로운 분석 결과 표시 */}
          {timeAiAnalysisResult && !timeAnalysisSavedText && !timeAnalysisEditMode && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-md font-medium text-gray-700">시간대별 종합 분석 결과</h5>
                <div className="flex gap-2">
                  <button
                    onClick={handleTimeAnalysisSave}
                    className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setTimeAnalysisEditMode(true)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    편집
                  </button>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                    {timeAiAnalysisResult}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* 데이터가 없을 때 안내 메시지 */}
          {!dayOfWeekData.length && !hourlyData.length && !timeAiAnalysisLoading && !timeAiAnalysisResult && !timeAnalysisSavedText && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">시간대별 데이터를 불러온 후 분석을 진행할 수 있습니다.</p>
            </div>
          )}

          {/* 기본 안내 메시지 */}
          {(dayOfWeekData.length > 0 || hourlyData.length > 0) && !timeAiAnalysisResult && !timeAiAnalysisLoading && !timeAiAnalysisError && !timeAnalysisSavedText && !timeAnalysisEditMode && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>분석을 시작하려면 위의 "시간대별 종합 분석" 버튼을 클릭하세요.</p>
              <p className="text-sm mt-2">요일별, 시간대별, 인기 제품 데이터를 종합적으로 분석하여 운영 최적화 인사이트를 제공합니다.</p>
            </div>
          )}
        </div>

        <ReviewAnalysisSection onExportPdf={handleExportPdf} />

        {/* 내 매장 상세 리포트 - 페이지 최하단 */}
        <div className="bg-white p-6 rounded-lg shadow mb-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">📋 내 매장 상세 리포트</h2>
            {!detailReportSavedText && !detailReportEditMode && (
              <button
                onClick={handleDetailReportAnalysis}
                disabled={detailReportAiAnalysisLoading || !dailyData.length}
                className={`px-4 py-2 rounded-md font-medium ${
                  detailReportAiAnalysisLoading || !dailyData.length
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700 transition-colors'
                }`}
              >
                {detailReportAiAnalysisLoading ? '분석 중...' : '상세 리포트 생성'}
              </button>
            )}
            {(detailReportSavedText || detailReportEditMode) && (
              <div className="flex space-x-2">
                {!detailReportEditMode && (
                  <>
                    <button
                      onClick={handleDetailReportEdit}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      편집
                    </button>
                    <button
                      onClick={() => setDetailReportSavedText('')}
                      className="px-3 py-1 text-sm bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                    >
                      새 리포트
                    </button>
                  </>
                )}
                {detailReportEditMode && (
                  <>
                    <button
                      onClick={handleDetailReportSave}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setDetailReportEditMode(false);
                        setDetailReportMarkdownText(detailReportSavedText);
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
            <p>매장의 모든 운영 데이터를 종합하여 실무진이 바로 활용할 수 있는 상세한 매장 운영 가이드를 제공합니다.</p>
          </div>

          {/* 분석 로딩 상태 */}
          {detailReportAiAnalysisLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <span className="ml-3 text-gray-600">상세 리포트를 생성하고 있습니다...</span>
            </div>
          )}

          {/* 분석 오류 메시지 */}
          {detailReportAiAnalysisError && (
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
                    <p>{detailReportAiAnalysisError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 편집 모드 */}
          {detailReportEditMode && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">상세 리포트 내용 편집</label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-3 min-h-[400px] text-sm"
                value={detailReportMarkdownText}
                onChange={(e) => setDetailReportMarkdownText(e.target.value)}
                placeholder="상세 리포트 내용을 입력하거나 수정하세요..."
              />
            </div>
          )}

          {/* 저장된 분석 결과 표시 */}
          {detailReportSavedText && !detailReportEditMode && (
            <div>
              {(() => {
                const lines = detailReportSavedText.split('\n');
                const isLong = lines.length > 20;
                const displayText = isLong && !detailReportShowAll ? lines.slice(0, 20).join('\n') : detailReportSavedText;
                return (
                  <div>
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-6">
                      <div className="flex items-center mb-3">
                        <svg className="h-5 w-5 text-teal-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h5 className="text-md font-semibold text-teal-800">상세 리포트</h5>
                      </div>
                      <div className="prose max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkBreaks]}
                          className="text-gray-700 leading-relaxed"
                        >
                          {displayText}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {isLong && (
                      <button
                        onClick={() => setDetailReportShowAll((prev) => !prev)}
                        className="mt-4 mx-auto block px-6 py-2 bg-teal-500 text-white font-bold rounded-md shadow-lg transition-colors duration-200 hover:bg-teal-600"
                      >
                        {detailReportShowAll ? '접기' : '상세 리포트 전체보기'}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 새로운 분석 결과 (아직 저장되지 않음) */}
          {detailReportAiAnalysisResult && !detailReportAiAnalysisLoading && !detailReportSavedText && !detailReportEditMode && (
            <div>
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-6 mb-4">
                <div className="flex items-center mb-3">
                  <svg className="h-5 w-5 text-teal-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h5 className="text-md font-semibold text-teal-800">상세 리포트</h5>
                </div>
                <div className="prose max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkBreaks]}
                    className="text-gray-700 leading-relaxed"
                  >
                    {detailReportAiAnalysisResult}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setDetailReportEditMode(true)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  편집
                </button>
                <button
                  onClick={handleDetailReportSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          )}

          {/* 초기 상태 안내 메시지 */}
          {!detailReportAiAnalysisResult && !detailReportAiAnalysisLoading && !detailReportAiAnalysisError && !detailReportSavedText && !detailReportEditMode && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>상세 리포트를 생성하려면 위의 "상세 리포트 생성" 버튼을 클릭하세요.</p>
              <p className="text-sm mt-2">매장 운영에 필요한 모든 데이터를 종합하여 실무진이 바로 활용할 수 있는 상세 가이드를 제공합니다.</p>
            </div>
          )}
        </div>
      </div>
      <CacheClearButton />
      
      {/* 로딩 팝업 */}
      <LoadingPopup 
        isVisible={showLoadingPopup}
        message="데이터를 가져오고 있습니다"
        duration={3000}
        onComplete={() => setShowLoadingPopup(false)}
      />
    </>
  );
};

export default StoreStatusAnalysisPage;