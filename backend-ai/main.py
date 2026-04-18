import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()  # must run before any module that reads os.getenv at import time

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from routers.chat import router as chat_router  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("TaskForce AI service starting up")
    yield
    print("TaskForce AI service shutting down")


app = FastAPI(title="TaskForce AI Service", version="1.0.0", lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "taskforce-ai"}
