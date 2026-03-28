"""
Agent 4: ISS Live Tracker
Real-time ISS position, crew info, Uzbekistan pass predictions
"""
import math
from datetime import datetime, timezone, timedelta

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType
from config import api_config, agent_config

# Uzbekistan bounding box
UZ_LAT_MIN, UZ_LAT_MAX = 37.0, 45.6
UZ_LON_MIN, UZ_LON_MAX = 56.0, 73.5
TASHKENT_LAT, TASHKENT_LON = 41.2995, 69.2401


class ISSTrackerAgent(BaseAgent):
    def __init__(self):
        super().__init__("iss_tracker", agent_config.ISS_INTERVAL)
        self.crew_cache = None
        self.orbit_path: list = []

    async def execute(self):
        now = datetime.now(timezone.utc)

        # Fetch real-time ISS position
        pos_data = await self.fetch_json(api_config.ISS_POSITION_URL)

        if pos_data and pos_data.get("message") == "success":
            iss_pos = pos_data["iss_position"]
            lat = float(iss_pos["latitude"])
            lon = float(iss_pos["longitude"])
        else:
            # Simulate ISS orbit (51.6 degree inclination, ~92 min period)
            t = now.timestamp()
            period = 92.68 * 60  # seconds
            phase = (t % period) / period * 2 * math.pi
            lat = 51.6 * math.sin(phase)
            lon = ((t % 86400) / 86400 * -360 + math.degrees(phase) * 1.5) % 360
            if lon > 180:
                lon -= 360

        # Calculate ISS altitude and velocity
        alt = 408 + math.sin(now.timestamp() / 300) * 5  # ~408 km with variation
        velocity = 7.66  # km/s

        # Store orbit path for trail visualization
        self.orbit_path.append({"lat": lat, "lon": lon, "time": now.isoformat()})
        if len(self.orbit_path) > 500:
            self.orbit_path = self.orbit_path[-500:]

        # Calculate predicted orbit path (next 90 minutes)
        predicted_path = []
        for minutes_ahead in range(0, 95, 1):
            future_t = now.timestamp() + minutes_ahead * 60
            p_period = 92.68 * 60
            p_phase = (future_t % p_period) / p_period * 2 * math.pi
            p_lat = 51.6 * math.sin(p_phase)
            p_lon = ((future_t % 86400) / 86400 * -360 + math.degrees(p_phase) * 1.5) % 360
            if p_lon > 180:
                p_lon -= 360
            predicted_path.append({
                "lat": round(p_lat, 4),
                "lon": round(p_lon, 4),
                "time_offset_min": minutes_ahead,
            })

        # Check if ISS is over Uzbekistan
        is_over_uzbekistan = (UZ_LAT_MIN <= lat <= UZ_LAT_MAX and UZ_LON_MIN <= lon <= UZ_LON_MAX)

        # Calculate distance to Tashkent
        dist_to_tashkent = self._haversine(lat, lon, TASHKENT_LAT, TASHKENT_LON)

        # Fetch crew info every cycle (it's a tiny API call)
        crew_data = await self.fetch_json(api_config.ISS_ASTROS_URL)
        if crew_data and crew_data.get("message") == "success":
            self.crew_cache = {
                "number": crew_data["number"],
                "people": crew_data["people"],
            }

        # Find next pass over Uzbekistan
        next_uz_pass = None
        for point in predicted_path:
            if (UZ_LAT_MIN <= point["lat"] <= UZ_LAT_MAX and
                UZ_LON_MIN <= point["lon"] <= UZ_LON_MAX):
                next_uz_pass = {
                    "minutes_from_now": point["time_offset_min"],
                    "lat": point["lat"],
                    "lon": point["lon"],
                }
                break

        await self.emit(EventType.ISS_POSITION, {
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "alt": round(alt, 2),
            "velocity": velocity,
            "is_over_uzbekistan": is_over_uzbekistan,
            "distance_to_tashkent_km": round(dist_to_tashkent, 1),
            "crew": self.crew_cache,
            "predicted_path": predicted_path,
            "orbit_path": self.orbit_path[-100:],
            "next_uz_pass": next_uz_pass,
            "timestamp": now.isoformat(),
        })

        if is_over_uzbekistan:
            await self.emit(EventType.ISS_PASS_UZBEKISTAN, {
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "message": f"ISS hozir O'zbekiston ustida! ({round(lat, 2)}, {round(lon, 2)})",
            }, priority=2)

    def _haversine(self, lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
