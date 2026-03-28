"""
Agent 6: Launch Monitor — ENHANCED
Real-time rocket launches with trajectory simulation.
Uses Launch Library 2 API + SpaceX API for live data.
Simulates realistic launch trajectories for in-flight rockets.
"""
import math
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType
from config import api_config, agent_config


# Famous launch pads with exact coordinates
LAUNCH_PADS = {
    "KSC LC-39A": {"lat": 28.6080, "lon": -80.6040, "country": "USA"},
    "CCSFS SLC-40": {"lat": 28.5619, "lon": -80.5774, "country": "USA"},
    "CCSFS SLC-41": {"lat": 28.5833, "lon": -80.5830, "country": "USA"},
    "VSFB SLC-4E": {"lat": 34.6321, "lon": -120.6108, "country": "USA"},
    "Baikonur LC-1": {"lat": 45.9200, "lon": 63.3420, "country": "KAZ"},
    "Baikonur LC-31": {"lat": 45.9960, "lon": 63.5640, "country": "KAZ"},
    "Vostochny": {"lat": 51.8840, "lon": 128.3340, "country": "RUS"},
    "Kourou ELA-3": {"lat": 5.2390, "lon": -52.7680, "country": "FRA"},
    "Wenchang LC-1": {"lat": 19.6140, "lon": 110.9510, "country": "CHN"},
    "Jiuquan": {"lat": 40.9580, "lon": 100.2910, "country": "CHN"},
    "Satish Dhawan": {"lat": 13.7330, "lon": 80.2350, "country": "IND"},
    "Tanegashima": {"lat": 30.4000, "lon": 131.0000, "country": "JPN"},
    "Rocket Lab LC-1A": {"lat": -39.2628, "lon": 177.8645, "country": "NZL"},
    "Rocket Lab LC-2": {"lat": 37.8404, "lon": -75.4884, "country": "USA"},
    "Plesetsk": {"lat": 62.9271, "lon": 40.5777, "country": "RUS"},
}


def simulate_launch_trajectory(pad_lat: float, pad_lon: float,
                                azimuth: float, elapsed_seconds: float,
                                target_alt_km: float = 400) -> Dict:
    """
    Simulate realistic rocket trajectory from launch pad.
    Models: vertical ascent -> gravity turn -> orbit insertion

    Returns lat, lon, alt, velocity, phase at given time after liftoff.
    """
    if elapsed_seconds < 0:
        return {"lat": pad_lat, "lon": pad_lon, "alt": 0, "velocity": 0,
                "phase": "PRE-LAUNCH", "progress": 0}

    # Mission phases (approximate for Falcon 9 / generic medium launcher)
    # Phase 1: Vertical ascent (0-60s)
    # Phase 2: Gravity turn / Max-Q (60-150s)
    # Phase 3: MECO + Stage separation (150-160s)
    # Phase 4: Second stage burn (160-480s)
    # Phase 5: Coast to orbit (480-600s)
    # Phase 6: Orbit insertion (600+s)

    t = elapsed_seconds
    max_t = 600  # ~10 minutes to orbit

    if t <= 60:
        # Vertical ascent
        phase = "UCHIRISH"
        alt = 0.5 * 30 * t * t / 1000  # ~30 m/s^2 initially, in km
        alt = min(alt, 15)
        velocity = 30 * t / 1000  # km/s
        ground_dist = 0.1 * t / 1000  # barely moves horizontally
        progress = t / max_t * 100

    elif t <= 150:
        # Gravity turn — starts pitching over
        phase = "GRAVITATSIYA BURILISHI"
        dt = t - 60
        alt = 15 + dt * 0.3 + 0.001 * dt * dt  # accelerating upward
        alt = min(alt, 80)
        velocity = 1.8 + dt * 0.025  # km/s
        ground_dist = 0.002 * dt * dt  # starts moving downrange
        progress = t / max_t * 100

    elif t <= 160:
        # Stage separation
        phase = "BOSQICH AJRALISHI"
        dt = t - 150
        alt = 80 + dt * 2
        velocity = 4.0
        ground_dist = 50 + dt * 5
        progress = t / max_t * 100

    elif t <= 480:
        # Second stage burn
        phase = "2-BOSQICH YONISHI"
        dt = t - 160
        fraction = dt / 320
        alt = 100 + fraction * (target_alt_km - 100)
        velocity = 4.0 + fraction * 3.66  # reaching orbital velocity
        ground_dist = 60 + dt * 2.5
        progress = t / max_t * 100

    elif t <= 600:
        # Coast + orbit insertion
        phase = "ORBITAGA CHIQISH"
        dt = t - 480
        fraction = dt / 120
        alt = target_alt_km - 10 + fraction * 10
        velocity = 7.66  # orbital velocity
        ground_dist = 860 + dt * 7
        progress = t / max_t * 100

    else:
        # In orbit
        phase = "ORBITADA"
        alt = target_alt_km
        velocity = 7.66
        ground_dist = 1700 + (t - 600) * 7.66
        progress = 100

    # Convert ground distance to lat/lon offset
    azimuth_rad = math.radians(azimuth)
    lat_offset = (ground_dist / 6371) * math.degrees(1) * math.cos(azimuth_rad)
    lon_offset = (ground_dist / 6371) * math.degrees(1) * math.sin(azimuth_rad) / math.cos(math.radians(pad_lat))

    current_lat = pad_lat + lat_offset
    current_lon = pad_lon + lon_offset

    # Clamp
    current_lat = max(-90, min(90, current_lat))
    if current_lon > 180: current_lon -= 360
    if current_lon < -180: current_lon += 360

    return {
        "lat": round(current_lat, 4),
        "lon": round(current_lon, 4),
        "alt": round(max(0, alt), 2),
        "velocity": round(velocity, 3),
        "phase": phase,
        "progress": round(min(progress, 100), 1),
        "elapsed_seconds": round(t, 0),
        "mach": round(velocity / 0.343, 1) if velocity < 8 else None,
        "g_force": round(min(velocity * 3, 6), 1) if t < 480 else 0,
    }


