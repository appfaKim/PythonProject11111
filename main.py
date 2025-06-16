from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime
from model import *
from helper import *

app = FastAPI(title="스트리머 관리 시스템", version="1.0.0")

# 정적 파일 서빙
app.mount("/static", StaticFiles(directory="static"), name="static")



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
