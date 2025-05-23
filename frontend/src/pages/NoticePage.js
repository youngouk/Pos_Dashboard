import React, { useState, useEffect } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { noticeService } from '../services/api';

const NoticePage = () => {
  const { filters, setLoading, setError } = useDashboard();
  
  // State for notices
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  
  // Fetch notices
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setLoading(true);
        
        const params = {
          // 활성 공지만 기본
          is_active: true,
          ...(filters?.selectedStore ? { store_name: filters.selectedStore } : {}),
        };

        const response = await noticeService.getNotices(params);
        
        setNotices(response.data);
        setError(null);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching notices:', error);
        setError('공지사항을 불러오는 데 실패했습니다.');
        setLoading(false);
      }
    };
    
    fetchNotices();
  }, [filters.selectedStore, setLoading, setError]);
  
  // Format date to readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Handle notice selection
  const handleNoticeClick = (notice) => {
    setSelectedNotice(notice);
  };
  
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">공지사항</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Notice List */}
        <div className={`border-b ${selectedNotice ? 'hidden md:block md:w-1/3' : 'w-full'}`}>
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold">전체 공지</h2>
          </div>
          
          <div className="divide-y">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  selectedNotice && selectedNotice.id === notice.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNoticeClick(notice)}
              >
                <div className="flex justify-between">
                  <h3 className="font-medium">{notice.title}</h3>
                  <span className="text-xs text-gray-500">{formatDate(notice.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notice.content.substring(0, 100)}...</p>
              </div>
            ))}
            
            {notices.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p>공지사항이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Notice Detail */}
        {selectedNotice && (
          <div className="p-6 md:w-2/3 md:border-l">
            <div className="mb-4 md:hidden">
              <button
                onClick={() => setSelectedNotice(null)}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                목록으로 돌아가기
              </button>
            </div>
            
            <div className="border-b pb-4 mb-4">
              <h2 className="text-xl font-semibold mb-2">{selectedNotice.title}</h2>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{selectedNotice.author || '관리자'}</span>
                <span>{formatDate(selectedNotice.created_at)}</span>
              </div>
            </div>
            
            <div className="prose max-w-none">
              {selectedNotice.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticePage; 