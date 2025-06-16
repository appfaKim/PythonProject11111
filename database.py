import mysql.connector
from mysql.connector import pooling
import os
import boto3

# ⚠️ 중요: 실제 운영 환경에서는 환경 변수나 별도의 설정 파일로 관리하세요.
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "your_mysql_password")  # ✅ 여기에 실제 DB 비밀번호를 입력하세요.
DB_NAME = os.getenv("DB_NAME", "streamer_management")

try:
    connection_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="streamer_pool",
        pool_size=5,
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )
    print("✅ MySQL Connection Pool 생성 성공")

except mysql.connector.Error as err:
    print(f"❌ MySQL 연결 오류: {err}")
    connection_pool = None


def get_db():
    """ FastAPI 의존성 주입을 위한 DB 커넥션 제공 함수 """
    if not connection_pool:
        raise RuntimeError("MySQL 커넥션 풀이 초기화되지 않았습니다.")

    db = connection_pool.get_connection()
    try:
        yield db
    finally:
        db.close()