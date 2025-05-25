import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiGrid, 
  FiBarChart2, 
  FiPieChart, 
  FiTrendingUp, 
  FiSettings, 
  FiUsers, 
  FiHelpCircle,
  FiFileText,
  FiFile,
  FiChevronRight,
  FiChevronLeft,
  FiCode,
  FiGitMerge
} from 'react-icons/fi';
import { useDashboard } from '../../contexts/DashboardContext';

const Sidebar = () => {
  const location = useLocation();
  const { sidebarExpanded, setSidebarExpanded } = useDashboard();
  
  const menuItems = [
    { path: '/blank', label: '매장 현황분석', icon: <FiPieChart size={22} /> },
    { path: '/benchmark', label: '매장 비교분석', icon: <FiGitMerge size={22} /> },
    { path: '/dashboard', label: '대시보드', icon: <FiGrid size={22} /> },
    { path: '/sales', label: '매출 분석', icon: <FiFile size={22} /> },
   // { path: '/analytics', label: '고급 분석', icon: <FiBarChart2 size={22} /> },
    { path: '/trends', label: '트렌드', icon: <FiTrendingUp size={22} /> },
   // { path: '/compare', label: '매장 비교', icon: <FiUsers size={22} /> },
    { path: '/notice', label: '공지사항', icon: <FiFileText size={22} /> },
  ];

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  return (
    <div className={`${sidebarExpanded ? 'w-[200px]' : 'w-[80px]'} bg-white flex-shrink-0 flex flex-col items-center py-6 shadow-md z-10 transition-all duration-300`}>
      <div className="mb-8 flex items-center justify-center">
        <Link to="/" className="flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          {sidebarExpanded && <span className="ml-2 font-semibold text-panze-dark">ABC bakery</span>}
        </Link>
      </div>
      
      <div className="flex flex-col items-center w-full px-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`w-full p-3 rounded-lg transition-colors flex ${sidebarExpanded ? 'justify-start' : 'justify-center'} items-center ${
              location.pathname === item.path
                ? 'bg-panze-dark text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-panze-dark'
            }`}
            title={item.label}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {sidebarExpanded && <span className="ml-3 text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </div>
      
      <div className="mt-auto flex flex-col w-full px-4 space-y-2 pt-10">
        <Link
          to="/api-test"
          className={`w-full p-3 rounded-lg transition-colors flex ${sidebarExpanded ? 'justify-start' : 'justify-center'} items-center ${
            location.pathname === '/api-test'
              ? 'bg-panze-dark text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-panze-dark'
          }`}
          title="API 테스트"
        >
          <span className="flex-shrink-0"><FiCode size={22} /></span>
          {sidebarExpanded && <span className="ml-3 text-sm font-medium">API 테스트</span>}
        </Link>
        <Link
          to="/settings"
          className={`w-full p-3 rounded-lg transition-colors flex ${sidebarExpanded ? 'justify-start' : 'justify-center'} items-center ${
            location.pathname === '/settings'
              ? 'bg-panze-dark text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-panze-dark'
          }`}
          title="설정"
        >
          <span className="flex-shrink-0"><FiSettings size={22} /></span>
          {sidebarExpanded && <span className="ml-3 text-sm font-medium">설정</span>}
        </Link>
        <Link
          to="/help"
          className={`w-full p-3 rounded-lg transition-colors flex ${sidebarExpanded ? 'justify-start' : 'justify-center'} items-center ${
            location.pathname === '/help'
              ? 'bg-panze-dark text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-panze-dark'
          }`}
          title="도움말"
        >
          <span className="flex-shrink-0"><FiHelpCircle size={22} /></span>
          {sidebarExpanded && <span className="ml-3 text-sm font-medium">도움말</span>}
        </Link>
      </div>
      
      {/* 사이드바 접고 펼치기 버튼 */}
      <button 
        onClick={toggleSidebar}
        className="mt-8 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
        title={sidebarExpanded ? "사이드바 접기" : "사이드바 펼치기"}
      >
        {sidebarExpanded ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
      </button>
    </div>
  );
};

export default Sidebar;