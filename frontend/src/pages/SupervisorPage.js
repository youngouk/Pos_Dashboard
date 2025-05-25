import React, { useState } from 'react';
import { FiCalendar, FiBarChart2, FiMessageSquare, FiClock, FiMapPin, FiTrendingUp, FiUsers, FiSend, FiPlus } from 'react-icons/fi';
import ComingSoonOverlay from '../components/common/ComingSoonOverlay';

/**
 * 슈퍼바이저 전용 페이지
 * - 관리 매장 스케줄 관리
 * - 다중 매장 비교 분석
 * - 점주 메시지 기능
 */
const SupervisorPage = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedStores, setSelectedStores] = useState(['석촌점', '명동점']);
  const [messageText, setMessageText] = useState('');

  // 목업 데이터
  const scheduleData = [
    {
      id: 1,
      type: 'meeting',
      title: '석촌점 월간 미팅',
      store: '석촌점',
      date: '2025-02-15',
      time: '14:00',
      status: 'scheduled'
    },
    {
      id: 2,
      type: 'order',
      title: '명동점 원두 발주',
      store: '명동점',
      date: '2025-02-18',
      time: '10:00',
      status: 'pending'
    },
    {
      id: 3,
      type: 'inspection',
      title: '몽핀점 위생 점검',
      store: '몽핀점',
      date: '2025-02-20',
      time: '16:00',
      status: 'completed'
    }
  ];

  const storeComparisonData = [
    {
      store: '석촌점',
      sales: 15420000,
      growth: 12.5,
      customers: 1240,
      rating: 4.6,
      status: 'good'
    },
    {
      store: '명동점',
      sales: 18750000,
      growth: 8.3,
      customers: 1580,
      rating: 4.8,
      status: 'excellent'
    },
    {
      store: '몽핀점',
      sales: 9850000,
      growth: -2.1,
      customers: 890,
      rating: 4.2,
      status: 'warning'
    }
  ];

  const managedStores = ['석촌점', '명동점', '몽핀점', '강남점', '홍대점'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScheduleTypeIcon = (type) => {
    switch (type) {
      case 'meeting': return <FiUsers className="text-blue-500" />;
      case 'order': return <FiPlus className="text-green-500" />;
      case 'inspection': return <FiClock className="text-orange-500" />;
      default: return <FiCalendar className="text-gray-500" />;
    }
  };

  return (
    <div className="relative px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">슈퍼바이저 관리 센터</h1>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`flex items-center px-6 py-4 text-sm font-medium ${
              activeTab === 'schedule'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('schedule')}
          >
            <FiCalendar className="mr-2" />
            스케줄 관리
          </button>
          <button
            className={`flex items-center px-6 py-4 text-sm font-medium ${
              activeTab === 'comparison'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('comparison')}
          >
            <FiBarChart2 className="mr-2" />
            매장 비교
          </button>
          <button
            className={`flex items-center px-6 py-4 text-sm font-medium ${
              activeTab === 'message'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('message')}
          >
            <FiMessageSquare className="mr-2" />
            점주 메시지
          </button>
        </div>
      </div>

      {/* 스케줄 관리 탭 */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* 스케줄 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FiCalendar className="text-blue-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">이번 주 미팅</p>
                  <p className="text-2xl font-bold text-gray-900">3건</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FiPlus className="text-green-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">발주 예정</p>
                  <p className="text-2xl font-bold text-gray-900">5건</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <FiClock className="text-orange-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">점검 일정</p>
                  <p className="text-2xl font-bold text-gray-900">2건</p>
                </div>
              </div>
            </div>
          </div>

          {/* 스케줄 리스트 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">이번 주 일정</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {scheduleData.map((item) => (
                  <div key={item.id} className="flex items-center p-4 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0 mr-4">
                      {getScheduleTypeIcon(item.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <FiMapPin className="mr-1" size={14} />
                        <span className="mr-4">{item.store}</span>
                        <FiClock className="mr-1" size={14} />
                        <span>{item.date} {item.time}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'completed' ? 'bg-green-100 text-green-800' :
                      item.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status === 'completed' ? '완료' :
                       item.status === 'scheduled' ? '예정' : '대기'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 매장 비교 탭 */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* 매장 선택 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">비교할 매장 선택</h3>
            <div className="flex flex-wrap gap-2">
              {managedStores.map((store) => (
                <button
                  key={store}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedStores.includes(store)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => {
                    if (selectedStores.includes(store)) {
                      setSelectedStores(selectedStores.filter(s => s !== store));
                    } else {
                      setSelectedStores([...selectedStores, store]);
                    }
                  }}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>

          {/* 매장 비교 테이블 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">매장 성과 비교</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      매장명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      월 매출
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      성장률
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      고객 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      평점
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {storeComparisonData.map((store) => (
                    <tr key={store.store}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiMapPin className="mr-2 text-gray-400" />
                          <span className="font-medium text-gray-900">{store.store}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {store.sales.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiTrendingUp className={`mr-1 ${store.growth > 0 ? 'text-green-500' : 'text-red-500'}`} />
                          <span className={`text-sm font-medium ${store.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {store.growth > 0 ? '+' : ''}{store.growth}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {store.customers.toLocaleString()}명
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ⭐ {store.rating}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(store.status)}`}>
                          {store.status === 'excellent' ? '우수' :
                           store.status === 'good' ? '양호' :
                           store.status === 'warning' ? '주의' : '보통'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 점주 메시지 탭 */}
      {activeTab === 'message' && (
        <div className="space-y-6">
          {/* 메시지 작성 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">점주에게 메시지 보내기</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수신 매장 선택
                </label>
                <div className="flex flex-wrap gap-2">
                  {managedStores.map((store) => (
                    <label key={store} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        defaultChecked={store === '석촌점'}
                      />
                      <span className="text-sm text-gray-700">{store}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메시지 내용
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="점주님께 전달할 메시지를 입력하세요..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <FiSend className="mr-2" size={16} />
                  메시지 전송
                </button>
              </div>
            </div>
          </div>

          {/* 최근 메시지 히스토리 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">최근 메시지 히스토리</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    store: '석촌점',
                    message: '이번 주 매출 목표 달성을 위해 프로모션 진행 부탁드립니다.',
                    date: '2025-02-10 14:30',
                    status: 'read'
                  },
                  {
                    id: 2,
                    store: '명동점',
                    message: '원두 재고 확인 및 발주 일정 조율 필요합니다.',
                    date: '2025-02-09 10:15',
                    status: 'delivered'
                  },
                  {
                    id: 3,
                    store: '몽핀점',
                    message: '고객 만족도 개선을 위한 서비스 교육 일정을 잡겠습니다.',
                    date: '2025-02-08 16:45',
                    status: 'read'
                  }
                ].map((msg) => (
                  <div key={msg.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <FiMapPin className="mr-2 text-gray-400" size={16} />
                        <span className="font-medium text-gray-900">{msg.store}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-2">{msg.date}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          msg.status === 'read' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {msg.status === 'read' ? '읽음' : '전송됨'}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon 오버레이 */}
      <ComingSoonOverlay
        title="슈퍼바이저 관리 센터"
        subtitle="매장 관리와 점주 소통을 위한 전용 기능을 준비 중입니다"
        iconType="eye"
        sidebarWidth="200px"
      />
    </div>
  );
};

export default SupervisorPage; 