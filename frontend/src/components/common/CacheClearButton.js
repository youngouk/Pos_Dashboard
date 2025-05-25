import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';

/**
 * 캐시 초기화 버튼 컴포넌트
 * - 로컬스토리지와 세션스토리지 캐시 초기화
 * - 페이지 새로고침
 * - 작은 크기로 페이지 하단에 배치용
 */
const CacheClearButton = ({ 
  className = "", 
  size = "small", 
  showText = true,
  position = "bottom-right" 
}) => {
  const clearCacheAndReload = () => {
    try {
      // 로컬스토리지 캐시 초기화
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('cache') || key.includes('api') || key.includes('dashboard')) {
          localStorage.removeItem(key);
        }
      });
      
      // 세션스토리지 캐시 초기화
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('cache') || key.includes('api') || key.includes('dashboard')) {
          sessionStorage.removeItem(key);
        }
      });
      
      console.log('🗑️ 캐시 초기화 완료');
      
      // 페이지 새로고침
      window.location.reload();
    } catch (error) {
      console.error('캐시 초기화 중 오류:', error);
      // 오류가 발생해도 새로고침은 실행
      window.location.reload();
    }
  };

  // 크기별 스타일 설정
  const sizeStyles = {
    small: "px-2 py-1 text-xs",
    medium: "px-3 py-1 text-sm", 
    large: "px-4 py-2 text-base"
  };

  // 위치별 스타일 설정
  const positionStyles = {
    "bottom-right": "fixed bottom-4 right-4 z-50",
    "bottom-left": "fixed bottom-4 left-4 z-50",
    "inline": "inline-block",
    "float-right": "float-right"
  };

  const baseClasses = `
    bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 
    transition-colors duration-200 flex items-center space-x-1
    border border-gray-200 hover:border-gray-300
    shadow-sm hover:shadow-md
  `;

  return (
    <button 
      onClick={clearCacheAndReload}
      className={`
        ${baseClasses}
        ${sizeStyles[size]}
        ${positionStyles[position]}
        ${className}
      `}
      title="캐시를 초기화하고 페이지를 새로고침합니다"
    >
      <FiRefreshCw size={size === 'small' ? 12 : size === 'medium' ? 14 : 16} />
      {showText && <span>캐시 초기화</span>}
    </button>
  );
};

export default CacheClearButton; 