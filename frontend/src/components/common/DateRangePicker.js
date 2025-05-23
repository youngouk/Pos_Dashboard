import React, { useState, useEffect } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, subDays } from 'date-fns';

const DateRangePicker = ({ startDate, endDate, onChange, onApply, withApplyButton = false }) => {
  // Parse string dates to Date objects
  const [start, setStart] = useState(new Date(startDate));
  const [end, setEnd] = useState(new Date(endDate));
  // 임시 상태 추가: 사용자가 날짜를 변경하면 여기에 저장됨 (즉시 적용 안 됨)
  const [tempDateRange, setTempDateRange] = useState({
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  });

  // 컴포넌트가 마운트될 때 props로 받은 날짜로 초기화
  useEffect(() => {
    setStart(new Date(startDate));
    setEnd(new Date(endDate));
    setTempDateRange({
      startDate: startDate,
      endDate: endDate,
    });
  }, [startDate, endDate]);

  // Handler for start date change
  const handleStartChange = (date) => {
    setStart(date);
    
    // 임시 상태만 업데이트
    setTempDateRange({
      startDate: format(date, 'yyyy-MM-dd'),
      endDate: tempDateRange.endDate,
    });
    
    // 적용 버튼이 없을 경우에만 즉시 변경 적용 (기존 동작 유지)
    if (!withApplyButton) {
      onChange({
        startDate: format(date, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      });
    }
  };

  // Handler for end date change
  const handleEndChange = (date) => {
    setEnd(date);
    
    // 임시 상태만 업데이트
    setTempDateRange({
      startDate: tempDateRange.startDate,
      endDate: format(date, 'yyyy-MM-dd'),
    });
    
    // 적용 버튼이 없을 경우에만 즉시 변경 적용 (기존 동작 유지)
    if (!withApplyButton) {
      onChange({
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(date, 'yyyy-MM-dd'),
      });
    }
  };

  // 적용 버튼 클릭 핸들러
  const handleApply = () => {
    onChange(tempDateRange);
    
    // 상위 컴포넌트의 적용 이벤트 핸들러 호출 (있는 경우)
    if (onApply) {
      onApply(tempDateRange);
    }
  };

  // Quick date selection handlers
  const handleQuickSelect = (days) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    setStart(startDate);
    setEnd(endDate);
    
    const newDateRange = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
    
    // 임시 상태 업데이트
    setTempDateRange(newDateRange);
    
    // 적용 버튼이 없을 경우에만 즉시 변경 적용 (기존 동작 유지)
    if (!withApplyButton) {
      onChange(newDateRange);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex space-x-2 mb-2">
        <button
          onClick={() => handleQuickSelect(7)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
        >
          7일
        </button>
        <button
          onClick={() => handleQuickSelect(30)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
        >
          30일
        </button>
        <button
          onClick={() => handleQuickSelect(90)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
        >
          3개월
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        <ReactDatePicker
          selected={start}
          onChange={handleStartChange}
          selectsStart
          startDate={start}
          endDate={end}
          dateFormat="yyyy-MM-dd"
          className="w-32 px-2 py-1 border rounded text-sm"
        />
        <span>~</span>
        <ReactDatePicker
          selected={end}
          onChange={handleEndChange}
          selectsEnd
          startDate={start}
          endDate={end}
          minDate={start}
          maxDate={new Date()}
          dateFormat="yyyy-MM-dd"
          className="w-32 px-2 py-1 border rounded text-sm"
        />
        
        {/* 적용 버튼 조건부 렌더링 */}
        {withApplyButton && (
          <button
            onClick={handleApply}
            className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            적용
          </button>
        )}
      </div>
    </div>
  );
};

export default DateRangePicker;