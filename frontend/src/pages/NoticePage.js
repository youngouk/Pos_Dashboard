import React, { useState, useEffect } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
// import { noticeService } from '../services/api'; // API 호출 비활성화

const NoticePage = () => {
  const { filters, setLoading, setError } = useDashboard();
  
  // State for notices
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  
  // 목업 공지사항 데이터
  const mockNotices = [
    {
      id: 1,
      title: "2025년 1분기 생지 및 원두 발주 일정 안내",
      content: `각 점주님께 안녕하세요. 본사 구매팀입니다.

2025년 1분기 생지 및 원두 발주 일정을 안내드립니다.

발주 일정:
- 생지 발주: 매주 화요일 오후 6시까지
- 원두 발주: 격주 목요일 오후 5시까지
- 특수 재료: 매월 첫째 주 금요일까지

주요 변경사항:
- 프리미엄 밀가루 공급업체 변경으로 인한 품질 향상
- 원두 로스팅 주기 단축으로 신선도 개선
- 발주 시스템 업데이트로 실시간 재고 확인 가능

발주 관련 문의사항은 구매팀(내선 201)으로 연락 부탁드립니다.

원활한 매장 운영을 위해 발주 일정을 준수해 주시기 바랍니다.`,
      author: "구매팀",
      created_at: "2025-02-03T10:30:00Z",
      is_active: true
    },
    {
      id: 2,
      title: "2025년 1분기 매장 경영 분석 실시 예정",
      content: `점주님들께 안녕하세요. 경영지원팀입니다.

2025년 1분기 매장별 경영 분석을 실시할 예정입니다.

분석 일정: 2025년 3월 15일 ~ 4월 5일
분석 항목:
- 매출 성과 및 트렌드 분석
- 원가율 및 수익성 분석
- 고객 만족도 및 재방문율
- 운영 효율성 평가

사전 준비사항:
각 점주님께서는 담당 슈퍼바이저와 사전 미팅을 진행해 주시기 바랍니다.
- 미팅 일정: 3월 1일 ~ 3월 10일 중
- 준비 자료: 분기별 매출 현황, 주요 이슈사항, 개선 계획

담당 슈퍼바이저 연락처는 별도 안내드릴 예정입니다.

성공적인 분석을 위해 적극적인 협조 부탁드립니다.`,
      author: "경영지원팀",
      created_at: "2025-02-10T14:20:00Z",
      is_active: true
    },
    {
      id: 3,
      title: "강남역점 우수 성과 달성 축하 및 성공 사례 공유",
      content: `전체 점주님들께 기쁜 소식을 전해드립니다.

강남역점에서 2024년 4분기 대비 놀라운 성과를 달성했습니다.

성과 현황:
- 매출 증가율: 전 분기 대비 +34.2%
- 고객 만족도: 4.8/5.0 (전체 평균 4.3 대비)
- 신규 고객 유입률: +28.5%
- 재방문율: 87.3% (전체 평균 72.1% 대비)

주요 성공 요인:
1. 지역 특성에 맞는 메뉴 구성 및 마케팅
2. 직원 서비스 교육 강화
3. 매장 청결도 및 분위기 개선
4. SNS 활용한 적극적인 홍보 활동

강남역점 김○○ 점주님의 노하우를 다른 매장에도 공유할 예정입니다.
3월 중 우수 사례 발표회를 개최할 예정이니 많은 참여 부탁드립니다.

모든 점주님들의 성공을 응원합니다.`,
      author: "운영지원팀",
      created_at: "2025-02-18T16:45:00Z",
      is_active: true
    },
    {
      id: 4,
      title: "신제품 '프리미엄 베이글 라인' 출시 안내",
      content: `점주님들께 신제품 출시 소식을 전해드립니다.

출시 제품: 프리미엄 베이글 라인 (총 6종)
- 클래식 플레인 베이글
- 참깨 베이글
- 블루베리 베이글
- 크림치즈 베이글
- 연어 베이글
- 아보카도 베이글

출시일: 2025년 3월 8일 (토요일)
공급가: 개당 1,800원 ~ 2,500원
권장 판매가: 개당 3,200원 ~ 4,800원

제품 특징:
- 뉴욕 스타일 정통 베이글
- 24시간 저온 발효 공법
- 프리미엄 재료 사용
- 건강한 아침 식사 대안으로 포지셔닝

마케팅 지원:
- 런칭 첫 주 20% 할인 이벤트 지원
- POP 및 포스터 제작 지원
- SNS 마케팅 콘텐츠 제공

자세한 제품 정보 및 주문은 상품기획팀으로 연락 부탁드립니다.`,
      author: "상품기획팀",
      created_at: "2025-02-25T11:15:00Z",
      is_active: true
    },
    {
      id: 5,
      title: "1분기 지점별 운영비용 현황 업데이트 요청",
      content: `각 점주님께 안녕하세요. 재무관리팀입니다.

2025년 1분기 성과 분석을 위한 지점별 운영비용 현황 업데이트를 요청드립니다.

제출 기한: 2025년 3월 20일 (목요일) 오후 6시까지

제출 항목:
1. 인건비 현황 (정규직/파트타임 구분)
2. 임대료 및 관리비
3. 유틸리티 비용 (전기, 가스, 수도)
4. 마케팅 및 광고비
5. 기타 운영비 (소모품, 청소용품 등)

제출 방법:
- 본사 제공 엑셀 양식 사용 (첨부파일 참조)
- 이메일 제출: finance@company.com
- 문의: 재무관리팀 박○○ 대리 (내선 301)

정확한 성과 분석을 통해 각 매장의 수익성 개선 방안을 도출하고자 합니다.
기한 내 정확한 자료 제출 부탁드립니다.

감사합니다.`,
      author: "재무관리팀",
      created_at: "2025-03-05T09:40:00Z",
      is_active: true
    }
  ];
  
  // Fetch notices - API 호출 대신 목업 데이터 사용
  useEffect(() => {
    // 목업 데이터 로딩 시뮬레이션
    const loadMockNotices = () => {
      setLoading(true);
      
      // 로딩 시뮬레이션을 위한 setTimeout
      setTimeout(() => {
        setNotices(mockNotices);
        setError(null);
        setLoading(false);
      }, 500);
    };
    
    loadMockNotices();
    
    /* API 호출 코드 주석처리
    const fetchNotices = async () => {
      try {
        setLoading(true);
        
        const params = {
          // 활성 공지만 기본
          is_active: true,
          ...(filters?.selectedStore ? { store_name: filters.selectedStore } : {}),
        };

        const response = await noticeService.getNotices(params);
        
        setNotices(response.data);
        setError(null);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching notices:', error);
        setError('공지사항을 불러오는 데 실패했습니다.');
        setLoading(false);
      }
    };
    
    fetchNotices();
    */
  }, [filters.selectedStore, setLoading, setError]);
  
  // Format date to readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Handle notice selection
  const handleNoticeClick = (notice) => {
    setSelectedNotice(notice);
  };
  
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">공지사항</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Notice List - 전체 폭 사용 */}
        <div className="w-full">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold">전체 공지</h2>
          </div>
          
          <div className="divide-y">
            {notices.map((notice) => (
              <div key={notice.id}>
                {/* 공지사항 목록 아이템 */}
                <div
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedNotice && selectedNotice.id === notice.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNoticeClick(selectedNotice?.id === notice.id ? null : notice)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">{notice.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{formatDate(notice.created_at)}</span>
                      <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          selectedNotice && selectedNotice.id === notice.id ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notice.content.substring(0, 100)}...</p>
                </div>
                
                {/* 펼쳐지는 상세 내용 */}
                {selectedNotice && selectedNotice.id === notice.id && (
                  <div className="border-t bg-gray-50 p-6">
                    <div className="border-b border-gray-200 pb-4 mb-4">
                      <h2 className="text-xl font-semibold mb-2">{selectedNotice.title}</h2>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>{selectedNotice.author || '관리자'}</span>
                        <span>{formatDate(selectedNotice.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="prose max-w-none">
                      {selectedNotice.content.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-4 text-gray-700">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {notices.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p>공지사항이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticePage; 