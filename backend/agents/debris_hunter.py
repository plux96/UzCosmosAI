"""
Agent 2: Space Debris Hunter
Tracks space debris, calculates collision probabilities
Implements Conjunction Assessment logic
"""
import math
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, List

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType
from config import api_config, agent_config


class DebrisHunterAgent(BaseAgent):
    """
    Monitors space debris and calculates collision risks.
    Generates realistic debris field data and conjunction warnings.
    """

    def __init__(self):
        super().__init__("debris_hunter", agent_config.DEBRIS_INTERVAL)
        self.debris_objects: List[Dict] = []
        self.conjunctions: List[Dict] = []
        self._last_full_update = 0
        self._init_debris_field()

    def _init_debris_field(self):
        """Initialize realistic debris field based on real orbital data"""
        random.seed(12345)

        # Real debris concentration zones
        debris_zones = [
            # LEO debris belt (most dense)
            {"alt_min": 200, "alt_max": 600, "count": 8000, "name": "LEO Past"},
            {"alt_min": 600, "alt_max": 1000, "count": 6000, "name": "LEO Yuqori"},
            # Iridium-Cosmos collision debris
            {"alt_min": 750, "alt_max": 850, "count": 3000, "name": "Iridium-Cosmos"},
            # Chinese ASAT test debris (Fengyun-1C)
            {"alt_min": 200, "alt_max": 4000, "count": 3500, "name": "Fengyun-1C"},
            # MEO
            {"alt_min": 1000, "alt_max": 2000, "count": 1500, "name": "MEO"},
            # GEO graveyard
            {"alt_min": 35500, "alt_max": 36200, "count": 800, "name": "GEO"},
        ]

        obj_id = 50000
        for zone in debris_zones:
            for _ in range(zone["count"]):
                obj_id += 1
                alt = random.uniform(zone["alt_min"], zone["alt_max"])
                inc = random.gauss(70, 25) % 180  # Most debris at high inclination

                # Calculate orbital parameters
                r = 6371 + alt
                period = 2 * math.pi * math.sqrt(r ** 3 / 398600.4418)
                velocity = math.sqrt(398600.4418 / r)

                # Random position
                lat = random.uniform(-90, 90)
                lon = random.uniform(-180, 180)

                # Size categories
                size_mm = random.choices(
                    [random.uniform(1, 10), random.uniform(10, 100), random.uniform(100, 5000)],
                    weights=[70, 25, 5]
                )[0]

                if size_mm > 100:
                    risk_level = "high"
                    color = "#ff0000"
                elif size_mm > 10:
                    risk_level = "medium"
                    color = "#ffaa00"
                else:
                    risk_level = "low"
                    color = "#ffff00"

                self.debris_objects.append({
                    "id": obj_id,
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "alt": round(alt, 2),
                    "velocity": round(velocity, 2),
                    "inclination": round(inc, 2),
                    "size_mm": round(size_mm, 1),
                    "risk_level": risk_level,
                    "color": color,
                    "zone": zone["name"],
                    "period_min": round(period / 60, 2),
                    # Movement parameters
                    "mean_motion": round(1440 / (period / 60), 4),
                    "raan_deg": random.uniform(0, 360),
                    "phase": random.uniform(0, 360),
                })

    async def execute(self):
        """Update debris positions and check for conjunctions"""
        now = datetime.now(timezone.utc)
        timestamp = now.timestamp()

        # Update debris positions (simplified propagation)
        updated_debris = []
        for d in self.debris_objects:
            # Simple circular orbit propagation
            angular_vel = d["mean_motion"] * 360 / 1440  # deg/sec... actually deg/min
            time_offset = (timestamp % 86400) / 60  # minutes since midnight
            new_phase = (d["phase"] + angular_vel * time_offset) % 360

            new_lat = d["inclination"] * math.sin(math.radians(new_phase))
            new_lon = (d["raan_deg"] + new_phase - (timestamp % 86400) / 240) % 360
            if new_lon > 180:
                new_lon -= 360

            updated_debris.append({
                **d,
                "lat": round(new_lat, 4),
                "lon": round(new_lon, 4),
            })

        # Detect potential conjunctions (close approaches)
        self.conjunctions = self._detect_conjunctions(updated_debris)

        # Emit debris update
        await self.emit(EventType.DEBRIS_UPDATE, {
            "debris_objects": updated_debris[:5000],  # Limit for performance
            "total_count": len(updated_debris),
            "by_zone": self._count_by_zone(updated_debris),
            "by_risk": self._count_by_risk(updated_debris),
            "timestamp": now.isoformat(),
        })

        # Emit collision warnings
        if self.conjunctions:
            for conj in self.conjunctions[:10]:  # Top 10 most dangerous
                priority = 3 if conj["probability"] > 0.001 else (2 if conj["probability"] > 0.0001 else 1)
                await self.emit(EventType.COLLISION_WARNING, {
                    "conjunction": conj,
                    "threat_level": priority,
                }, priority=priority)

    def _detect_conjunctions(self, debris: List[Dict]) -> List[Dict]:
        """Simulate conjunction detection (close approaches between objects)"""
        conjunctions = []
        now = datetime.now(timezone.utc)

        # Simulate some realistic conjunction events
        random.seed(int(now.timestamp()) // 300)  # Change every 5 minutes

        num_conjunctions = random.randint(2, 8)
        for i in range(num_conjunctions):
            obj1 = random.choice(debris[:1000])
            obj2 = random.choice(debris[:1000])

            miss_distance = random.choices(
                [random.uniform(0.1, 1), random.uniform(1, 10), random.uniform(10, 100)],
                weights=[5, 30, 65]
            )[0]

            # Probability based on miss distance and object sizes
            combined_size = (obj1["size_mm"] + obj2["size_mm"]) / 1000  # meters
            probability = max(0, min(1, combined_size / (miss_distance * 1000)))

            tca = now + timedelta(minutes=random.randint(5, 1440))

            conjunctions.append({
                "id": f"CONJ-{now.strftime('%Y%m%d')}-{i+1:03d}",
                "object1": {"id": obj1["id"], "alt": obj1["alt"], "zone": obj1["zone"]},
                "object2": {"id": obj2["id"], "alt": obj2["alt"], "zone": obj2["zone"]},
                "miss_distance_km": round(miss_distance, 3),
                "probability": round(probability, 8),
                "tca": tca.isoformat(),
                "altitude_km": round((obj1["alt"] + obj2["alt"]) / 2, 2),
                "relative_velocity_kms": round(random.uniform(1, 15), 2),
            })

        return sorted(conjunctions, key=lambda x: -x["probability"])

    def _count_by_zone(self, debris: List[Dict]) -> Dict[str, int]:
        counts = {}
        for d in debris:
            zone = d["zone"]
            counts[zone] = counts.get(zone, 0) + 1
        return counts

    def _count_by_risk(self, debris: List[Dict]) -> Dict[str, int]:
        counts = {"low": 0, "medium": 0, "high": 0}
        for d in debris:
            counts[d["risk_level"]] = counts.get(d["risk_level"], 0) + 1
        return counts
