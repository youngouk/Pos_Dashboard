import React, { useState } from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import DateRangePicker from './DateRangePicker';
import StoreSelector from './StoreSelector';

const FilterBar = ({ onFilterApply }) => {
  const { filters, updateFilters } = useDashboard();
  const [tempFilters, setTempFilters] = useState({
    dateRange: filters.dateRange,
    selectedStore: filters.selectedStore,
    productCategory: filters.productCategory || '',
    metric: 'total_sales',
    paymentType: '',
  });
  const [expanded, setExpanded] = useState(false);

  const handleDateRangeChange = (dateRange) => {
    setTempFilters(prev => ({
      ...prev,
      dateRange,
    }));
  };

  const handleStoreChange = (selectedStore) => {
    setTempFilters(prev => ({
      ...prev,
      selectedStore,
    }));
  };

  const handleCategoryChange = (e) => {
    setTempFilters(prev => ({
      ...prev,
      productCategory: e.target.value,
    }));
  };

  const handleMetricChange = (e) => {
    setTempFilters(prev => ({
      ...prev,
      metric: e.target.value,
    }));
  };

  const handlePaymentTypeChange = (e) => {
    setTempFilters(prev => ({
      ...prev,
      paymentType: e.target.value,
    }));
  };

  const handleApply = () => {
    updateFilters(tempFilters);
    if (onFilterApply) {
      onFilterApply(tempFilters);
    }
  };

  const handleReset = () => {
    const resetFilters = {
      dateRange: {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      },
      selectedStore: '',
      productCategory: '',
      metric: 'total_sales',
      paymentType: '',
    };
    setTempFilters(resetFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">필터</h2>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${expanded ? '' : 'hidden'}`}>
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">날짜 범위</label>
          <DateRangePicker
            startDate={tempFilters.dateRange.startDate}
            endDate={tempFilters.dateRange.endDate}
            onChange={handleDateRangeChange}
            withApplyButton={true}
            onApply={() => {}} // 날짜 범위 선택기 내부의 적용 버튼은 필터바 적용 버튼과 중복되므로 빈 함수 전달
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">매장</label>
          <StoreSelector
            stores={filters.stores || []}
            selectedStore={tempFilters.selectedStore}
            onChange={handleStoreChange}
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">제품 카테고리</label>
          <select
            value={tempFilters.productCategory}
            onChange={handleCategoryChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md"
          >
            <option value="">전체 카테고리</option>
            <option value="bread">빵류</option>
            <option value="pastry">페이스트리</option>
            <option value="cake">케이크</option>
            <option value="sandwich">샌드위치</option>
            <option value="beverage">음료</option>
          </select>
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">지표</label>
          <select
            value={tempFilters.metric}
            onChange={handleMetricChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md"
          >
            <option value="total_sales">총 매출</option>
            <option value="customer_count">고객수</option>
            <option value="average_ticket">평균 객단가</option>
            <option value="units_sold">판매 수량</option>
          </select>
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">결제 방식</label>
          <select
            value={tempFilters.paymentType}
            onChange={handlePaymentTypeChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md"
          >
            <option value="">전체 결제 방식</option>
            <option value="credit_card">신용카드</option>
            <option value="cash">현금</option>
            <option value="mobile_pay">모바일 결제</option>
            <option value="gift_card">상품권</option>
          </select>
        </div>

        <div className="col-span-1 flex items-end space-x-2">
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
          >
            적용
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
          >
            초기화
          </button>
        </div>
      </div>

      {!expanded && (
        <div className="flex flex-wrap gap-2">
          {tempFilters.dateRange && (
            <div className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <span>{tempFilters.dateRange.startDate} ~ {tempFilters.dateRange.endDate}</span>
            </div>
          )}
          {/* 매장 필터는 항상 표시 (전체 매장 또는 특정 매장) */}
          <div className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <span>매장: {tempFilters.selectedStore ? tempFilters.selectedStore : '전체 매장 합계'}</span>
          </div>
          {tempFilters.productCategory && (
            <div className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <span>카테고리: {tempFilters.productCategory}</span>
            </div>
          )}
          {tempFilters.paymentType && (
            <div className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <span>결제 방식: {tempFilters.paymentType}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;