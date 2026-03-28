"""
Event Bus — Central nervous system of UzCosmos AI
All agents publish events here, WebSocket broadcasts to frontend
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Set
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import WebSocket

logger = logging.getLogger("uzcosmos.eventbus")


class EventType(str, Enum):
    # Satellite events
    SATELLITE_UPDATE = "satellite_update"
    SATELLITE_BATCH = "satellite_batch"

    # Debris events
    DEBRIS_UPDATE = "debris_update"
    COLLISION_WARNING = "collision_warning"

    # Solar events
    SOLAR_WEATHER = "solar_weather"
    CME_ALERT = "cme_alert"
    GEOMAGNETIC_STORM = "geomagnetic_storm"

    # ISS events
    ISS_POSITION = "iss_position"
    ISS_CREW = "iss_crew"
    ISS_PASS_UZBEKISTAN = "iss_pass_uzbekistan"

    # Asteroid events
    ASTEROID_UPDATE = "asteroid_update"
    ASTEROID_THREAT = "asteroid_threat"

    # Launch events
    LAUNCH_UPDATE = "launch_update"
    LAUNCH_COUNTDOWN = "launch_countdown"

    # Orbit events
    ORBIT_PREDICTION = "orbit_prediction"
    ORBIT_DECAY = "orbit_decay"

    # Radiation events
    RADIATION_UPDATE = "radiation_update"
    RADIATION_ALERT = "radiation_alert"

    # AI Brain events
    AI_ANALYSIS = "ai_analysis"
    AI_THREAT_LEVEL = "ai_threat_level"
    AI_REPORT = "ai_report"

    # System events
    ALERT = "alert"
    AGENT_STATUS = "agent_status"
    SYSTEM_STATUS = "system_status"


@dataclass
class Event:
    type: EventType
    data: Dict[str, Any]
    source: str
    timestamp: str = ""
    priority: int = 0  # 0=normal, 1=important, 2=urgent, 3=critical

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type.value,
            "data": self.data,
            "source": self.source,
            "timestamp": self.timestamp,
            "priority": self.priority,
        }, default=str)


class EventBus:
    """
    Central event bus with pub/sub pattern.
    Agents publish -> EventBus routes -> WebSocket broadcasts to frontend
    """

    def __init__(self):
        self._subscribers: Dict[EventType, List[Callable]] = {}
        self._ws_clients: Set[WebSocket] = set()
        self._event_history: List[Event] = []
        self._max_history = 1000
        self._agent_statuses: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, event_type: EventType, callback: Callable):
        """Subscribe to specific event type"""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)
        logger.debug(f"Subscribed to {event_type.value}")

    async def publish(self, event: Event):
        """Publish event to all subscribers and WebSocket clients"""
        # Store in history
        self._event_history.append(event)
        if len(self._event_history) > self._max_history:
            self._event_history = self._event_history[-self._max_history:]

        # Notify subscribers
        callbacks = self._subscribers.get(event.type, [])
        for callback in callbacks:
            try:
                await callback(event)
            except Exception as e:
                logger.error(f"Subscriber error for {event.type}: {e}")

        # Broadcast to WebSocket clients
        await self._broadcast_ws(event)

    async def _broadcast_ws(self, event: Event):
        """Send event to all connected WebSocket clients"""
        if not self._ws_clients:
            return

        message = event.to_json()
        disconnected = set()

        for ws in self._ws_clients:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.add(ws)

        # Clean up disconnected clients
        self._ws_clients -= disconnected

    async def connect_ws(self, websocket: WebSocket):
        """Register new WebSocket client"""
        await websocket.accept()
        self._ws_clients.add(websocket)
        logger.info(f"WebSocket client connected. Total: {len(self._ws_clients)}")

        # Send current state to new client
        await self._send_initial_state(websocket)

    async def disconnect_ws(self, websocket: WebSocket):
        """Remove WebSocket client"""
        self._ws_clients.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total: {len(self._ws_clients)}")

    async def _send_initial_state(self, websocket: WebSocket):
        """Send current system state to newly connected client"""
        # Send agent statuses
        if self._agent_statuses:
            await websocket.send_text(json.dumps({
                "type": "initial_state",
                "data": {
                    "agents": self._agent_statuses,
                    "recent_events": [
                        json.loads(e.to_json())
                        for e in self._event_history[-50:]
                    ],
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }, default=str))

    async def update_agent_status(self, agent_name: str, status: Dict):
        """Update agent health status"""
        self._agent_statuses[agent_name] = {
            **status,
            "last_update": datetime.now(timezone.utc).isoformat(),
        }
        await self.publish(Event(
            type=EventType.AGENT_STATUS,
            data={"agent": agent_name, **status},
            source="event_bus",
        ))

    def get_recent_events(self, event_type: EventType = None, limit: int = 50) -> List[Dict]:
        """Get recent events, optionally filtered by type"""
        events = self._event_history
        if event_type:
            events = [e for e in events if e.type == event_type]
        return [json.loads(e.to_json()) for e in events[-limit:]]

    @property
    def client_count(self) -> int:
        return len(self._ws_clients)

    @property
    def agent_statuses(self) -> Dict:
        return self._agent_statuses.copy()


# Global singleton
event_bus = EventBus()
