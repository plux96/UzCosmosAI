"""
Agent 7: Orbit Predictor
Predicts orbital decay, re-entry events, and maneuver requirements
"""
import math
import random
from datetime import datetime, timezone, timedelta

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType
from config import agent_config


class OrbitPredictorAgent(BaseAgent):
    def __init__(self):
        super().__init__("orbit_predictor", agent_config.ORBIT_INTERVAL)
        self.tracked_objects = self._init_tracked_objects()

    def _init_tracked_objects(self):
        """Objects with known orbital decay characteristics"""
        return [
            {"name": "ISS (Zarya)", "norad_id": "25544", "alt_km": 408, "decay_rate": 0.05, "mass_kg": 420000},
            {"name": "Tiangong", "norad_id": "48274", "alt_km": 385, "decay_rate": 0.04, "mass_kg": 100000},
            {"name": "Hubble Space Telescope", "norad_id": "20580", "alt_km": 535, "decay_rate": 0.02, "mass_kg": 11110},
            {"name": "COSMOS 2251 debris", "norad_id": "33442", "alt_km": 780, "decay_rate": 0.001, "mass_kg": 50},
            {"name": "Starlink-1234", "norad_id": "44713", "alt_km": 550, "decay_rate": 0.01, "mass_kg": 260},
            {"name": "CZ-5B Rocket Body", "norad_id": "48275", "alt_km": 310, "decay_rate": 0.15, "mass_kg": 21000},
            {"name": "Fengyun 1C debris", "norad_id": "29261", "alt_km": 650, "decay_rate": 0.005, "mass_kg": 10},
            {"name": "ENVISAT", "norad_id": "27386", "alt_km": 765, "decay_rate": 0.0005, "mass_kg": 8211},
        ]

    async def execute(self):
        now = datetime.now(timezone.utc)
        predictions = []

        for obj in self.tracked_objects:
            # Simulate altitude decay based on atmospheric drag
            days_elapsed = (now.timestamp() % 86400) / 86400
            random.seed(hash(obj["norad_id"]) + int(now.timestamp()) // 3600)

            current_alt = obj["alt_km"] - obj["decay_rate"] * days_elapsed + random.gauss(0, 0.1)

            # Atmospheric density model (exponential)
            if current_alt < 200:
                drag_factor = 10.0
            elif current_alt < 400:
                drag_factor = 2.0
            elif current_alt < 600:
                drag_factor = 0.5
            else:
                drag_factor = 0.1

            # Predict re-entry date
            remaining_alt = current_alt - 100  # Burns up ~100km
            if obj["decay_rate"] * drag_factor > 0:
                days_to_reentry = remaining_alt / (obj["decay_rate"] * drag_factor)
            else:
                days_to_reentry = 999999

            days_to_reentry = min(days_to_reentry, 36500)  # Cap at 100 years
            reentry_date = now + timedelta(days=days_to_reentry)

            # Orbital parameters
            r = 6371 + current_alt
            velocity = math.sqrt(398600.4418 / r)
            period = 2 * math.pi * r / velocity / 60  # minutes

            # Risk assessment
            if days_to_reentry < 7:
                risk = "CRITICAL"
                risk_color = "#ff0000"
            elif days_to_reentry < 30:
                risk = "HIGH"
                risk_color = "#ff6600"
            elif days_to_reentry < 365:
                risk = "MEDIUM"
                risk_color = "#ffaa00"
            else:
                risk = "LOW"
                risk_color = "#00ff00"

            # Debris risk on re-entry
            surviving_mass = obj["mass_kg"] * 0.2 if obj["mass_kg"] > 1000 else 0
            debris_footprint_km = math.sqrt(obj["mass_kg"]) * 0.1

            predictions.append({
                "name": obj["name"],
                "norad_id": obj["norad_id"],
                "current_alt_km": round(current_alt, 2),
                "velocity_kms": round(velocity, 2),
                "period_min": round(period, 2),
                "decay_rate_km_day": round(obj["decay_rate"] * drag_factor, 4),
                "days_to_reentry": round(days_to_reentry, 1),
                "predicted_reentry": reentry_date.isoformat() if days_to_reentry < 36500 else None,
                "risk_level": risk,
                "risk_color": risk_color,
                "mass_kg": obj["mass_kg"],
                "surviving_mass_kg": round(surviving_mass, 1),
                "debris_footprint_km": round(debris_footprint_km, 1),
            })

        predictions.sort(key=lambda x: x["days_to_reentry"])

        await self.emit(EventType.ORBIT_PREDICTION, {
            "predictions": predictions,
            "imminent_reentries": [p for p in predictions if p["days_to_reentry"] < 30],
            "timestamp": now.isoformat(),
        })

        # Alert on imminent re-entries
        for pred in predictions:
            if pred["days_to_reentry"] < 7:
                await self.emit(EventType.ORBIT_DECAY, {
                    "object": pred,
                    "message": f"OGOHLANTIRISH: {pred['name']} {round(pred['days_to_reentry'], 1)} kunda qayta kiradi!",
                }, priority=2)
