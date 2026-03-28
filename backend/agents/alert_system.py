"""
Agent 10: Alert System
Aggregates all alerts, prioritizes them, manages alert lifecycle
Provides text-to-speech alerts for critical events
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType, event_bus
from config import agent_config


class AlertSystemAgent(BaseAgent):
    def __init__(self):
        super().__init__("alert_system", agent_config.ALERT_INTERVAL)
        self.active_alerts: List[Dict] = []
        self.alert_history: List[Dict] = []
        self.alert_counter = 0
        self.MAX_ACTIVE = 50
        self.ALERT_TTL_MINUTES = 30

    async def execute(self):
        now = datetime.now(timezone.utc)

        # Scan recent events for alert-worthy items
        recent = event_bus.get_recent_events(limit=50)
        new_alerts = []

        for event in recent:
            etype = event.get("type", "")
            data = event.get("data", {})
            priority = event.get("priority", 0)

            if priority < 1:
                continue

            alert = None

            if etype == "collision_warning":
                conj = data.get("conjunction", {})
                alert = self._create_alert(
                    title="To'qnashuv xavfi",
                    message=f"Miss distance: {conj.get('miss_distance_km', '?')} km, Ehtimollik: {conj.get('probability', '?')}",
                    category="debris",
                    severity="critical" if priority >= 3 else "warning",
                    icon="collision",
                    data=conj,
                )

            elif etype == "geomagnetic_storm":
                alert = self._create_alert(
                    title="Geomagnit bo'ron",
                    message=data.get("message", ""),
                    category="solar",
                    severity="critical" if data.get("kp_index", 0) >= 7 else "warning",
                    icon="solar_storm",
                    data=data,
                )

            elif etype == "asteroid_threat":
                ast = data.get("asteroid", {})
                alert = self._create_alert(
                    title="Xavfli asteroid",
                    message=data.get("message", ""),
                    category="asteroid",
                    severity="warning",
                    icon="asteroid",
                    data=ast,
                )

            elif etype == "iss_pass_uzbekistan":
                alert = self._create_alert(
                    title="ISS O'zbekiston ustida",
                    message=data.get("message", ""),
                    category="iss",
                    severity="info",
                    icon="iss",
                    data=data,
                    voice=True,
                )

            elif etype == "radiation_alert":
                alert = self._create_alert(
                    title="Radiatsiya ogohlantirish",
                    message=data.get("message", ""),
                    category="radiation",
                    severity="critical" if data.get("level") == "CRITICAL" else "warning",
                    icon="radiation",
                    data=data,
                )

            elif etype == "orbit_decay":
                alert = self._create_alert(
                    title="Qayta kirish ogohlantirish",
                    message=data.get("message", ""),
                    category="orbit",
                    severity="warning",
                    icon="reentry",
                    data=data.get("object", {}),
                )

            elif etype == "launch_countdown":
                alert = self._create_alert(
                    title="Uchirish yaqinlashmoqda",
                    message=data.get("message", ""),
                    category="launch",
                    severity="info",
                    icon="rocket",
                    data=data.get("launch", {}),
                )

            if alert and not self._is_duplicate(alert):
                new_alerts.append(alert)

        # Add new alerts
        self.active_alerts.extend(new_alerts)

        # Expire old alerts
        cutoff = (now - timedelta(minutes=self.ALERT_TTL_MINUTES)).isoformat()
        expired = [a for a in self.active_alerts if a["created_at"] < cutoff]
        self.alert_history.extend(expired)
        self.active_alerts = [a for a in self.active_alerts if a["created_at"] >= cutoff]

        # Keep history manageable
        if len(self.alert_history) > 500:
            self.alert_history = self.alert_history[-500:]

        # Trim active alerts
        if len(self.active_alerts) > self.MAX_ACTIVE:
            self.active_alerts.sort(key=lambda x: (-self._severity_score(x["severity"]), x["created_at"]))
            overflow = self.active_alerts[self.MAX_ACTIVE:]
            self.alert_history.extend(overflow)
            self.active_alerts = self.active_alerts[:self.MAX_ACTIVE]

        # Sort by severity and time
        self.active_alerts.sort(key=lambda x: (-self._severity_score(x["severity"]), x["created_at"]))

        # Emit alert summary
        await self.emit(EventType.ALERT, {
            "active_alerts": self.active_alerts[:20],
            "total_active": len(self.active_alerts),
            "new_count": len(new_alerts),
            "by_severity": {
                "critical": sum(1 for a in self.active_alerts if a["severity"] == "critical"),
                "warning": sum(1 for a in self.active_alerts if a["severity"] == "warning"),
                "info": sum(1 for a in self.active_alerts if a["severity"] == "info"),
            },
            "by_category": self._count_by_category(),
            "timestamp": now.isoformat(),
        })

    def _create_alert(self, title, message, category, severity, icon, data=None, voice=False):
        self.alert_counter += 1
        return {
            "id": f"ALERT-{self.alert_counter:06d}",
            "title": title,
            "message": message,
            "category": category,
            "severity": severity,
            "icon": icon,
            "data": data or {},
            "voice": voice,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "acknowledged": False,
        }

    def _is_duplicate(self, new_alert):
        for existing in self.active_alerts[-10:]:
            if (existing["title"] == new_alert["title"] and
                existing["category"] == new_alert["category"]):
                return True
        return False

    def _severity_score(self, severity):
        return {"critical": 3, "warning": 2, "info": 1}.get(severity, 0)

    def _count_by_category(self):
        counts = {}
        for a in self.active_alerts:
            cat = a["category"]
            counts[cat] = counts.get(cat, 0) + 1
        return counts
