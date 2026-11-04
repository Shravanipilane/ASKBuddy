# from datetime import datetime, timedelta, timezone
# import os

# from dotenv import load_dotenv
# from fastapi import APIRouter, Depends, HTTPException
# from jose import jwt
# from pydantic import BaseModel, EmailStr
# from pwdlib import PasswordHash
# from sqlalchemy.orm import Session

# from app.db.mysql import get_db
# from app.db.models import User

# load_dotenv()

# router = APIRouter(prefix="/auth", tags=["Authentication"])

# password_hash = PasswordHash.recommended()

# SECRET_KEY = os.getenv("SECRET_KEY")
# ALGORITHM = "HS256"
# ACCESS_TOKEN_EXPIRE_MINUTES = 60


# # Request data for signup
# class SignupRequest(BaseModel):
#     name: str
#     email: EmailStr
#     class_level: str
#     stream: str | None = None
#     password: str


# # Request data for login
# class LoginRequest(BaseModel):
#     email: EmailStr
#     password: str


# # Generate login token
# def create_access_token(user_id: int):
#     if not SECRET_KEY:
#         raise RuntimeError("SECRET_KEY is missing from .env")

#     expire = datetime.now(timezone.utc) + timedelta(
#         minutes=ACCESS_TOKEN_EXPIRE_MINUTES
#     )

#     payload = {
#         "sub": str(user_id),
#         "exp": expire
#     }

#     return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# # Signup API
# @router.post("/signup")
# def signup(data: SignupRequest, db: Session = Depends(get_db)):

#     email = data.email.lower()

#     existing_user = db.query(User).filter(
#         User.email == email
#     ).first()

#     if existing_user:
#         raise HTTPException(
#             status_code=409,
#             detail="An account with this email already exists."
#         )

#     hashed_password = password_hash.hash(data.password)

#     new_user = User(
#         name=data.name.strip(),
#         email=email,
#         class_level=data.class_level,
#         stream=data.stream,
#         password_hash=hashed_password
#     )

#     db.add(new_user)
#     db.commit()
#     db.refresh(new_user)

#     token = create_access_token(new_user.id)

#     return {
#         "message": "Account created successfully",
#         "access_token": token,
#         "token_type": "bearer",
#         "user": {
#             "id": new_user.id,
#             "name": new_user.name,
#             "email": new_user.email,
#             "class_level": new_user.class_level,
#             "stream": new_user.stream
#         }
#     }


# # Login API
# @router.post("/login")
# def login(data: LoginRequest, db: Session = Depends(get_db)):

#     email = data.email.lower()

#     user = db.query(User).filter(
#         User.email == email
#     ).first()

#     if not user or not password_hash.verify(
#         data.password,
#         user.password_hash
#     ):
#         raise HTTPException(
#             status_code=401,
#             detail="Incorrect email or password."
#         )

#     token = create_access_token(user.id)

#     return {
#         "message": "Login successful",
#         "access_token": token,
#         "token_type": "bearer",
#         "user": {
#             "id": user.id,
#             "name": user.name,
#             "email": user.email,
#             "class_level": user.class_level,
#             "stream": user.stream
#         }
#     }

# import os
# from datetime import datetime, timedelta, timezone
# from pathlib import Path

# import jwt
# from dotenv import load_dotenv
# from fastapi import APIRouter, Depends, HTTPException
# from pwdlib import PasswordHash
# from pydantic import BaseModel
# from sqlalchemy.orm import Session

# from app.db.mysql import get_db
# from app.db.models import User

# from fastapi import Depends, HTTPException
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# # Always load backend/.env, wherever uvicorn is started from
# load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# SECRET_KEY = os.getenv("SECRET_KEY")
# ALGORITHM = "HS256"
# TOKEN_HOURS = 24

# router = APIRouter(prefix="/auth", tags=["auth"])
# password_hash = PasswordHash.recommended()


# class SignupIn(BaseModel):
#     name: str
#     email: str
#     class_level: str
#     stream: str
#     password: str


# class LoginIn(BaseModel):
#     email: str
#     password: str


# def make_token(user: User) -> str:
#     payload = {
#         "sub": str(user.id),
#         "email": user.email,
#         "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
#     }
#     return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# def user_dict(user: User) -> dict:
#     return {
#         "id": user.id,
#         "name": user.name,
#         "email": user.email,
#         "class_level": user.class_level,
#         "stream": user.stream,
#     }


# @router.post("/signup")
# def signup(data: SignupIn, db: Session = Depends(get_db)):
#     email = data.email.strip().lower()

#     if db.query(User).filter(User.email == email).first():
#         raise HTTPException(status_code=409, detail="An account with this email already exists.")

#     user = User(
#         name=data.name.strip(),
#         email=email,
#         class_level=data.class_level,
#         stream=data.stream,
#         password_hash=password_hash.hash(data.password),
#     )
#     db.add(user)
#     db.commit()
#     db.refresh(user)

#     return {"access_token": make_token(user), "token_type": "bearer", "user": user_dict(user)}


# @router.post("/login")
# def login(data: LoginIn, db: Session = Depends(get_db)):
#     email = data.email.strip().lower()
#     user = db.query(User).filter(User.email == email).first()

#     if not user or not password_hash.verify(data.password, user.password_hash):
#         raise HTTPException(status_code=401, detail="Incorrect email or password.")

#     return {"access_token": make_token(user), "token_type": "bearer", "user": user_dict(user)}

# security = HTTPBearer()


# security = HTTPBearer()

# def get_current_user(
#     credentials: HTTPAuthorizationCredentials = Depends(security),
#     db: Session = Depends(get_db)
# ):
#     token = credentials.credentials

#     try:
#         payload = jwt.decode(
#             token,
#             SECRET_KEY,
#             algorithms=[ALGORITHM]
#         )

#         user_id = int(payload["sub"])

#     except (jwt.PyJWTError, KeyError, TypeError, ValueError):
#         raise HTTPException(
#             status_code=401,
#             detail="Invalid or expired token"
#         )

#     user = db.query(User).filter(User.id == user_id).first()

#     if user is None:
#         raise HTTPException(status_code=401, detail="User not found")

#     return user


import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.mysql import get_db
from app.db.models import User

log = logging.getLogger("askbuddy.auth")

# Always load backend/.env, wherever uvicorn is started from
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Fallback so a missing key never crashes login (set a real one in .env)
SECRET_KEY = os.getenv("SECRET_KEY") or "dev-only-change-me"
ALGORITHM = "HS256"
TOKEN_HOURS = 24

router = APIRouter(prefix="/auth", tags=["auth"])
password_hash = PasswordHash.recommended()
security = HTTPBearer()


class SignupIn(BaseModel):
    name: str
    email: str
    class_level: str
    stream: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


def make_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token.decode() if isinstance(token, bytes) else token


def user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "class_level": user.class_level,
        "stream": user.stream,
    }


def check_password(plain: str, stored: str) -> bool:
    """A bad or old hash means 'wrong password', never a crash."""
    try:
        return password_hash.verify(plain, stored)
    except Exception:
        log.warning("Could not verify password hash (old or unknown format).")
        return False


@router.post("/signup")
def signup(data: SignupIn, db: Session = Depends(get_db)):
    email = data.email.strip().lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        name=data.name.strip(),
        email=email,
        class_level=data.class_level,
        stream=data.stream,
        password_hash=password_hash.hash(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"access_token": make_token(user), "token_type": "bearer", "user": user_dict(user)}


@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not check_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    return {"access_token": make_token(user), "token_type": "bearer", "user": user_dict(user)}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user