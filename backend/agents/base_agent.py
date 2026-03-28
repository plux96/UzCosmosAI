"""
Base Agent — Foundation for all 10 agents
Each agent runs as an independent async task
"""
import asyncio
import logging
import traceback
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import aiohttp

from backend.core.event_bus import Event, EventType, event_bus

logger = logging.getLogger("uzcosmos.agent")


class BaseAgent(ABC):
    """
    Abstract base class for all UzCosmos agents.
    Provides: HTTP client, periodic execution, health monitoring, event publishing.
    """

    def __init__(self, name: str, interval: int = 10):
        self.name = name
        self.interval = interval
        self.is_running = False
        self._session: Optional[aiohttp.ClientSession] = None
        self._task: Optional[asyncio.Task] = None
        self._error_count = 0
        self._success_count = 0
        self._last_error: Optional[str] = None
        self._started_at: Optional[str] = None

    async def start(self):
        """Start the agent's periodic execution loop"""
        self.is_running = True
        self._started_at = datetime.now(timezone.utc).isoformat()
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={"User-Agent": "UzCosmosAI/1.0"}
        )
        logger.info(f"[{self.name}] Agent starting...")

        await self._update_status("running")
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self):
        """Stop the agent gracefully"""
        self.is_running = False
        if self._task:
            self._task.cancel()
        if self._session:
            await self._session.close()
        await self._update_status("stopped")
        logger.info(f"[{self.name}] Agent stopped.")

    async def _run_loop(self):
        """Main execution loop — runs execute() at configured interval"""
        while self.is_running:
            try:
                await self.execute()
                self._success_count += 1
                self._error_count = 0  # Reset consecutive errors
                await self._update_status("running")
            except asyncio.CancelledError:
                break
            except Exception as e:
                self._error_count += 1
                self._last_error = str(e)
                logger.error(f"[{self.name}] Error: {e}\n{traceback.format_exc()}")
                await self._update_status("error", error=str(e))

                # Back off on repeated errors
                if self._error_count > 5:
                    await asyncio.sleep(min(self.interval * 3, 300))

            await asyncio.sleep(self.interval)

    @abstractmethod
    async def execute(self):
        """Override this — called every `interval` seconds"""
        pass

    async def emit(self, event_type: EventType, data: Dict[str, Any], priority: int = 0):
        """Publish an event to the event bus"""
        event = Event(
            type=event_type,
            data=data,
            source=self.name,
            priority=priority,
        )
        await event_bus.publish(event)

    async def fetch_json(self, url: str, params: Dict = None) -> Optional[Dict]:
        """HTTP GET request, returns JSON or None on error"""
        try:
            async with self._session.get(url, params=params) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    logger.warning(f"[{self.name}] HTTP {resp.status} from {url}")
                    return None
        except Exception as e:
            logger.error(f"[{self.name}] Fetch error {url}: {e}")
            return None

    async def _update_status(self, status: str, error: str = None):
        """Report health status to event bus"""
        await event_bus.update_agent_status(self.name, {
            "status": status,
            "success_count": self._success_count,
            "error_count": self._error_count,
            "last_error": error or self._last_error,
            "started_at": self._started_at,
            "interval": self.interval,
        })

    @property
    def stats(self) -> Dict:
        return {
            "name": self.name,
            "is_running": self.is_running,
            "success_count": self._success_count,
            "error_count": self._error_count,
            "interval": self.interval,
        }
