from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class StreamerBase(BaseModel):
    name: str
    status: Optional[str] = "Streamer"
    championship_name: Optional[str] = None
    country_kr: Optional[str] = None
    country_iso: Optional[str] = None
    position: Optional[str] = None
    pro_team: Optional[str] = None
    riot_id_name: Optional[str] = None
    riot_id_tag_line: Optional[str] = None
    twitch: Optional[str] = None
    youtube: Optional[str] = None
    afreecatv: Optional[str] = None
    naver_cafe: Optional[str] = None  # 추가: 네이버 카페
    kick: Optional[str] = None  # 추가: KICK
    tiktok: Optional[str] = None  # 추가: 틱톡
    activate: Optional[int] = 1
    delete_status: Optional[str] = "active"  # 'active', 'temp_deleted', 'permanent_deleted'


class StreamerIdentifier(BaseModel):
    name: str
    riot_id_name: Optional[str] = None
    riot_id_tag_line: Optional[str] = None


class StreamerUpdateRequest(BaseModel):
    original: StreamerIdentifier
    updates: Dict[str, Any]


class BulkDeleteRequest(BaseModel):
    streamers: List[StreamerIdentifier]
    delete_type: str = "temp"  # 'temp' 또는 'permanent'


# 일본 스트리머 모델
class JapaneseStreamerBase(BaseModel):
    broadcast_name: str  # 방송이름
    korean_name: Optional[str] = None  # 한글
    english_name: Optional[str] = None  # 영문
    gender: Optional[str] = None  # 성별 - 여성, 남성
    platform: Optional[str] = None  # 플랫폼 - 유튭, 트위치
    avg_viewers: Optional[int] = None  # 평시청자수
    description: Optional[str] = None  # 방송 설명
    communication_level: Optional[str] = None  # 소통 단계 - 없음, 포스팅 언급, 트위터 대화, 디스코드 연결
    post_count: Optional[int] = 0  # 포스팅 갯수
    streamer_link: Optional[str] = None  # 스트리머페이지 링크
    activate: Optional[int] = 1


class TwitterManagement(BaseModel):
    streamer_id: int
    date: str
    post_purpose: str  # 포스팅 취지
    post_link: str  # 포스팅 링크
    effect: Optional[str] = None  # 효과


class CommunicationContent(BaseModel):
    streamer_id: int
    date: str
    summary: str  # 소통 내용 요약