## notice.py

from fastapi import APIRouter, Path, Query, HTTPException, Depends
from typing import List, Optional
from datetime import datetime

from app.models.notice import (
    Notice,
    NoticeCreate,
    NoticeUpdate,
    NoticeResponse,
    NoticeFilterParams
)
from app.services.notice_service import notice_service

router = APIRouter()

@router.get("/", response_model=List[NoticeResponse])
async def get_all_notices(
    store_name: Optional[str] = Query(None, description="매장 이름 필터"),
    importance: Optional[int] = Query(None, description="중요도 필터 (1=일반, 2=중요, 3=긴급)"),
    is_active: Optional[bool] = Query(True, description="활성 상태 필터"),
    from_date: Optional[datetime] = Query(None, description="시작 날짜 필터"),
    to_date: Optional[datetime] = Query(None, description="종료 날짜 필터")
):
    """
    모든 공지사항을 조회합니다.
    
    - **store_name**: 매장 이름 필터 (특정 매장 대상 공지만 조회)
    - **importance**: 중요도 필터 (1=일반, 2=중요, 3=긴급)
    - **is_active**: 활성 상태 필터 (기본값: 활성 공지만)
    - **from_date**: 시작 날짜 필터
    - **to_date**: 종료 날짜 필터
    """
    return await notice_service.get_all_notices(
        store_name, 
        importance, 
        is_active, 
        from_date, 
        to_date
    )

@router.get("/{notice_id}", response_model=NoticeResponse)
async def get_notice_by_id(
    notice_id: int = Path(..., description="조회할 공지사항 ID")
):
    """
    ID로 특정 공지사항을 조회합니다.
    
    - **notice_id**: 조회할 공지사항 ID
    """
    notice = await notice_service.get_notice_by_id(notice_id)
    
    if not notice:
        raise HTTPException(status_code=404, detail=f"공지사항 ID {notice_id}를 찾을 수 없습니다.")
        
    return notice

@router.post("/", response_model=NoticeResponse, status_code=201)
async def create_notice(
    notice_data: NoticeCreate
):
    """
    새 공지사항을 생성합니다.
    
    Request Body:
    - **title**: 공지사항 제목
    - **content**: 공지사항 내용
    - **author**: 작성자
    - **importance**: 중요도 (1=일반, 2=중요, 3=긴급)
    - **target_stores**: 대상 매장 리스트 (옵션)
    """
    return await notice_service.create_notice(notice_data)

@router.put("/{notice_id}", response_model=NoticeResponse)
async def update_notice(
    notice_id: int = Path(..., description="수정할 공지사항 ID"),
    notice_data: NoticeUpdate = None
):
    """
    공지사항을 수정합니다.
    
    - **notice_id**: 수정할 공지사항 ID
    
    Request Body:
    - **title**: 공지사항 제목 (옵션)
    - **content**: 공지사항 내용 (옵션)
    - **importance**: 중요도 (옵션, 1=일반, 2=중요, 3=긴급)
    - **is_active**: 활성 상태 (옵션)
    - **target_stores**: 대상 매장 리스트 (옵션)
    """
    updated_notice = await notice_service.update_notice(notice_id, notice_data)
    
    if not updated_notice:
        raise HTTPException(status_code=404, detail=f"공지사항 ID {notice_id}를 찾을 수 없습니다.")
        
    return updated_notice

@router.delete("/{notice_id}", status_code=204)
async def delete_notice(
    notice_id: int = Path(..., description="삭제할 공지사항 ID")
):
    """
    공지사항을 삭제합니다.
    
    - **notice_id**: 삭제할 공지사항 ID
    """
    success = await notice_service.delete_notice(notice_id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"공지사항 ID {notice_id}를 찾을 수 없습니다.")
        
    return None

@router.post("/filter", response_model=List[NoticeResponse])
async def filter_notices(filter_params: NoticeFilterParams):
    """
    필터 기준에 따른 공지사항을 조회합니다.
    
    Request Body:
    - **store_name**: 매장 이름 필터 (옵션)
    - **importance**: 중요도 필터 (옵션)
    - **is_active**: 활성 상태 필터 (옵션)
    - **from_date**: 시작 날짜 필터 (옵션)
    - **to_date**: 종료 날짜 필터 (옵션)
    """
    return await notice_service.get_all_notices(
        filter_params.store_name,
        filter_params.importance,
        filter_params.is_active,
        filter_params.from_date,
        filter_params.to_date
    )

@router.post("/initialize", status_code=204)
async def initialize_sample_notices():
    """
    샘플 공지사항 데이터를 초기화합니다.
    개발 및 테스트 환경에서만 사용하세요.
    """
    await notice_service.initialize_sample_notices()
    return None
