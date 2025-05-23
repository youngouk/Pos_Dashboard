"""
매장 관련 서비스 - SQLite 데이터베이스 사용 버전
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import asyncio
from fastapi import HTTPException
from sqlalchemy import distinct

from app.core.database import SessionLocal, DailySalesSummary
from app.models.store import StoreListResponse, StoreDetailResponse, StoreSummary

logger = logging.getLogger("store_service")

class StoreService:
    """매장 관련 서비스 클래스"""
    
    async def get_stores(self) -> List[StoreListResponse]:
        """
        SQLite 데이터베이스에서 고유한 매장 목록을 조회합니다.
        
        Returns:
            List[StoreListResponse]: 고유한 매장 목록
        """
        try:
            logger.info("매장 목록 조회 시작")
            
            # SQLite 데이터베이스에서 고유한 매장명 추출
            db = SessionLocal()
            try:
                # 고유한 매장명 조회
                unique_stores = db.query(distinct(DailySalesSummary.store_name)).all()
                
                # 결과를 리스트로 변환 ('전체' 제외)
                store_names = [store[0] for store in unique_stores if store[0] != '전체']
                store_names.sort()
                
                stores = [StoreListResponse(name=store_name) for store_name in store_names]
                
                logger.info(f"{len(stores)}개의 매장 정보 조회 완료: {[store.name for store in stores]}")
                return stores
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"매장 목록 조회 중 오류 발생: {str(e)}")
            logger.exception(e)
            raise HTTPException(status_code=500, detail="매장 목록 조회 중 오류가 발생했습니다.")
    
    async def get_store_details(self, store_id: str) -> StoreDetailResponse:
        """
        특정 매장의 상세 정보를 조회합니다.
        
        Args:
            store_id: 매장 ID (현재는 매장명과 동일)
            
        Returns:
            StoreDetailResponse: 매장 상세 정보
        """
        try:
            logger.info(f"매장 상세 정보 조회 시작: {store_id}")
            
            # 매장 기본 정보 (현재는 더미 데이터)
            store_detail = StoreDetailResponse(
                id=store_id,
                name=store_id,
                code=f"S{store_id[:3].upper()}",
                address="서울특별시",
                phone="02-1234-5678",
                manager="매니저",
                openTime="09:00",
                closeTime="22:00",
                area=100.0,
                seats=30,
                hasParking=True,
                parkingSpaces=10
            )
            
            logger.info(f"매장 상세 정보 조회 완료: {store_id}")
            return store_detail
            
        except Exception as e:
            logger.error(f"매장 상세 정보 조회 중 오류 발생: {str(e)}")
            logger.exception(e)
            raise HTTPException(status_code=500, detail="매장 상세 정보 조회 중 오류가 발생했습니다.")
    
    async def get_store_benchmark(
        self, 
        store_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        매장 벤치마크 데이터를 조회합니다.
        
        Args:
            store_id: 매장 ID
            start_date: 시작 날짜
            end_date: 종료 날짜
            
        Returns:
            Dict[str, Any]: 벤치마크 데이터
        """
        try:
            logger.info(f"매장 벤치마크 조회 시작: {store_id}, {start_date} ~ {end_date}")
            
            # 더미 데이터 반환 (실제로는 DB에서 조회)
            benchmark_data = {
                "store_id": store_id,
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "performance": {
                    "sales_rank": 2,
                    "total_stores": 3,
                    "percentile": 66.7
                },
                "comparison": {
                    "vs_average": 15.2,
                    "vs_top": -8.5
                }
            }
            
            logger.info(f"매장 벤치마크 조회 완료: {store_id}")
            return benchmark_data
            
        except Exception as e:
            logger.error(f"매장 벤치마크 조회 중 오류 발생: {str(e)}")
            logger.exception(e)
            raise HTTPException(status_code=500, detail="매장 벤치마크 조회 중 오류가 발생했습니다.")

# 싱글톤 인스턴스
store_service = StoreService()
