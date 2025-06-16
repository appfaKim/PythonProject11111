from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Literal
import json
import os
from datetime import datetime

app = FastAPI(title="스트리머 관리 시스템", version="1.0.0")

# 정적 파일 서빙
app.mount("/static", StaticFiles(directory="static"), name="static")


# 데이터 모델
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


# 데이터 저장소
STREAMERS_FILE = "streamers_data.json"
JP_STREAMERS_FILE = "jp_streamers_data.json"
TWITTER_MGMT_FILE = "twitter_management_data.json"
COMMUNICATION_FILE = "communication_data.json"


def load_data(file_path, default_data=None):
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return default_data if default_data is not None else []


def save_data(file_path, data):
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"데이터 저장 실패: {e}")


# 기본 데이터 로드
streamers_data = load_data(STREAMERS_FILE, [
    {
        "id": 1,
        "status": "Streamer",
        "name": "김스트리머",
        "country_kr": "대한민국",
        "country_iso": "KR",
        "riot_id_name": "kimstreamer",
        "riot_id_tag_line": "KR1",
        "position": "ADC",
        "twitch": "https://www.twitch.tv/kimstreamer",
        "youtube": "https://www.youtube.com/kimstreamer",
        "activate": 1,
        "delete_status": "active",
        "created_at": datetime.now().isoformat()
    }
])

jp_streamers_data = load_data(JP_STREAMERS_FILE, [
    {
        "id": 1,
        "broadcast_name": "ときのそら",
        "korean_name": "토키노 소라",
        "english_name": "Tokino Sora",
        "gender": "여성",
        "platform": "YouTube",
        "avg_viewers": 8000,
        "description": "홀로라이브 소속 VTuber. 홀로라이브의 0기생이자 1호 멤버.",
        "communication_level": "트위터 대화",
        "post_count": 12,
        "streamer_link": "https://www.youtube.com/channel/UCp6993wxpyDPHUpavwDFqgg",
        "activate": 1,
        "created_at": datetime.now().isoformat()
    }
])

twitter_management_data = load_data(TWITTER_MGMT_FILE, [
    {
        "id": 1,
        "streamer_id": 1,
        "date": "2023-06-01",
        "post_purpose": "생일 축하",
        "post_link": "https://twitter.com/example/status/123456789",
        "effect": "좋아요 100개, 리트윗 20개"
    }
])

communication_data = load_data(COMMUNICATION_FILE, [
    {
        "id": 1,
        "streamer_id": 1,
        "date": "2023-06-05",
        "summary": "생일 축하 메시지에 감사 인사 받음"
    }
])


# 유틸리티 함수
def get_next_id(data_list):
    if not data_list:
        return 1
    return max(item.get("id", 0) for item in data_list) + 1


def find_streamer_by_identifier(name: str, riot_id_name: str = None, riot_id_tag_line: str = None):
    for streamer in streamers_data:
        if (streamer["name"] == name and
                streamer.get("riot_id_name") == riot_id_name and
                streamer.get("riot_id_tag_line") == riot_id_tag_line):
            return streamer
    return None


def check_deleted_streamer(name: str):
    for streamer in streamers_data:
        if streamer["name"] == name and streamer.get("delete_status") != "active":
            return streamer
    return None


# 라우트
@app.get("/")
async def read_index():
    return FileResponse('static/index.html')


@app.get("/jp-streamers")
async def read_jp_streamers_page():
    return FileResponse('static/jp-streamers.html')


@app.get("/jp-streamer/{streamer_id}")
async def read_jp_streamer_detail(streamer_id: int):
    return FileResponse('static/jp-streamer-detail.html')