def generate_trajectory_points(pad_lat, pad_lon, azimuth, max_time=660, step=5):
    """Generate full trajectory path for visualization"""
    points = []
    for t in range(0, max_time, step):
        pos = simulate_launch_trajectory(pad_lat, pad_lon, azimuth, t)
        points.append(pos)
    return points


class LaunchMonitorAgent(BaseAgent):
    def __init__(self):
        super().__init__("launch_monitor", agent_config.LAUNCH_INTERVAL)
        self.cached_launches: List[Dict] = []
        self.in_flight: List[Dict] = []

    async def execute(self):
        now = datetime.now(timezone.utc)

        # Fetch from Launch Library 2
        data = await self.fetch_json(
            f"{api_config.LAUNCH_API_URL}/launch/upcoming/",
            {"limit": 20, "mode": "detailed"}
        )

        # Also fetch recent launches (might be in flight)
        recent_data = await self.fetch_json(
            f"{api_config.LAUNCH_API_URL}/launch/previous/",
            {"limit": 5, "mode": "detailed"}
        )

        launches = []
        all_results = []

        if data and "results" in data:
            all_results.extend(data["results"])
        if recent_data and "results" in recent_data:
            all_results.extend(recent_data["results"])

        if all_results:
            for launch in all_results:
                parsed = self._parse_launch(launch, now)
                if parsed:
                    launches.append(parsed)
        else:
            self._last_error = "Launch Library 2 API unreachable"

        # Separate in-flight launches
        self.in_flight = [l for l in launches if l.get("is_in_flight")]

        # For in-flight rockets, calculate real-time trajectory
        for flight in self.in_flight:
            elapsed = flight.get("elapsed_seconds", 0)
            pad_lat = flight.get("pad_lat", 0)
            pad_lon = flight.get("pad_lon", 0)
            azimuth = flight.get("launch_azimuth", 90)

            # Current position
            current_pos = simulate_launch_trajectory(
                pad_lat, pad_lon, azimuth, elapsed
            )
            flight["current_position"] = current_pos

            # Full trajectory path
            flight["trajectory"] = generate_trajectory_points(
                pad_lat, pad_lon, azimuth
            )

        # For upcoming launches close to T-0, pre-generate trajectory preview
        for launch in launches:
            if not launch.get("is_in_flight") and launch.get("countdown_seconds"):
                cd = launch["countdown_seconds"]
                if 0 < cd < 86400:  # Within 24 hours
                    launch["trajectory_preview"] = generate_trajectory_points(
                        launch.get("pad_lat", 0),
                        launch.get("pad_lon", 0),
                        launch.get("launch_azimuth", 90),
                        max_time=660, step=15
                    )

        # Sort: in-flight first, then by countdown
        launches.sort(key=lambda x: (
            0 if x.get("is_in_flight") else 1,
            x.get("countdown_seconds") or 999999
        ))

        self.cached_launches = launches

        # Emit launch update
        await self.emit(EventType.LAUNCH_UPDATE, {
            "launches": launches,
            "total_upcoming": len([l for l in launches if not l.get("is_in_flight")]),
            "in_flight_count": len(self.in_flight),
            "in_flight": self.in_flight,
            "next_launch": next((l for l in launches if not l.get("is_in_flight") and (l.get("countdown_seconds") or 0) > 0), None),
            "launch_pads": self._get_active_pads(launches),
            "timestamp": now.isoformat(),
        })

        # Countdown alerts
        for launch in launches:
            if not launch.get("is_in_flight"):
                cd = launch.get("countdown_seconds")
                if cd and 0 < cd < 3600:
                    await self.emit(EventType.LAUNCH_COUNTDOWN, {
                        "launch": launch,
                        "countdown_seconds": cd,
                        "message": f"Uchirish: {launch['name']} — {int(cd // 60)} daqiqa qoldi!",
                    }, priority=2 if cd < 600 else 1)

        # In-flight live updates (high priority)
        for flight in self.in_flight:
            pos = flight.get("current_position", {})
            await self.emit(EventType.LAUNCH_COUNTDOWN, {
                "launch": flight,
                "is_in_flight": True,
                "position": pos,
                "message": f"UCHISHDA: {flight['name']} — {pos.get('phase', '?')}, {pos.get('alt', 0)} km",
            }, priority=3)

    def _parse_launch(self, launch: Dict, now: datetime) -> Optional[Dict]:
        """Parse Launch Library 2 API response into our format"""
        try:
            pad = launch.get("pad", {})
            rocket = launch.get("rocket", {}).get("configuration", {})
            status = launch.get("status", {})
            status_name = status.get("name", "Unknown")
            status_abbrev = status.get("abbrev", "")

            window_start = launch.get("window_start", "")
            countdown_seconds = None
            elapsed_seconds = None
            is_in_flight = False

            if window_start:
                try:
                    launch_time = datetime.fromisoformat(window_start.replace("Z", "+00:00"))
                    diff = (launch_time - now).total_seconds()

                    if diff > 0:
                        countdown_seconds = diff
                    else:
                        elapsed_seconds = abs(diff)
                except Exception:
                    pass

            # Detect in-flight status
            if status_abbrev in ("InFlight", "Success") and elapsed_seconds and elapsed_seconds < 7200:
                is_in_flight = True
            if "flight" in status_name.lower() or "in flight" in status_name.lower():
                is_in_flight = True

            # Pad coordinates
            pad_lat = float(pad.get("latitude", 0) or 0)
            pad_lon = float(pad.get("longitude", 0) or 0)

            # Determine launch azimuth based on target orbit and location
            azimuth = self._estimate_azimuth(pad_lat, pad_lon, launch)

            # Mission info
            mission = launch.get("mission") or {}
            mission_type = mission.get("type", "")
            orbit_name = mission.get("orbit", {}).get("name", "") if mission.get("orbit") else ""

            return {
                "id": launch.get("id", ""),
                "name": launch.get("name", "Unknown"),
                "short_name": rocket.get("name", launch.get("name", "")[:30]),
                "status": status_name,
                "status_abbrev": status_abbrev,
                "is_in_flight": is_in_flight,
                "window_start": window_start,
                "countdown_seconds": countdown_seconds,
                "elapsed_seconds": elapsed_seconds,
                "rocket_name": rocket.get("full_name", "Unknown"),
                "rocket_family": rocket.get("family", ""),
                "provider": launch.get("launch_service_provider", {}).get("name", "Unknown"),
                "provider_type": launch.get("launch_service_provider", {}).get("type", ""),
                "pad_name": pad.get("name", "Unknown"),
                "pad_location": pad.get("location", {}).get("name", "Unknown"),
                "pad_lat": pad_lat,
                "pad_lon": pad_lon,
                "pad_country": pad.get("location", {}).get("country_code", ""),
                "mission_name": mission.get("name", ""),
                "mission_description": mission.get("description", ""),
                "mission_type": mission_type,
                "orbit_name": orbit_name,
                "image_url": launch.get("image", ""),
                "probability": launch.get("probability", -1),
                "launch_azimuth": azimuth,
            }
        except Exception:
            return None

    def _estimate_azimuth(self, lat, lon, launch) -> float:
        """Estimate launch azimuth based on pad location and mission"""
        mission = launch.get("mission") or {}
        orbit = mission.get("orbit", {}) if mission else {}
        orbit_name = (orbit.get("name", "") if orbit else "").lower()

        # Polar orbits from Vandenberg/Plesetsk go south
        if lat > 33 and lon < -118:  # Vandenberg
            return 195
        if lat > 60:  # Plesetsk
            return 350

        # SSO (Sun-synchronous) - nearly polar
        if "sun" in orbit_name or "sso" in orbit_name:
            return 170 if lat > 0 else 10

        # GEO launches go east
        if "geo" in orbit_name:
            return 90

        # Default ISS/LEO inclination launches go northeast from most pads
        if lat > 20:
            return 45  # Northeast (Cape Canaveral, Baikonur style)
        elif lat > 0:
            return 80  # Near-equatorial pads go east
        elif lat < -30:
            return 45  # Southern hemisphere
        return 90

    def _get_active_pads(self, launches: List[Dict]) -> List[Dict]:
        """Get all launch pads that have upcoming or active launches"""
        pads = {}
        for l in launches:
            pad_name = l.get("pad_name", "")
            if pad_name and l.get("pad_lat"):
                key = f"{l['pad_lat']:.2f},{l['pad_lon']:.2f}"
                if key not in pads:
                    pads[key] = {
                        "name": pad_name,
                        "location": l.get("pad_location", ""),
                        "lat": l["pad_lat"],
                        "lon": l["pad_lon"],
                        "country": l.get("pad_country", ""),
                        "has_in_flight": False,
                        "has_upcoming": False,
                        "launches": [],
                    }
                pads[key]["launches"].append(l["name"])
                if l.get("is_in_flight"):
                    pads[key]["has_in_flight"] = True
                elif l.get("countdown_seconds") and l["countdown_seconds"] > 0:
                    pads[key]["has_upcoming"] = True
        return list(pads.values())

    # No demo data — only real API data
