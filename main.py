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


# Serve built frontend static files (for production / Docker)
import os
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(FRONTEND_DIR):
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    @app.get("/assets/{rest_of_path:path}")
    async def serve_assets(rest_of_path: str):
        file_path = os.path.join(FRONTEND_DIR, "assets", rest_of_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return HTMLResponse("Not found", 404)

    # Serve textures
    app.mount("/textures", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "frontend", "public", "textures")), name="textures")

    @app.get("/{rest_of_path:path}")
    async def serve_spa(rest_of_path: str):
        """Serve frontend SPA — all non-API routes go to index.html"""
        # Don't catch API/WS routes
        if rest_of_path.startswith(("api/", "ws", "docs", "openapi")):
            return HTMLResponse("Not found", 404)
        file_path = os.path.join(FRONTEND_DIR, rest_of_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
else:
    @app.get("/", response_class=HTMLResponse)
    async def root():
        return """<html><body style="background:#0a0a2e;color:#00ff88;font-family:monospace;padding:40px;">
        <h1>UzCosmos AI</h1><p>Backend running. Frontend: <a href="http://localhost:5173" style="color:#00ffff;">localhost:5173</a></p>
        <p>API: <a href="/api/status" style="color:#00ffff;">/api/status</a> | <a href="/docs" style="color:#00ffff;">/docs</a></p>
        </body></html>"""


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", server_config.PORT))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