# API 엔드포인트 - 일반 스트리머
@app.get("/api/streamers")
async def get_streamers(
        search: Optional[str] = None,
        search_field: Optional[str] = "name",
        status: Optional[str] = None,
        country: Optional[str] = None,
        position: Optional[str] = None,
        delete_status: Optional[str] = "active"  # 기본값은 활성화된 스트리머만
):
    try:
        result = [s for s in streamers_data if s.get("delete_status", "active") == delete_status]

        # 검색 필터
        if search:
            search_lower = search.lower()
            if search_field == "name":
                result = [s for s in result if search_lower in s["name"].lower()]
            elif search_field == "riot_id_name":
                result = [s for s in result if s.get("riot_id_name") and search_lower in s["riot_id_name"].lower()]

        # 상태 필터
        if status:
            result = [s for s in result if s.get("status") == status]

        # 국가 필터
        if country:
            result = [s for s in result if s.get("country_iso") == country]

        # 포지션 필터
        if position:
            result = [s for s in result if s.get("position") == position]

        return {
            "success": True,
            "data": result,
            "total": len(result)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터 조회 실패: {str(e)}")


@app.post("/api/streamers")
async def create_streamer(streamer: StreamerBase):
    try:
        # 중복 체크
        existing = find_streamer_by_identifier(
            streamer.name,
            streamer.riot_id_name,
            streamer.riot_id_tag_line
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail="이미 존재하는 스트리머입니다."
            )

        # 삭제된 스트리머 체크
        deleted_streamer = check_deleted_streamer(streamer.name)
        if deleted_streamer:
            return {
                "success": False,
                "warning": True,
                "message": "이전에 삭제된 스트리머입니다. 복구하시겠습니까?",
                "deleted_streamer": deleted_streamer
            }

        # 새 스트리머 생성
        new_streamer = {
            "id": get_next_id(streamers_data),
            **streamer.dict(),
            "delete_status": "active",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        streamers_data.append(new_streamer)
        save_data(STREAMERS_FILE, streamers_data)

        return {
            "success": True,
            "data": new_streamer,
            "message": "스트리머가 성공적으로 추가되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리머 추가 실패: {str(e)}")


@app.put("/api/streamers")
async def update_streamer(request: StreamerUpdateRequest):
    try:
        # 원본 스트리머 찾기
        original = find_streamer_by_identifier(
            request.original.name,
            request.original.riot_id_name,
            request.original.riot_id_tag_line
        )
        if not original:
            raise HTTPException(status_code=404, detail="스트리머를 찾을 수 없습니다.")

        # 스트리머 정보 업데이트
        for i, streamer in enumerate(streamers_data):
            if streamer["id"] == original["id"]:
                streamers_data[i] = {
                    **streamer,
                    **request.updates,
                    "updated_at": datetime.now().isoformat()
                }
                save_data(STREAMERS_FILE, streamers_data)
                return {
                    "success": True,
                    "data": streamers_data[i],
                    "message": "스트리머 정보가 성공적으로 수정되었습니다."
                }

        raise HTTPException(status_code=404, detail="스트리머를 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리머 수정 실패: {str(e)}")


@app.delete("/api/streamers")
async def delete_streamer(identifier: StreamerIdentifier, delete_type: str = Query("temp")):
    try:
        streamer = find_streamer_by_identifier(
            identifier.name,
            identifier.riot_id_name,
            identifier.riot_id_tag_line
        )
        if not streamer:
            raise HTTPException(status_code=404, detail="스트리머를 찾을 수 없습니다.")

        # 삭제 유형에 따라 처리
        for i, s in enumerate(streamers_data):
            if s["id"] == streamer["id"]:
                if delete_type == "permanent":
                    streamers_data.pop(i)
                else:  # temp
                    streamers_data[i]["delete_status"] = "temp_deleted"
                    streamers_data[i]["updated_at"] = datetime.now().isoformat()
                break

        save_data(STREAMERS_FILE, streamers_data)

        return {
            "success": True,
            "message": f"스트리머가 성공적으로 {'영구 삭제' if delete_type == 'permanent' else '임시 삭제'}되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리머 삭제 실패: {str(e)}")


@app.post("/api/streamers/bulk-delete")
async def bulk_delete_streamers(request: BulkDeleteRequest):
    try:
        global streamers_data
        deleted_count = 0

        for identifier in request.streamers:
            streamer = find_streamer_by_identifier(
                identifier.name,
                identifier.riot_id_name,
                identifier.riot_id_tag_line
            )
            if streamer:
                if request.delete_type == "permanent":
                    # 영구 삭제
                    streamers_data = [s for s in streamers_data if s["id"] != streamer["id"]]
                else:
                    # 임시 삭제
                    for i, s in enumerate(streamers_data):
                        if s["id"] == streamer["id"]:
                            streamers_data[i]["delete_status"] = "temp_deleted"
                            streamers_data[i]["updated_at"] = datetime.now().isoformat()
                            break
                deleted_count += 1

        save_data(STREAMERS_FILE, streamers_data)

        return {
            "success": True,
            "message": f"{deleted_count}명의 스트리머가 성공적으로 {'영구 삭제' if request.delete_type == 'permanent' else '임시 삭제'}되었습니다.",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"대량 삭제 실패: {str(e)}")


@app.post("/api/streamers/restore")
async def restore_streamer(identifier: StreamerIdentifier):
    try:
        for i, streamer in enumerate(streamers_data):
            if (streamer["name"] == identifier.name and
                    streamer.get("riot_id_name") == identifier.riot_id_name and
                    streamer.get("riot_id_tag_line") == identifier.riot_id_tag_line and
                    streamer.get("delete_status") == "temp_deleted"):
                streamers_data[i]["delete_status"] = "active"
                streamers_data[i]["updated_at"] = datetime.now().isoformat()
                save_data(STREAMERS_FILE, streamers_data)

                return {
                    "success": True,
                    "data": streamers_data[i],
                    "message": "스트리머가 성공적으로 복구되었습니다."
                }

        raise HTTPException(status_code=404, detail="삭제된 스트리머를 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리머 복구 실패: {str(e)}")


# API 엔드포인트 - 일본 스트리머
@app.get("/api/jp-streamers")
async def get_jp_streamers(
        search: Optional[str] = None,
        platform: Optional[str] = None,
        gender: Optional[str] = None,
        communication_level: Optional[str] = None
):
    try:
        result = jp_streamers_data.copy()

        # 검색 필터
        if search:
            search_lower = search.lower()
            result = [s for s in result if
                      (s["broadcast_name"] and search_lower in s["broadcast_name"].lower()) or
                      (s.get("korean_name") and search_lower in s["korean_name"].lower()) or
                      (s.get("english_name") and search_lower in s["english_name"].lower())]

        # 플랫폼 필터
        if platform:
            result = [s for s in result if s.get("platform") == platform]

        # 성별 필터
        if gender:
            result = [s for s in result if s.get("gender") == gender]

        # 소통 단계 필터
        if communication_level:
            result = [s for s in result if s.get("communication_level") == communication_level]

        return {
            "success": True,
            "data": result,
            "total": len(result)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터 조회 실패: {str(e)}")


@app.get("/api/jp-streamers/{streamer_id}")
async def get_jp_streamer(streamer_id: int):
    try:
        streamer = next((s for s in jp_streamers_data if s["id"] == streamer_id), None)
        if not streamer:
            raise HTTPException(status_code=404, detail="스트리머를 찾을 수 없습니다.")

        # 트위터 관리 및 소통 내용 데이터 가져오기
        twitter_data = [t for t in twitter_management_data if t["streamer_id"] == streamer_id]
        communication = [c for c in communication_data if c["streamer_id"] == streamer_id]

        return {
            "success": True,
            "data": {
                "streamer": streamer,
                "twitter_management": twitter_data,
                "communication": communication
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리머 정보 조회 실패: {str(e)}")


@app.post("/api/jp-streamers")
async def create_jp_streamer(streamer: JapaneseStreamerBase):
    try:
        # 중복 체크
        existing = next((s for s in jp_streamers_data if s["broadcast_name"] == streamer.broadcast_name), None)
        if existing:
            raise HTTPException(status_code=409, detail="이미 존재하는 스트리머입니다.")

        # 새 스트리머 생성
        new_streamer = {
            "id": get_next_id(jp_streamers_data),
            **streamer.dict(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        jp_streamers_data.append(new_streamer)
        save_data(JP_STREAMERS_FILE, jp_streamers_data)

        return {
            "success": True,
            "data": new_streamer,
            "message": "일본 스트리머가 성공적으로 추가되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리머 추가 실패: {str(e)}")


@app.put("/api/jp-streamers/{streamer_id}")
async def update_jp_streamer(streamer_id: int, updates: Dict[str, Any]):
    try:
        for i, streamer in enumerate(jp_streamers_data):
            if streamer["id"] == streamer_id:
                jp_streamers_data[i] = {
                    **streamer,
                    **updates,
                    "updated_at": datetime.now().isoformat()
                }
                save_data(JP_STREAMERS_FILE, jp_streamers_data)
                return {
                    "success": True,
                    "data": jp_streamers_data[i],
                    "message": "스트리머 정보가 성공적으로 수정되었습니다."
                }

        raise HTTPException(status_code=404, detail="스트리머를 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리머 수정 실패: {str(e)}")


@app.delete("/api/jp-streamers/{streamer_id}")
async def delete_jp_streamer(streamer_id: int):
    try:
        global jp_streamers_data, twitter_management_data, communication_data
        original_length = len(jp_streamers_data)
        jp_streamers_data = [s for s in jp_streamers_data if s["id"] != streamer_id]

        if len(jp_streamers_data) == original_length:
            raise HTTPException(status_code=404, detail="스트리머를 찾을 수 없습니다.")

        save_data(JP_STREAMERS_FILE, jp_streamers_data)

        # 관련 트위터 관리 및 소통 내용 데이터도 삭제
        twitter_management_data = [t for t in twitter_management_data if t["streamer_id"] != streamer_id]
        communication_data = [c for c in communication_data if c["streamer_id"] != streamer_id]

        save_data(TWITTER_MGMT_FILE, twitter_management_data)
        save_data(COMMUNICATION_FILE, communication_data)

        return {
            "success": True,
            "message": "스트리머가 성공적으로 삭제되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스트리머 삭제 실패: {str(e)}")


# 트위터 관리 API
@app.post("/api/twitter-management")
async def create_twitter_management(data: TwitterManagement):
    try:
        # 스트리머 존재 확인
        streamer = next((s for s in jp_streamers_data if s["id"] == data.streamer_id), None)
        if not streamer:
            raise HTTPException(status_code=404, detail="스트리머를 찾을 수 없습니다.")

        new_entry = {
            "id": get_next_id(twitter_management_data),
            **data.dict(),
            "created_at": datetime.now().isoformat()
        }

        twitter_management_data.append(new_entry)
        save_data(TWITTER_MGMT_FILE, twitter_management_data)

        # 포스팅 카운트 증가
        for i, s in enumerate(jp_streamers_data):
            if s["id"] == data.streamer_id:
                jp_streamers_data[i]["post_count"] = (jp_streamers_data[i].get("post_count", 0) or 0) + 1
                save_data(JP_STREAMERS_FILE, jp_streamers_data)
                break

        return {
            "success": True,
            "data": new_entry,
            "message": "트위터 관리 항목이 성공적으로 추가되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"트위터 관리 항목 추가 실패: {str(e)}")


@app.delete("/api/twitter-management/{entry_id}")
async def delete_twitter_management(entry_id: int):
    try:
        global twitter_management_data
        entry = next((t for t in twitter_management_data if t["id"] == entry_id), None)
        if not entry:
            raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")

        streamer_id = entry["streamer_id"]

        twitter_management_data = [t for t in twitter_management_data if t["id"] != entry_id]
        save_data(TWITTER_MGMT_FILE, twitter_management_data)

        # 포스팅 카운트 감소
        for i, s in enumerate(jp_streamers_data):
            if s["id"] == streamer_id:
                jp_streamers_data[i]["post_count"] = max(0, (jp_streamers_data[i].get("post_count", 0) or 0) - 1)
                save_data(JP_STREAMERS_FILE, jp_streamers_data)
                break

        return {
            "success": True,
            "message": "트위터 관리 항목이 성공적으로 삭제되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"트위터 관리 항목 삭제 실패: {str(e)}")


# 소통 내용 API
@app.post("/api/communication")
async def create_communication(data: CommunicationContent):
    try:
        # 스트리머 존재 확인
        streamer = next((s for s in jp_streamers_data if s["id"] == data.streamer_id), None)
        if not streamer:
            raise HTTPException(status_code=404, detail="스트리머를 찾을 수 없습니다.")

        new_entry = {
            "id": get_next_id(communication_data),
            **data.dict(),
            "created_at": datetime.now().isoformat()
        }

        communication_data.append(new_entry)
        save_data(COMMUNICATION_FILE, communication_data)

        return {
            "success": True,
            "data": new_entry,
            "message": "소통 내용이 성공적으로 추가되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"소통 내용 추가 실패: {str(e)}")


@app.delete("/api/communication/{entry_id}")
async def delete_communication(entry_id: int):
    try:
        global communication_data
        original_length = len(communication_data)
        communication_data = [c for c in communication_data if c["id"] != entry_id]

        if len(communication_data) == original_length:
            raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")

        save_data(COMMUNICATION_FILE, communication_data)

        return {
            "success": True,
            "message": "소통 내용이 성공적으로 삭제되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"소통 내용 삭제 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
