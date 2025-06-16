import json
import os
from datetime import datetime
from database import get_db



#데이터 저장소
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