import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useDashboard } from '../../contexts/DashboardContext';

const Layout = ({ children }) => {
  const { isLoading, error, sidebarExpanded } = useDashboard();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-start to-gradient-end">
      <div className="flex min-h-screen">
        {/* 왼쪽 아이콘 사이드바 */}
        <Sidebar />
        
        {/* 메인 컨텐츠 영역 */}
        <div className={`flex-1 p-6 transition-all duration-300 ${sidebarExpanded ? 'ml-0' : 'ml-0'}`}>
          <div className="max-w-7xl mx-auto bg-white rounded-panze-lg shadow-panze p-6 min-h-[calc(100vh-48px)]">
            {/* 상단 헤더 */}
            <Header />
            
            {/* 메인 콘텐츠 */}
            <main className="mt-6">
              {/* 메인 페이지 콘텐츠 */}
              {children}

              {/* 에러 메시지 */}
              {error && (
                <div className="p-4 my-4 text-sm text-red-700 bg-red-100 rounded-lg">
                  <p>{error}</p>
                </div>
              )}

              {/* 로딩 오버레이 */}
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50 rounded-panze-lg">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent"></div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;