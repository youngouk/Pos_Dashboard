import React from 'react';

/**
 * 로딩 팝업 컴포넌트
 * - 반투명 오버레이로 전체 화면을 덮음
 * - 로딩 애니메이션과 메시지 표시
 * - 자동으로 사라지는 기능
 */
const LoadingPopup = ({ 
  isVisible = true,
  message = "데이터를 가져오고 있습니다",
  duration = 2500, // 2.5초
  onComplete = () => {}
}) => {
  const [showPopup, setShowPopup] = React.useState(false);

  // 컴포넌트가 마운트될 때 0.5초 지연 후 팝업 표시
  React.useEffect(() => {
    if (isVisible) {
      const showTimer = setTimeout(() => {
        setShowPopup(true);
      }, 500); // 0.5초 지연

      const hideTimer = setTimeout(() => {
        setShowPopup(false);
        onComplete();
      }, 500 + duration); // 0.5초 지연 + duration만큼 표시

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setShowPopup(false);
    }
  }, [isVisible, duration, onComplete]);

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 반투명 배경 - 투명도를 더 높여서 뒤의 내용이 보이도록 */}
      <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm"></div>
      
      {/* 로딩 컨텐츠 */}
      <div className="relative z-10 bg-white bg-opacity-95 rounded-lg shadow-2xl p-8 mx-4 max-w-sm w-full">
        <div className="text-center">
          {/* 로딩 애니메이션 */}
          <div className="mb-6">
            <div className="relative mx-auto w-16 h-16">
              {/* 외부 원 */}
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              {/* 회전하는 원 */}
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              {/* 내부 펄스 */}
              <div className="absolute inset-2 bg-blue-100 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          {/* 로딩 메시지 */}
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {message}
          </h3>
          
          {/* 서브 메시지 */}
          <p className="text-sm text-gray-600">
            잠시만 기다려주세요...
          </p>
          
          {/* 점 애니메이션 */}
          <div className="flex justify-center mt-4 space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPopup; 