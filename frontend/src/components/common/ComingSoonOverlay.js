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
  className = "",
  sidebarWidth = "200px" // 사이드바 너비 (확장된 상태 기준)
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
      fixed top-0 bottom-0 right-0 z-[9999]
      bg-white bg-opacity-40 backdrop-blur-sm
      flex items-center justify-center
      ${className}
    `} style={{ left: sidebarWidth }}>
      {/* 
        투명도 설정 설명:
        - bg-white: 배경색을 흰색으로 설정
        - bg-opacity-95: 배경의 투명도를 95%로 설정 (5% 투명, 95% 불투명)
        - backdrop-blur-sm: 뒤의 콘텐츠에 약간의 블러 효과 적용
        
        투명도 옵션:
        - bg-opacity-90: 90% 불투명 (10% 투명) - 더 투명하게
        - bg-opacity-95: 95% 불투명 (5% 투명) - 현재 설정
        - bg-opacity-100: 100% 불투명 (완전히 가림)
      */}
      <div className="text-center p-8 max-w-md mx-auto">
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
        </div>
      </div>
    </div>
  );
};

export default ComingSoonOverlay; 