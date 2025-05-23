from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# 공지사항 모델
class Notice(BaseModel):
    """공지사항 모델"""
    id: Optional[int] = None
    title: str
    content: str
    author: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True
    importance: int = 1  # 1=일반, 2=중요, 3=긴급
    target_stores: Optional[List[str]] = None

# 공지사항 생성 요청 모델
class NoticeCreate(BaseModel):
    """공지사항 생성 요청 모델"""
    title: str
    content: str
    author: str
    importance: int = Field(1, ge=1, le=3)
    target_stores: Optional[List[str]] = None

# 공지사항 수정 요청 모델
class NoticeUpdate(BaseModel):
    """공지사항 수정 요청 모델"""
    title: Optional[str] = None
    content: Optional[str] = None
    importance: Optional[int] = Field(None, ge=1, le=3)
    is_active: Optional[bool] = None
    target_stores: Optional[List[str]] = None

# 공지사항 응답 모델
class NoticeResponse(BaseModel):
    """공지사항 응답 모델"""
    id: int
    title: str
    content: str
    author: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool
    importance: int
    target_stores: Optional[List[str]] = None
    
    class Config:
        from_attributes = True

# 공지사항 필터 파라미터 모델
class NoticeFilterParams(BaseModel):
    """공지사항 필터링 파라미터 모델"""
    store_name: Optional[str] = None
    importance: Optional[int] = None
    is_active: Optional[bool] = True
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None 