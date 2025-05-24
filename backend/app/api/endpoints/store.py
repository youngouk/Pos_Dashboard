## store.py

from fastapi import APIRouter, Path, Query, HTTPException
from typing import List, Optional
import logging

from app.models.store import StoreListResponse, StoreDetailResponse
from app.services.store_service import store_service

router = APIRouter()
logger = logging.getLogger("store_api")

@router.get("/", response_model=List[StoreListResponse])
@router.get("", response_model=List[StoreListResponse])
async def get_stores():
    """
    모든 매장 목록을 조회합니다.
    
    Returns:
        List[StoreListResponse]: 매장 목록
    """
    try:
        logger.info("매장 목록 조회 API 요청")
        stores = await store_service.get_stores()
        logger.info(f"매장 목록 조회 성공: {len(stores)}개 매장 반환")
        
        # 중복된 매장 정보 확인 및 로깅
        store_names = [store.name for store in stores]
        unique_store_names = list(set(store_names))
        logger.info(f"조회된 매장 이름: {store_names}")
        logger.info(f"고유한 매장 이름: {unique_store_names}")
        
        # 정상 반환
        return stores
    except Exception as e:
        logger.error(f"매장 목록 조회 API 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"매장 목록을 조회하는 중 오류가 발생했습니다: {str(e)}")

@router.get("/{store_name}", response_model=StoreDetailResponse)
async def get_store_by_name(
    store_name: str = Path(..., description="매장 이름")
):
    """
    특정 매장의 상세 정보를 조회합니다.
    
    Args:
        store_name: 매장 이름
        
    Returns:
        StoreDetailResponse: 매장 상세 정보
    """
    try:
        logger.info(f"매장 '{store_name}' 상세 정보 조회 API 요청")
        store = await store_service.get_store_by_name(store_name)
        logger.info(f"매장 '{store_name}' 상세 정보 조회 성공")
        return store
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"매장 '{store_name}' 상세 정보 조회 API 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"매장 상세 정보를 조회하는 중 오류가 발생했습니다: {str(e)}") 