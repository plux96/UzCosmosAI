"""
REST API routes for UzCosmos AI
Provides HTTP endpoints for initial data loading and queries
"""
from fastapi import APIRouter
from backend.core.event_bus import EventType, event_bus

router = APIRouter(prefix="/api", tags=["UzCosmos API"])


@router.get("/status")
async def system_status():
    """Overall system status"""
    return {
        "status": "online",
        "agents": event_bus.agent_statuses,
        "ws_clients": event_bus.client_count,
    }


@router.get("/agents")
async def agent_list():
    """List all agents and their health"""
    return event_bus.agent_statuses


@router.get("/events/{event_type}")
async def get_events(event_type: str, limit: int = 50):
    """Get recent events by type"""
    try:
        etype = EventType(event_type)
        return event_bus.get_recent_events(etype, limit)
    except ValueError:
        return {"error": f"Unknown event type: {event_type}"}


@router.get("/events")
async def get_all_events(limit: int = 100):
    """Get all recent events"""
    return event_bus.get_recent_events(limit=limit)


@router.get("/satellites")
async def get_satellites():
    events = event_bus.get_recent_events(EventType.SATELLITE_BATCH, limit=1)
    return events[0]["data"] if events else {"satellites": [], "total_count": 0}


@router.get("/debris")
async def get_debris():
    events = event_bus.get_recent_events(EventType.DEBRIS_UPDATE, limit=1)
    return events[0]["data"] if events else {"debris_objects": [], "total_count": 0}


@router.get("/solar")
async def get_solar():
    events = event_bus.get_recent_events(EventType.SOLAR_WEATHER, limit=1)
    return events[0]["data"] if events else {}


@router.get("/iss")
async def get_iss():
    events = event_bus.get_recent_events(EventType.ISS_POSITION, limit=1)
    return events[0]["data"] if events else {}


@router.get("/asteroids")
async def get_asteroids():
    events = event_bus.get_recent_events(EventType.ASTEROID_UPDATE, limit=1)
    return events[0]["data"] if events else {"asteroids": [], "total_count": 0}


@router.get("/launches")
async def get_launches():
    events = event_bus.get_recent_events(EventType.LAUNCH_UPDATE, limit=1)
    return events[0]["data"] if events else {"launches": []}


@router.get("/radiation")
async def get_radiation():
    events = event_bus.get_recent_events(EventType.RADIATION_UPDATE, limit=1)
    return events[0]["data"] if events else {}


@router.get("/threats")
async def get_threats():
    events = event_bus.get_recent_events(EventType.AI_THREAT_LEVEL, limit=1)
    return events[0]["data"] if events else {}


@router.get("/alerts")
async def get_alerts():
    events = event_bus.get_recent_events(EventType.ALERT, limit=1)
    return events[0]["data"] if events else {"active_alerts": []}


@router.get("/report")
async def get_report():
    events = event_bus.get_recent_events(EventType.AI_REPORT, limit=1)
    return events[0]["data"] if events else {"report": "Hisobot hali tayyor emas..."}
