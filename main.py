"""
UzCosmos AI — Mission Control Server
Main entry point: starts FastAPI, WebSocket, and all 10 agents
"""
import asyncio
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from config import server_config
from backend.core.event_bus import event_bus
from backend.api.routes import router as api_router

# Import all agents
from backend.agents.satellite_tracker import SatelliteTrackerAgent
from backend.agents.debris_hunter import DebrisHunterAgent
from backend.agents.solar_weather import SolarWeatherAgent
from backend.agents.iss_tracker import ISSTrackerAgent
from backend.agents.asteroid_watch import AsteroidWatchAgent
from backend.agents.launch_monitor import LaunchMonitorAgent
from backend.agents.orbit_predictor import OrbitPredictorAgent
from backend.agents.radiation_shield import RadiationShieldAgent
from backend.agents.ai_brain import AIBrainAgent
from backend.agents.alert_system import AlertSystemAgent

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("uzcosmos")

# Create FastAPI app
app = FastAPI(
    title="UzCosmos AI - Mission Control",
    description="Kosmik Monitoring Mega-Tizim — 10 ta AI agent, real-time 3D vizualizatsiya",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(api_router)

# All 10 agents
agents = [
    SatelliteTrackerAgent(),
    DebrisHunterAgent(),
    SolarWeatherAgent(),
    ISSTrackerAgent(),
    AsteroidWatchAgent(),
    LaunchMonitorAgent(),
    OrbitPredictorAgent(),
    RadiationShieldAgent(),
    AIBrainAgent(),
    AlertSystemAgent(),
]


@app.on_event("startup")
async def startup():
    """Start all agents on server startup"""
    logger.info("=" * 60)
    logger.info("  UzCosmos AI — Mission Control STARTING")
    logger.info("=" * 60)

    for agent in agents:
        await agent.start()
        logger.info(f"  Agent started: {agent.name} (interval: {agent.interval}s)")

    logger.info(f"\n  All {len(agents)} agents are ONLINE")
    logger.info(f"  API: http://localhost:{server_config.PORT}/api/status")
    logger.info(f"  WebSocket: ws://localhost:{server_config.PORT}/ws")
    logger.info(f"  Frontend: http://localhost:5173")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown():
    """Stop all agents on server shutdown"""
    logger.info("Shutting down agents...")
    for agent in agents:
        await agent.stop()
    logger.info("All agents stopped. Goodbye!")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time data streaming to frontend"""
    await event_bus.connect_ws(websocket)
    try:
        while True:
            # Keep connection alive, handle client messages
            data = await websocket.receive_text()
            # Client can send commands (future: chat queries)
            logger.debug(f"WS received: {data}")
    except WebSocketDisconnect:
        await event_bus.disconnect_ws(websocket)
    except Exception:
        await event_bus.disconnect_ws(websocket)


@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <html>
    <head><title>UzCosmos AI</title></head>
    <body style="background:#0a0a2e;color:#00ff88;font-family:monospace;padding:40px;">
        <h1>UzCosmos AI — Mission Control</h1>
        <p>Backend is running. Open frontend at <a href="http://localhost:5173" style="color:#00ffff;">http://localhost:5173</a></p>
        <p>API Status: <a href="/api/status" style="color:#00ffff;">/api/status</a></p>
        <p>API Docs: <a href="/docs" style="color:#00ffff;">/docs</a></p>
    </body>
    </html>
    """


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=server_config.HOST,
        port=server_config.PORT,
        reload=False,
        log_level="info",
    )
