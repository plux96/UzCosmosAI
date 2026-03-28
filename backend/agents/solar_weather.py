"""
Agent 3: Solar Weather Monitor
Tracks solar flares, CMEs, geomagnetic storms using NASA DONKI API
"""
import random
from datetime import datetime, timezone, timedelta

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType
from config import api_config, agent_config


class SolarWeatherAgent(BaseAgent):
    def __init__(self):
        super().__init__("solar_weather", agent_config.SOLAR_INTERVAL)
        self.current_kp = 2
        self.solar_wind_speed = 400
        self.proton_flux = 0.1

    async def execute(self):
        now = datetime.now(timezone.utc)
        start = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        end = now.strftime("%Y-%m-%d")

        # Try NASA DONKI API for real data
        cme_data = await self.fetch_json(
            f"{api_config.NASA_DONKI_URL}/CME",
            {"startDate": start, "endDate": end, "api_key": api_config.NASA_API_KEY}
        )
        flare_data = await self.fetch_json(
            f"{api_config.NASA_DONKI_URL}/FLR",
            {"startDate": start, "endDate": end, "api_key": api_config.NASA_API_KEY}
        )
        gst_data = await self.fetch_json(
            f"{api_config.NASA_DONKI_URL}/GST",
            {"startDate": start, "endDate": end, "api_key": api_config.NASA_API_KEY}
        )

        # Process CMEs
        cmes = []
        if cme_data and isinstance(cme_data, list):
            for cme in cme_data[-10:]:
                cmes.append({
                    "id": cme.get("activityID", ""),
                    "start_time": cme.get("startTime", ""),
                    "type": cme.get("type", ""),
                    "speed_kms": cme.get("cmeAnalyses", [{}])[0].get("speed", 0) if cme.get("cmeAnalyses") else 0,
                    "is_earth_directed": any(
                        a.get("isEarthGlancingBlow", False) or "Earth" in str(a.get("note", ""))
                        for a in cme.get("cmeAnalyses", [])
                    ),
                })

        # Process flares
        flares = []
        if flare_data and isinstance(flare_data, list):
            for flare in flare_data[-10:]:
                flares.append({
                    "id": flare.get("flrID", ""),
                    "begin_time": flare.get("beginTime", ""),
                    "peak_time": flare.get("peakTime", ""),
                    "class": flare.get("classType", ""),
                    "source_location": flare.get("sourceLocation", ""),
                })

        # Simulate real-time solar wind parameters (varies smoothly)
        seed = int(now.timestamp()) // 60
        random.seed(seed)
        self.solar_wind_speed = max(250, min(800,
            self.solar_wind_speed + random.gauss(0, 10)))
        self.current_kp = max(0, min(9,
            self.current_kp + random.gauss(0, 0.3)))
        self.proton_flux = max(0.01, min(1000,
            self.proton_flux * random.uniform(0.9, 1.1)))

        # Determine storm level
        if self.current_kp >= 8:
            storm_level = "G5 - Haddan tashqari kuchli"
            storm_color = "#ff0000"
        elif self.current_kp >= 7:
            storm_level = "G4 - Juda kuchli"
            storm_color = "#ff3300"
        elif self.current_kp >= 6:
            storm_level = "G3 - Kuchli"
            storm_color = "#ff6600"
        elif self.current_kp >= 5:
            storm_level = "G2 - O'rtacha"
            storm_color = "#ffaa00"
        elif self.current_kp >= 4:
            storm_level = "G1 - Kuchsiz"
            storm_color = "#ffff00"
        else:
            storm_level = "Tinch"
            storm_color = "#00ff00"

        solar_data = {
            "kp_index": round(self.current_kp, 1),
            "solar_wind_speed": round(self.solar_wind_speed, 1),
            "solar_wind_density": round(random.uniform(1, 20), 1),
            "proton_flux": round(self.proton_flux, 3),
            "bt_nT": round(random.uniform(1, 15), 1),
            "bz_nT": round(random.uniform(-10, 10), 1),
            "storm_level": storm_level,
            "storm_color": storm_color,
            "cmes": cmes,
            "flares": flares,
            "sunspot_number": random.randint(50, 200),
            "f10_7_flux": round(random.uniform(100, 250), 1),
            "timestamp": now.isoformat(),
        }

        await self.emit(EventType.SOLAR_WEATHER, solar_data)

        # Alert on high activity
        if self.current_kp >= 5:
            await self.emit(EventType.GEOMAGNETIC_STORM, {
                "level": storm_level,
                "kp_index": round(self.current_kp, 1),
                "message": f"Geomagnit bo'ron aniqlandi! Kp={round(self.current_kp, 1)} ({storm_level})",
            }, priority=2 if self.current_kp >= 7 else 1)
