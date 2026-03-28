"""
Agent 5: Asteroid Watch
Monitors Near-Earth Objects (NEOs) using NASA NeoWs API
Falls back to NASA SBDB close approach API if rate limited
"""
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, List

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType
from config import api_config, agent_config


class AsteroidWatchAgent(BaseAgent):
    def __init__(self):
        super().__init__("asteroid_watch", agent_config.ASTEROID_INTERVAL)
        self.cached_asteroids: List[Dict] = []
        self._last_successful_fetch = 0
        self._cache_ttl = 3600  # Cache for 1 hour to avoid rate limits

    async def execute(self):
        now = datetime.now(timezone.utc)

        # Use cache if still fresh
        if self.cached_asteroids and (now.timestamp() - self._last_successful_fetch) < self._cache_ttl:
            await self._emit_data(now)
            return

        # Try NASA NeoWs API
        asteroids = await self._fetch_neows(now)

        # If NeoWs fails, try SBDB close approach API (different rate limit)
        if not asteroids:
            asteroids = await self._fetch_sbdb(now)

        if asteroids:
            self.cached_asteroids = asteroids
            self._last_successful_fetch = now.timestamp()
        elif not self.cached_asteroids:
            # No cache and no API — log error, don't show fake data
            self._last_error = "NASA API rate limited, waiting for reset"

        await self._emit_data(now)

    async def _fetch_neows(self, now: datetime) -> List[Dict]:
        """Fetch from NASA NeoWs Feed API"""
        start_date = now.strftime("%Y-%m-%d")
        end_date = (now + timedelta(days=3)).strftime("%Y-%m-%d")

        data = await self.fetch_json(
            f"{api_config.NASA_NEO_URL}/feed",
            {"start_date": start_date, "end_date": end_date, "api_key": api_config.NASA_API_KEY}
        )

        if not data or "near_earth_objects" not in data:
            return []

        asteroids = []
        for date, neos in data["near_earth_objects"].items():
            for neo in neos:
                parsed = self._parse_neo(neo, date)
                if parsed:
                    asteroids.append(parsed)
        return asteroids

    async def _fetch_sbdb(self, now: datetime) -> List[Dict]:
        """Fallback: NASA SBDB Close Approach API (separate rate limit)"""
        date_min = now.strftime("%Y-%m-%d")
        date_max = (now + timedelta(days=7)).strftime("%Y-%m-%d")

        data = await self.fetch_json(
            "https://ssd-api.jpl.nasa.gov/cad.api",
            {"date-min": date_min, "date-max": date_max, "dist-max": "0.05", "sort": "dist"}
        )

        if not data or "data" not in data:
            return []

        fields = data.get("fields", [])
        asteroids = []
        for row in data["data"][:50]:
            entry = dict(zip(fields, row))
            try:
                dist_au = float(entry.get("dist", 1))
                dist_km = dist_au * 149597870.7
                vel_kms = float(entry.get("v_rel", 10))
                h_mag = float(entry.get("h", 25))

                # Estimate diameter from absolute magnitude
                diameter_m = 1329 * (10 ** (-0.2 * h_mag)) * 1000

                is_hazardous = diameter_m > 140 and dist_km < 7500000
                threat_score = min(100, (diameter_m * vel_kms) / max(dist_km / 1e6, 0.01))

                density = 2600
                mass = density * (4/3) * 3.14159 * (diameter_m/2)**3
                impact_energy_mt = (0.5 * mass * (vel_kms * 1000)**2) / 4.184e15

                asteroids.append({
                    "id": entry.get("des", ""),
                    "name": entry.get("des", "Unknown"),
                    "diameter_min_m": round(diameter_m * 0.7, 1),
                    "diameter_max_m": round(diameter_m * 1.3, 1),
                    "is_hazardous": is_hazardous,
                    "miss_distance_km": round(dist_km, 0),
                    "miss_distance_lunar": round(dist_km / 384400, 2),
                    "velocity_kms": round(vel_kms, 2),
                    "approach_date": entry.get("cd", ""),
                    "threat_score": round(threat_score, 2),
                    "impact_energy_mt": round(impact_energy_mt, 4),
                    "absolute_magnitude": h_mag,
                    "orbit_class": entry.get("orbit_id", ""),
                })
            except (ValueError, TypeError):
                continue

        return asteroids

    def _parse_neo(self, neo: Dict, date: str) -> Dict:
        """Parse a single NEO from NeoWs API"""
        try:
            diameter_min = neo.get("estimated_diameter", {}).get("meters", {}).get("estimated_diameter_min", 0)
            diameter_max = neo.get("estimated_diameter", {}).get("meters", {}).get("estimated_diameter_max", 0)
            is_hazardous = neo.get("is_potentially_hazardous_asteroid", False)

            close_approach = neo.get("close_approach_data", [{}])[0]
            miss_distance_km = float(close_approach.get("miss_distance", {}).get("kilometers", 0))
            velocity_kms = float(close_approach.get("relative_velocity", {}).get("kilometers_per_second", 0))
            approach_date = close_approach.get("close_approach_date_full", "")

            avg_diameter = (diameter_min + diameter_max) / 2
            threat_score = min(100, (avg_diameter * velocity_kms) / max(miss_distance_km / 1e6, 0.01))

            density = 2600
            mass = density * (4/3) * 3.14159 * (avg_diameter/2)**3
            impact_energy_mt = (0.5 * mass * (velocity_kms * 1000)**2) / 4.184e15

            return {
                "id": neo.get("id", ""),
                "name": neo.get("name", "Unknown"),
                "diameter_min_m": round(diameter_min, 1),
                "diameter_max_m": round(diameter_max, 1),
                "is_hazardous": is_hazardous,
                "miss_distance_km": round(miss_distance_km, 0),
                "miss_distance_lunar": round(miss_distance_km / 384400, 2),
                "velocity_kms": round(velocity_kms, 2),
                "approach_date": approach_date,
                "threat_score": round(threat_score, 2),
                "impact_energy_mt": round(impact_energy_mt, 4),
                "absolute_magnitude": neo.get("absolute_magnitude_h", 0),
                "orbit_class": date,
            }
        except Exception:
            return None

    async def _emit_data(self, now: datetime):
        """Emit current asteroid data"""
        asteroids = sorted(self.cached_asteroids, key=lambda x: -x.get("threat_score", 0))
        hazardous_count = sum(1 for a in asteroids if a.get("is_hazardous"))
        closest = min(asteroids, key=lambda x: x.get("miss_distance_km", 1e15)) if asteroids else None

        await self.emit(EventType.ASTEROID_UPDATE, {
            "asteroids": asteroids[:50],
            "total_count": len(asteroids),
            "hazardous_count": hazardous_count,
            "closest_approach": closest,
            "data_source": "NASA NeoWs" if asteroids else "No data",
            "timestamp": now.isoformat(),
        })

        for ast in asteroids[:5]:
            if ast.get("is_hazardous") and ast.get("miss_distance_lunar", 999) < 5:
                await self.emit(EventType.ASTEROID_THREAT, {
                    "asteroid": ast,
                    "message": f"Xavfli asteroid: {ast['name']} — {ast['miss_distance_lunar']} Oy masofasida!",
                }, priority=2)
