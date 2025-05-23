import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiCheckCircle } from 'react-icons/fi';

const StoreSelector = ({ stores = [], selectedStore, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.store-selector-container')) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 기본값 설정 로직 제거 - 부모 컴포넌트에서 관리
  
  const handleStoreChange = (store) => {
    console.log('매장 선택 변경:', { 이전매장: selectedStore, 새매장: store }); 
    onChange(store);
    setIsOpen(false);
  };
  
  const getDisplayName = () => {
    // selectedStore가 있으면 그것을 표시, 없으면 기본 텍스트
    return selectedStore || '매장 선택';
  };
  
  return (
    <div className={`relative store-selector-container ${className}`}>
      <button
        type="button"
        className="flex items-center justify-between px-4 py-2 text-sm bg-white border border-gray-200 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="truncate font-medium">
          {getDisplayName()}
        </span>
        <FiChevronDown className={`ml-2 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-50 w-48 mt-2 bg-white shadow-lg rounded-lg border border-gray-100 max-h-64 overflow-y-auto">
          <ul className="py-1">
            {Array.isArray(stores) && stores.map((store) => (
              <li
                key={store}
                className={`px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm flex items-center justify-between ${selectedStore === store ? 'bg-blue-50 text-blue-700' : ''}`}
                onClick={() => handleStoreChange(store)}
              >
                <div className="flex items-center">
                  <input 
                    type="radio"
                    checked={selectedStore === store}
                    readOnly
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2">{store}</span>
                </div>
                {selectedStore === store && <FiCheckCircle className="text-blue-500" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StoreSelector;