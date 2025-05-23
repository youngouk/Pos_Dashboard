from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid

from app.core.database import get_table, Tables
from app.models.notice import Notice, NoticeCreate, NoticeUpdate, NoticeResponse

# 메모리 내 공지사항 저장소 (실제 프로덕션에서는 DB 테이블로 대체)
# key: id, value: Notice 객체
NOTICES_STORE = {}
NOTICE_ID_COUNTER = 1

# 공지사항 서비스
class NoticeService:
    """공지사항 서비스"""
    
    @staticmethod
    async def get_all_notices(
        store_name: Optional[str] = None,
        importance: Optional[int] = None,
        is_active: Optional[bool] = True,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None
    ) -> List[NoticeResponse]:
        """
        모든 공지사항을 조회합니다.
        
        Args:
            store_name: 매장 이름 필터
            importance: 중요도 필터
            is_active: 활성 상태 필터
            from_date: 시작 날짜 필터
            to_date: 종료 날짜 필터
            
        Returns:
            공지사항 리스트
        """
        # 메모리 내 저장소에서 모든 공지사항 가져오기
        all_notices = list(NOTICES_STORE.values())
        
        # 필터 적용
        filtered_notices = []
        for notice in all_notices:
            # 매장 필터
            if store_name and notice.target_stores and store_name not in notice.target_stores:
                continue
                
            # 중요도 필터
            if importance is not None and notice.importance != importance:
                continue
                
            # 활성 상태 필터
            if is_active is not None and notice.is_active != is_active:
                continue
                
            # 날짜 필터 - 시작
            if from_date and notice.created_at < from_date:
                continue
                
            # 날짜 필터 - 종료
            if to_date and notice.created_at > to_date:
                continue
                
            filtered_notices.append(notice)
            
        # 최신순 정렬 (생성일 기준 내림차순)
        filtered_notices.sort(key=lambda x: x.created_at, reverse=True)
        
        # 응답 모델 변환
        response_notices = [NoticeResponse(
            id=notice.id,
            title=notice.title,
            content=notice.content,
            author=notice.author,
            created_at=notice.created_at,
            updated_at=notice.updated_at,
            is_active=notice.is_active,
            importance=notice.importance,
            target_stores=notice.target_stores
        ) for notice in filtered_notices]
        
        return response_notices
    
    @staticmethod
    async def get_notice_by_id(notice_id: int) -> Optional[NoticeResponse]:
        """
        ID로 공지사항을 조회합니다.
        
        Args:
            notice_id: 공지사항 ID
            
        Returns:
            공지사항 객체 또는 None
        """
        notice = NOTICES_STORE.get(notice_id)
        
        if not notice:
            return None
            
        return NoticeResponse(
            id=notice.id,
            title=notice.title,
            content=notice.content,
            author=notice.author,
            created_at=notice.created_at,
            updated_at=notice.updated_at,
            is_active=notice.is_active,
            importance=notice.importance,
            target_stores=notice.target_stores
        )
    
    @staticmethod
    async def create_notice(notice_data: NoticeCreate) -> NoticeResponse:
        """
        새 공지사항을 생성합니다.
        
        Args:
            notice_data: 생성할 공지사항 데이터
            
        Returns:
            생성된 공지사항
        """
        global NOTICE_ID_COUNTER
        
        # 현재 시간
        now = datetime.now()
        
        # 새 공지사항 생성
        new_notice = Notice(
            id=NOTICE_ID_COUNTER,
            title=notice_data.title,
            content=notice_data.content,
            author=notice_data.author,
            created_at=now,
            updated_at=now,
            is_active=True,
            importance=notice_data.importance,
            target_stores=notice_data.target_stores
        )
        
        # 메모리 저장소에 저장
        NOTICES_STORE[NOTICE_ID_COUNTER] = new_notice
        NOTICE_ID_COUNTER += 1
        
        # 응답 변환
        return NoticeResponse(
            id=new_notice.id,
            title=new_notice.title,
            content=new_notice.content,
            author=new_notice.author,
            created_at=new_notice.created_at,
            updated_at=new_notice.updated_at,
            is_active=new_notice.is_active,
            importance=new_notice.importance,
            target_stores=new_notice.target_stores
        )
    
    @staticmethod
    async def update_notice(notice_id: int, notice_data: NoticeUpdate) -> Optional[NoticeResponse]:
        """
        공지사항을 수정합니다.
        
        Args:
            notice_id: 수정할 공지사항 ID
            notice_data: 수정할 데이터
            
        Returns:
            수정된 공지사항 또는 None
        """
        # 기존 공지사항 조회
        notice = NOTICES_STORE.get(notice_id)
        
        if not notice:
            return None
            
        # 수정할 필드 업데이트
        if notice_data.title is not None:
            notice.title = notice_data.title
            
        if notice_data.content is not None:
            notice.content = notice_data.content
            
        if notice_data.importance is not None:
            notice.importance = notice_data.importance
            
        if notice_data.is_active is not None:
            notice.is_active = notice_data.is_active
            
        if notice_data.target_stores is not None:
            notice.target_stores = notice_data.target_stores
            
        # 업데이트 시간 갱신
        notice.updated_at = datetime.now()
        
        # 메모리 저장소 업데이트
        NOTICES_STORE[notice_id] = notice
        
        # 응답 변환
        return NoticeResponse(
            id=notice.id,
            title=notice.title,
            content=notice.content,
            author=notice.author,
            created_at=notice.created_at,
            updated_at=notice.updated_at,
            is_active=notice.is_active,
            importance=notice.importance,
            target_stores=notice.target_stores
        )
    
    @staticmethod
    async def delete_notice(notice_id: int) -> bool:
        """
        공지사항을 삭제합니다.
        
        Args:
            notice_id: 삭제할 공지사항 ID
            
        Returns:
            삭제 성공 여부
        """
        if notice_id in NOTICES_STORE:
            del NOTICES_STORE[notice_id]
            return True
            
        return False
    
    @staticmethod
    async def initialize_sample_notices():
        """
        샘플 공지사항 데이터를 초기화합니다.
        """
        global NOTICE_ID_COUNTER
        
        # 기존 데이터 삭제
        NOTICES_STORE.clear()
        NOTICE_ID_COUNTER = 1
        
        # 샘플 데이터 추가
        sample_notices = [
            NoticeCreate(
                title="시스템 점검 안내",
                content="2023년 7월 15일 새벽 2시부터 4시까지 시스템 점검이 있을 예정입니다. 해당 시간 동안 서비스 이용이 제한됩니다.",
                author="시스템 관리자",
                importance=3,
                target_stores=None  # 모든 매장
            ),
            NoticeCreate(
                title="신메뉴 출시 안내",
                content="7월 1일부터 여름 신메뉴 '트로피컬 크루아상'이 출시됩니다. 메뉴 교육 자료는 별도 전달 예정입니다.",
                author="상품 기획팀",
                importance=2,
                target_stores=["강남점", "홍대점", "신촌점"]
            ),
            NoticeCreate(
                title="결산 자료 제출 요청",
                content="6월 결산 자료를 7월 5일까지 제출해주시기 바랍니다. 서식은 기존과 동일합니다.",
                author="재무팀",
                importance=1,
                target_stores=None  # 모든 매장
            ),
            NoticeCreate(
                title="여름 휴가 신청 안내",
                content="2023년 여름 휴가 신청을 받습니다. 매장별 일정 조율 후 6월 25일까지 제출해주세요.",
                author="인사팀",
                importance=1,
                target_stores=None  # 모든 매장
            ),
            NoticeCreate(
                title="재고 실사 일정 안내",
                content="7월 둘째 주 수요일에 전 지점 재고 실사가 있을 예정입니다. 상세 일정은 추후 공지하겠습니다.",
                author="재고 관리팀",
                importance=2,
                target_stores=None  # 모든 매장
            )
        ]
        
        # 샘플 데이터 추가
        for notice_data in sample_notices:
            await NoticeService.create_notice(notice_data)
            
        print(f"샘플 공지사항 {len(sample_notices)}개가 초기화되었습니다.")

# 서비스 인스턴스 생성 (의존성 주입용)
notice_service = NoticeService() 