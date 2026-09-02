"""
FastAPI Main Application Entry Point for FraudPulse.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.stream import router as stream_router
from app.routes.metrics import router as metrics_router
from app.routes.upload import router as upload_router
from app.routes.export import router as export_router

app = FastAPI(
    title="FraudPulse AI Risk Manager",
    description="Real-Time Fraud-Spike Detector for Razorpay Buildathon Track 02",
    version="1.0.0"
)

# CORS configuration for local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stream_router)
app.include_router(metrics_router)
app.include_router(upload_router)
app.include_router(export_router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "FraudPulse AI Risk Manager API",
        "track": "Track 02: AI Risk Manager",
        "compliance": "STRICTLY_DEFENSE_ONLY"
    }
