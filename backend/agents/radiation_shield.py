"""
Agent 8: Radiation Shield Monitor
Monitors space radiation levels, Van Allen belts, and crew safety
"""
import math
import random
from datetime import datetime, timezone

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType
from config import agent_config


class RadiationShieldAgent(BaseAgent):
    def __init__(self):
        super().__init__("radiation_shield", agent_config.RADIATION_INTERVAL)

    async def execute(self):
        now = datetime.now(timezone.utc)
        random.seed(int(now.timestamp()) // 60)

        # Simulate radiation environment
        # Galactic Cosmic Rays (GCR) - fairly constant
        gcr_flux = 3.5 + math.sin(now.timestamp() / 86400 * 0.1) * 0.5 + random.gauss(0, 0.1)

        # Solar Energetic Particles (SEP) - sporadic
        sep_flux = max(0, random.expovariate(2) * 10)

        # Trapped radiation (Van Allen belts)
        inner_belt = {
            "center_alt_km": 3000,
            "intensity": 50 + random.gauss(0, 5),
            "proton_flux": round(1e4 + random.gauss(0, 1000), 0),
        }
        outer_belt = {
            "center_alt_km": 20000,
            "intensity": 30 + random.gauss(0, 3),
            "electron_flux": round(1e6 + random.gauss(0, 100000), 0),
        }

        # ISS radiation dose rate (typical ~0.5 mSv/day)
        iss_dose_rate = 0.5 + random.gauss(0, 0.05) + sep_flux * 0.01
        annual_dose = iss_dose_rate * 365

        # South Atlantic Anomaly (SAA)
        saa_active = random.random() < 0.3  # ISS passes through ~30% of time
        if saa_active:
            iss_dose_rate *= 3

        # Crew safety assessment
        if iss_dose_rate > 2:
            crew_risk = "CRITICAL"
            crew_action = "Ekipaj himoya qismiga o'tishi kerak!"
        elif iss_dose_rate > 1:
            crew_risk = "HIGH"
            crew_action = "EVA bekor qilinsin, radiatsiya monitored"
        elif iss_dose_rate > 0.7:
            crew_risk = "ELEVATED"
            crew_action = "EVA cheklansin"
        else:
            crew_risk = "NORMAL"
            crew_action = "Barcha faoliyat xavfsiz"

        # Electronics risk at various altitudes
        electronics_risk = []
        for alt in [400, 800, 2000, 5000, 20000, 36000]:
            if alt < 1000:
                risk = "LOW"
            elif alt < 5000:
                risk = "HIGH" if abs(alt - inner_belt["center_alt_km"]) < 2000 else "MEDIUM"
            elif alt < 25000:
                risk = "HIGH" if abs(alt - outer_belt["center_alt_km"]) < 5000 else "MEDIUM"
            else:
                risk = "MEDIUM"
            electronics_risk.append({"altitude_km": alt, "risk": risk})

        # Radiation map data (simplified global grid)
        radiation_map = []
        for lat in range(-80, 81, 20):
            for lon in range(-180, 181, 30):
                # SAA region: high radiation ~(-30, -50) to (-15, 10)
                saa_factor = 1.0
                if -50 <= lat <= -10 and -60 <= lon <= 20:
                    saa_factor = 5.0 + random.uniform(0, 3)
                # Polar regions: higher due to less magnetic shielding
                polar_factor = 1.0 + abs(lat) / 90 * 2
                value = round(gcr_flux * polar_factor * saa_factor + random.uniform(0, 0.5), 2)
                radiation_map.append({"lat": lat, "lon": lon, "value": value})

        await self.emit(EventType.RADIATION_UPDATE, {
            "gcr_flux": round(gcr_flux, 2),
            "sep_flux": round(sep_flux, 2),
            "iss_dose_rate_mSv_day": round(iss_dose_rate, 3),
            "annual_dose_mSv": round(annual_dose, 1),
            "saa_active": saa_active,
            "inner_belt": inner_belt,
            "outer_belt": outer_belt,
            "crew_risk": crew_risk,
            "crew_action": crew_action,
            "electronics_risk": electronics_risk,
            "radiation_map": radiation_map,
            "timestamp": now.isoformat(),
        })

        if iss_dose_rate > 1:
            await self.emit(EventType.RADIATION_ALERT, {
                "level": crew_risk,
                "dose_rate": round(iss_dose_rate, 3),
                "message": f"Radiatsiya darajasi yuqori: {round(iss_dose_rate, 3)} mSv/kun - {crew_action}",
            }, priority=2 if iss_dose_rate > 2 else 1)
