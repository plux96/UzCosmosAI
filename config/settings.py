"""
UzCosmos AI — Global Configuration
All API keys, endpoints, and system settings
"""
import os
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class APIConfig:
    """Free Space API endpoints and keys"""
    # N2YO - Real-time satellite tracking
    N2YO_API_KEY: str = os.getenv("N2YO_API_KEY", "DEMO_KEY")
    N2YO_BASE_URL: str = "https://api.n2yo.com/rest/v1/satellite"

    # NASA APIs (free, 1000 req/hour with key)
    NASA_API_KEY: str = os.getenv("NASA_API_KEY", "DEMO_KEY")
    NASA_NEO_URL: str = "https://api.nasa.gov/neo/rest/v1"
    NASA_DONKI_URL: str = "https://api.nasa.gov/DONKI"
    NASA_APOD_URL: str = "https://api.nasa.gov/planetary/apod"

    # Open Notify - ISS position (no key needed)
    ISS_POSITION_URL: str = "http://api.open-notify.org/iss-now.json"
    ISS_ASTROS_URL: str = "http://api.open-notify.org/astros.json"

    # CelesTrak - TLE data (no key needed)
    CELESTRAK_BASE_URL: str = "https://celestrak.org/NORAD/elements/gp.php"

    # Launch Library 2 (no key needed, 300 req/day)
    LAUNCH_API_URL: str = "https://ll.thespacedevs.com/2.2.0"

    # Claude AI for analysis
    CLAUDE_API_KEY: str = os.getenv("CLAUDE_API_KEY", "")


@dataclass
class AgentConfig:
    """Agent timing and behavior settings"""
    SATELLITE_INTERVAL: int = 10       # seconds
    DEBRIS_INTERVAL: int = 30
    SOLAR_INTERVAL: int = 60
    ISS_INTERVAL: int = 5
    ASTEROID_INTERVAL: int = 300       # 5 minutes
    LAUNCH_INTERVAL: int = 120
    ORBIT_INTERVAL: int = 60
    RADIATION_INTERVAL: int = 60
    AI_BRAIN_INTERVAL: int = 15
    ALERT_INTERVAL: int = 5


@dataclass
class ServerConfig:
    """Server and WebSocket settings"""
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WS_PATH: str = "/ws"
    CORS_ORIGINS: List[str] = field(default_factory=lambda: [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ])


@dataclass
class ThreatLevel:
    """Threat level thresholds"""
    SAFE: int = 0
    LOW: int = 1
    MEDIUM: int = 2
    HIGH: int = 3
    CRITICAL: int = 4

    COLORS: Dict[int, str] = field(default_factory=lambda: {
        0: "#00ff00",  # Green
        1: "#88ff00",  # Yellow-green
        2: "#ffaa00",  # Orange
        3: "#ff4400",  # Red-orange
        4: "#ff0000",  # Red
    })

    LABELS: Dict[int, str] = field(default_factory=lambda: {
        0: "XAVFSIZ",
        1: "PAST XAVF",
        2: "O'RTA XAVF",
        3: "YUQORI XAVF",
        4: "KRITIK XAVF",
    })


# Global instances
api_config = APIConfig()
agent_config = AgentConfig()
server_config = ServerConfig()
threat_levels = ThreatLevel()
