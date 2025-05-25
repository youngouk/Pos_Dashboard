import React from 'react';
import { FiClock, FiEye, FiLock } from 'react-icons/fi';

/**
 * 비공개 페이지용 오버레이 컴포넌트
 * - 페이지 전체를 반투명하게 덮음
 * - "추후 공개 예정" 메시지 표시
 * - 기대감을 주는 디자인
 */
const ComingSoonOverlay = ({ 
  title = "추후 공개 예정입니다",
  subtitle = "더 나은 서비스로 곧 찾아뵙겠습니다",
  showIcon = true,
  iconType = "clock", // "clock", "eye", "lock"
  className = ""
}) => {
  // 아이콘 선택
  const getIcon = () => {
    switch (iconType) {
      case "eye":
        return <FiEye size={48} className="text-blue-400" />;
      case "lock":
        return <FiLock size={48} className="text-gray-400" />;
      case "clock":
      default:
        return <FiClock size={48} className="text-blue-500" />;
    }
  };

  return (
    <div className={`
      fixed inset-0 z-50 
      bg-white bg-opacity-80 backdrop-blur-sm
      flex items-center justify-center
      ${className}
    `}>
      <div className="text-center p-8 max-w-md mx-4">
        {/* 아이콘 */}
        {showIcon && (
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-white rounded-full shadow-lg border border-gray-100">
              {getIcon()}
            </div>
          </div>
        )}
        
        {/* 메인 메시지 */}
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          {title}
        </h2>
        
        {/* 서브 메시지 */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {subtitle}
        </p>
        
        {/* 로딩 애니메이션 */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        
        {/* 추가 정보 */}
        <div className="mt-8 text-sm text-gray-500">
          <p>현재 페이지는 개발 중입니다</p>
          <p className="mt-1">빠른 시일 내에 공개하겠습니다</p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonOverlay; 