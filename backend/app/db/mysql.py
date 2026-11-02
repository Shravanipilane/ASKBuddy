import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base

# Loads backend/.env no matter where uvicorn is started from
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

DATABASE_URL = URL.create(
    "mysql+pymysql",
    username=os.getenv("MYSQL_USER", "root"),
    password=os.getenv("MYSQL_PASSWORD", ""),   # raw password, @ is fine
    host=os.getenv("MYSQL_HOST", "localhost"),
    port=int(os.getenv("MYSQL_PORT", "3306")),
    database=os.getenv("MYSQL_DATABASE", "askbuddy_db"),
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()