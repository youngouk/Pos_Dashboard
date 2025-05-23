import React, { useState } from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import StoreSelector from '../common/StoreSelector';
import { FiSearch, FiBell, FiCalendar, FiChevronDown } from 'react-icons/fi';

const Header = () => {
  const { userView, changeUserView, filters, updateFilters, stores } = useDashboard();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleViewChange = (view) => {
    changeUserView(view);
  };

  const handleDateRangeChange = (dateRange) => {
    updateFilters({ dateRange });
    setShowDatePicker(false);
  };

  const handleStoreChange = (selectedStore) => {
    updateFilters({ selectedStore });
  };

  // 사용자가 볼 수 있는 날짜 기간 텍스트 생성
  const getDateRangeLabel = () => {
    if (filters.dateRange.predefinedRange === 'custom') {
      // YYYY.MM.DD - YYYY.MM.DD 형식으로 변환
      const start = new Date(filters.dateRange.startDate);
      const end = new Date(filters.dateRange.endDate);
      
      const formatDate = (date) => {
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
      };
      
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    
    return getPeriodLabel(filters.dateRange.predefinedRange);
  };
  
  // 한글 기간 라벨 가져오기
  const getPeriodLabel = (range) => {
    switch(range) {
      case '1day': return '오늘';
      case '7days': return '이번주';
      case '30days': return '이번달';
      case 'last30days': return '지난달';
      case 'custom': return '커스텀 기간';
      default: return '이번달';
    }
  };

  // 현재 날짜 기준으로 지난달 범위 계산
  const getLastMonthRange = () => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    
    const firstDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-panze-dark">ABC bakery 대시보드</h1>
          <p className="text-gray-500 text-sm mt-1">주요한 KPI를 한눈에 확인하세요</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="검색..."
              className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-panze-blue focus:border-transparent w-64"
            />
            <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          </div>
          
          <div className="bg-gray-100 rounded-full p-1">
            <div className="flex">
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  userView === 'headquarters' 
                    ? 'bg-panze-dark text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => handleViewChange('headquarters')}
              >
                본사
              </button>
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  userView === 'supervisor' 
                    ? 'bg-panze-dark text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => handleViewChange('supervisor')}
              >
                슈퍼바이저
              </button>
            </div>
          </div>
          
          <button className="p-2 rounded-full hover:bg-gray-100 relative">
            <FiBell size={20} className="text-gray-500" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-panze-red rounded-full"></span>
          </button>
          
          <div className="w-10 h-10 rounded-full bg-panze-orange flex items-center justify-center text-white font-bold">
            LP
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3 mb-6">
        {/* 기간 선택 버튼 그룹 */}
        <div className="bg-gray-100 p-1 rounded-full flex">
          {[
            { label: '1월', start: '2025-01-01', end: '2025-01-31' },
            { label: '2월', start: '2025-02-01', end: '2025-02-28' },
            { label: '3월', start: '2025-03-01', end: '2025-03-31' },
          ].map(({ label, start, end }) => {
            const isActive = filters.dateRange.startDate === start && filters.dateRange.endDate === end;
            return (
              <button
                key={label}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive ? 'bg-panze-dark text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => handleDateRangeChange({ startDate: start, endDate: end })}
              >
                {label}
              </button>
            );
          })}
        </div>
        
        <div className="flex space-x-2 ml-auto">
          <StoreSelector
            stores={stores}
            selectedStore={filters.selectedStore}
            onChange={handleStoreChange}
          />
        </div>
      </div>
      
      <div className="h-px bg-gray-200 mb-6"></div>
    </div>
  );
};

export default Header;