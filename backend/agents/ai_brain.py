"""
Agent 9: AI Brain Commander
The central intelligence — analyzes all agent data, generates reports,
answers questions, and determines overall threat level
"""
import json
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType, event_bus
from config import agent_config, threat_levels


class AIBrainAgent(BaseAgent):
    """
    Collects data from all agents, performs cross-agent analysis,
    generates natural language reports and threat assessments.
    """

    def __init__(self):
        super().__init__("ai_brain", agent_config.AI_BRAIN_INTERVAL)
        self.latest_data: Dict = {}
        self.threat_history: List[Dict] = []
        self.analysis_count = 0

        # Subscribe to all agent events
        self._setup_subscriptions()

    def _setup_subscriptions(self):
        """Will be called after event loop is running"""
        pass

    async def execute(self):
        now = datetime.now(timezone.utc)
        self.analysis_count += 1

        # Gather latest data from event bus history
        recent = event_bus.get_recent_events(limit=100)
        self._process_recent_events(recent)

        # Cross-agent analysis
        analysis = self._perform_analysis(now)

        # Generate overall threat level
        overall_threat = self._calculate_threat_level()

        # Generate natural language report
        report = self._generate_report(analysis, overall_threat, now)

        # Store threat history
        self.threat_history.append({
            "timestamp": now.isoformat(),
            "level": overall_threat["level"],
            "score": overall_threat["score"],
        })
        if len(self.threat_history) > 500:
            self.threat_history = self.threat_history[-500:]

        # Emit AI analysis
        await self.emit(EventType.AI_ANALYSIS, {
            "analysis": analysis,
            "insights": self._generate_insights(analysis),
            "analysis_number": self.analysis_count,
            "timestamp": now.isoformat(),
        })

        # Emit threat level
        await self.emit(EventType.AI_THREAT_LEVEL, {
            "overall": overall_threat,
            "history": self.threat_history[-60:],
            "breakdown": analysis.get("threat_breakdown", {}),
        })

        # Emit report
        await self.emit(EventType.AI_REPORT, {
            "report": report,
            "timestamp": now.isoformat(),
        })

    def _process_recent_events(self, events: List[Dict]):
        """Extract latest data from each agent's events"""
        for event in events:
            etype = event.get("type", "")
            data = event.get("data", {})

            if etype == "satellite_batch":
                self.latest_data["satellites"] = data
            elif etype == "debris_update":
                self.latest_data["debris"] = data
            elif etype == "solar_weather":
                self.latest_data["solar"] = data
            elif etype == "iss_position":
                self.latest_data["iss"] = data
            elif etype == "asteroid_update":
                self.latest_data["asteroids"] = data
            elif etype == "launch_update":
                self.latest_data["launches"] = data
            elif etype == "orbit_prediction":
                self.latest_data["orbits"] = data
            elif etype == "radiation_update":
                self.latest_data["radiation"] = data

    def _perform_analysis(self, now: datetime) -> Dict:
        """Cross-agent analysis — find correlations and patterns"""
        analysis = {
            "active_agents": len(event_bus.agent_statuses),
            "total_events_processed": len(event_bus.get_recent_events(limit=1000)),
            "threat_breakdown": {},
        }

        # Satellite analysis
        sat_data = self.latest_data.get("satellites", {})
        analysis["total_satellites"] = sat_data.get("total_count", 0)
        analysis["satellites_over_uz"] = len(sat_data.get("over_uzbekistan", []) if isinstance(sat_data.get("over_uzbekistan"), list) else [])

        # Debris analysis
        debris_data = self.latest_data.get("debris", {})
        analysis["total_debris"] = debris_data.get("total_count", 0)
        analysis["debris_by_risk"] = debris_data.get("by_risk", {})
        debris_threat = min(100, analysis["total_debris"] / 200)
        analysis["threat_breakdown"]["debris"] = round(debris_threat, 1)

        # Solar analysis
        solar_data = self.latest_data.get("solar", {})
        kp = solar_data.get("kp_index", 0)
        analysis["kp_index"] = kp
        analysis["solar_storm"] = solar_data.get("storm_level", "Noma'lum")
        solar_threat = min(100, kp * 12)
        analysis["threat_breakdown"]["solar"] = round(solar_threat, 1)

        # Asteroid analysis
        ast_data = self.latest_data.get("asteroids", {})
        analysis["active_asteroids"] = ast_data.get("total_count", 0)
        analysis["hazardous_asteroids"] = ast_data.get("hazardous_count", 0)
        closest = ast_data.get("closest_approach", {})
        if closest:
            analysis["closest_asteroid"] = closest.get("name", "")
            analysis["closest_distance_lunar"] = closest.get("miss_distance_lunar", 999)
            ast_threat = min(100, 100 / max(closest.get("miss_distance_lunar", 999), 0.01))
        else:
            ast_threat = 0
        analysis["threat_breakdown"]["asteroid"] = round(ast_threat, 1)

        # Radiation analysis
        rad_data = self.latest_data.get("radiation", {})
        analysis["radiation_risk"] = rad_data.get("crew_risk", "NORMAL")
        dose = rad_data.get("iss_dose_rate_mSv_day", 0.5)
        rad_threat = min(100, dose * 50)
        analysis["threat_breakdown"]["radiation"] = round(rad_threat, 1)

        # ISS analysis
        iss_data = self.latest_data.get("iss", {})
        analysis["iss_over_uzbekistan"] = iss_data.get("is_over_uzbekistan", False)
        analysis["iss_crew_count"] = iss_data.get("crew", {}).get("number", 0) if iss_data.get("crew") else 0

        # Launch analysis
        launch_data = self.latest_data.get("launches", {})
        analysis["upcoming_launches"] = launch_data.get("total_upcoming", 0)
        next_launch = launch_data.get("next_launch", {})
        if next_launch:
            analysis["next_launch_name"] = next_launch.get("name", "")
            analysis["next_launch_countdown"] = next_launch.get("countdown_seconds", 0)

        # Orbit decay analysis
        orbit_data = self.latest_data.get("orbits", {})
        imminent = orbit_data.get("imminent_reentries", [])
        analysis["imminent_reentries"] = len(imminent)
        if imminent:
            analysis["most_urgent_reentry"] = imminent[0].get("name", "")
            orbit_threat = min(100, 100 / max(imminent[0].get("days_to_reentry", 999), 0.1))
        else:
            orbit_threat = 0
        analysis["threat_breakdown"]["orbit_decay"] = round(orbit_threat, 1)

        return analysis

    def _calculate_threat_level(self) -> Dict:
        """Calculate overall threat level from all sources"""
        latest_analysis_breakdown = {}
        for event in event_bus.get_recent_events(EventType.AI_ANALYSIS, limit=1):
            latest_analysis_breakdown = event.get("data", {}).get("analysis", {}).get("threat_breakdown", {})

        if not latest_analysis_breakdown:
            latest_analysis_breakdown = self.latest_data.get("threat_breakdown", {})

        if latest_analysis_breakdown:
            weights = {
                "debris": 0.25,
                "solar": 0.2,
                "asteroid": 0.2,
                "radiation": 0.15,
                "orbit_decay": 0.2,
            }
            score = sum(
                latest_analysis_breakdown.get(k, 0) * w
                for k, w in weights.items()
            )
        else:
            score = random.uniform(5, 25)  # Default low threat

        # Determine level
        if score >= 75:
            level = threat_levels.CRITICAL
        elif score >= 50:
            level = threat_levels.HIGH
        elif score >= 30:
            level = threat_levels.MEDIUM
        elif score >= 15:
            level = threat_levels.LOW
        else:
            level = threat_levels.SAFE

        return {
            "score": round(score, 1),
            "level": level,
            "label": threat_levels.LABELS.get(level, "NOMA'LUM"),
            "color": threat_levels.COLORS.get(level, "#ffffff"),
        }

    def _generate_insights(self, analysis: Dict) -> List[Dict]:
        """Generate actionable insights from analysis"""
        insights = []

        if analysis.get("hazardous_asteroids", 0) > 0:
            insights.append({
                "type": "warning",
                "icon": "asteroid",
                "title": "Xavfli asteroidlar aniqlandi",
                "detail": f"{analysis['hazardous_asteroids']} ta xavfli asteroid Yer yonidan o'tmoqda",
            })

        kp = analysis.get("kp_index", 0)
        if kp >= 5:
            insights.append({
                "type": "alert",
                "icon": "solar",
                "title": "Geomagnit bo'ron",
                "detail": f"Kp index: {kp} - yo'ldoshlar va aloqa tizimlariga ta'sir qilishi mumkin",
            })

        if analysis.get("iss_over_uzbekistan"):
            insights.append({
                "type": "info",
                "icon": "iss",
                "title": "ISS O'zbekiston ustida!",
                "detail": "Xalqaro Kosmik Stansiya hozir mamlakatimiz ustidan o'tmoqda",
            })

        if analysis.get("imminent_reentries", 0) > 0:
            insights.append({
                "type": "warning",
                "icon": "reentry",
                "title": "Yaqin qayta kirish",
                "detail": f"{analysis.get('most_urgent_reentry', 'Obyekt')} tez orada atmosferaga qayta kiradi",
            })

        debris_risk = analysis.get("debris_by_risk", {})
        if debris_risk.get("high", 0) > 100:
            insights.append({
                "type": "info",
                "icon": "debris",
                "title": "Kosmik axlat ogohlantirish",
                "detail": f"{debris_risk['high']} ta yirik kosmik axlat kuzatilmoqda",
            })

        return insights

    def _generate_report(self, analysis: Dict, threat: Dict, now: datetime) -> str:
        """Generate natural language status report in Uzbek"""
        time_str = now.strftime("%Y-%m-%d %H:%M UTC")

        report = f"""
=== UzCosmos AI - Kosmik Vaziyat Hisoboti ===
Vaqt: {time_str}
Umumiy xavf darajasi: {threat['label']} ({threat['score']}/100)

KOSMIK MUHIT:
- Kuzatilayotgan yo'ldoshlar: {analysis.get('total_satellites', 'N/A')}
- Kosmik axlat obyektlari: {analysis.get('total_debris', 'N/A')}
- Xavfli asteroidlar: {analysis.get('hazardous_asteroids', 0)}

QUYOSH FAOLIYATI:
- Kp index: {analysis.get('kp_index', 'N/A')}
- Bo'ron darajasi: {analysis.get('solar_storm', 'N/A')}

ISS HOLATI:
- Ekipaj soni: {analysis.get('iss_crew_count', 'N/A')}
- O'zbekiston ustida: {'Ha' if analysis.get('iss_over_uzbekistan') else "Yo'q"}
- Radiatsiya xavfi: {analysis.get('radiation_risk', 'N/A')}

KELGUSI TADBIRLAR:
- Rejalashtirilgan uchirishlar: {analysis.get('upcoming_launches', 0)}
- Yaqin qayta kirishlar: {analysis.get('imminent_reentries', 0)}

Tahlil #{self.analysis_count} | Faol agentlar: {analysis.get('active_agents', 0)}/10
"""
        return report.strip()
