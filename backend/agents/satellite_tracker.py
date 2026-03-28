"""
Agent 1: Satellite Tracker
Tracks 25,000+ satellites in real-time using TLE data
Calculates positions using SGP4 propagation
"""
import math
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from backend.agents.base_agent import BaseAgent
from backend.core.event_bus import EventType
from config import api_config, agent_config


# SGP4 simplified propagation constants
MU = 398600.4418  # Earth gravitational parameter km^3/s^2
EARTH_RADIUS = 6371.0  # km
J2 = 1.08263e-3
TWO_PI = 2 * math.pi
DEG2RAD = math.pi / 180
RAD2DEG = 180 / math.pi
MINUTES_PER_DAY = 1440.0


def tle_to_position(tle_line1: str, tle_line2: str, timestamp: float = None) -> Optional[Dict]:
    """
    Simplified SGP4-like propagation from TLE to lat/lon/alt.
    For competition demo — accurate enough for visualization.
    """
    try:
        if timestamp is None:
            timestamp = datetime.now(timezone.utc).timestamp()

        # Parse TLE line 2
        inclination = float(tle_line2[8:16].strip())
        raan = float(tle_line2[17:25].strip())
        eccentricity = float("0." + tle_line2[26:33].strip())
        arg_perigee = float(tle_line2[34:42].strip())
        mean_anomaly = float(tle_line2[43:51].strip())
        mean_motion = float(tle_line2[52:63].strip())  # rev/day

        # Parse epoch from TLE line 1
        epoch_year = int(tle_line1[18:20])
        epoch_day = float(tle_line1[20:32])
        if epoch_year < 57:
            epoch_year += 2000
        else:
            epoch_year += 1900

        epoch = datetime(epoch_year, 1, 1, tzinfo=timezone.utc) + timedelta(days=epoch_day - 1)
        epoch_ts = epoch.timestamp()

        # Time since epoch in minutes
        dt_minutes = (timestamp - epoch_ts) / 60.0

        # Semi-major axis from mean motion
        n = mean_motion * TWO_PI / MINUTES_PER_DAY  # rad/min
        a = (MU / (n / 60.0) ** 2) ** (1.0 / 3.0)  # km

        # Propagate mean anomaly
        M = (mean_anomaly * DEG2RAD + n * dt_minutes) % TWO_PI

        # Solve Kepler's equation (Newton's method)
        E = M
        for _ in range(10):
            dE = (M - E + eccentricity * math.sin(E)) / (1 - eccentricity * math.cos(E))
            E += dE
            if abs(dE) < 1e-8:
                break

        # True anomaly
        cos_E = math.cos(E)
        sin_E = math.sin(E)
        nu = math.atan2(
            math.sqrt(1 - eccentricity ** 2) * sin_E,
            cos_E - eccentricity
        )

        # Distance from Earth center
        r = a * (1 - eccentricity * cos_E)

        # Argument of latitude
        u = (arg_perigee * DEG2RAD + nu) % TWO_PI

        # RAAN precession (J2 perturbation)
        cos_i = math.cos(inclination * DEG2RAD)
        raan_dot = -1.5 * n * J2 * (EARTH_RADIUS / a) ** 2 * cos_i / (1 - eccentricity ** 2) ** 2
        current_raan = (raan * DEG2RAD + raan_dot * dt_minutes) % TWO_PI

        # Position in orbital plane -> ECI
        cos_u = math.cos(u)
        sin_u = math.sin(u)
        cos_raan = math.cos(current_raan)
        sin_raan = math.sin(current_raan)
        sin_i = math.sin(inclination * DEG2RAD)

        x = r * (cos_raan * cos_u - sin_raan * sin_u * cos_i)
        y = r * (sin_raan * cos_u + cos_raan * sin_u * cos_i)
        z = r * sin_u * sin_i

        # ECI to geodetic (simplified)
        lon = (math.atan2(y, x) * RAD2DEG - (timestamp % 86400) / 86400 * 360) % 360
        if lon > 180:
            lon -= 360

        lat = math.atan2(z, math.sqrt(x ** 2 + y ** 2)) * RAD2DEG
        alt = r - EARTH_RADIUS

        # Velocity (approximate)
        velocity = math.sqrt(MU / r)  # km/s

        return {
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "alt": round(alt, 2),
            "velocity": round(velocity, 2),
            "inclination": round(inclination, 2),
            "period": round(MINUTES_PER_DAY / mean_motion, 2),
            "x": round(x, 2),
            "y": round(y, 2),
            "z": round(z, 2),
        }
    except Exception:
        return None


# CelesTrak group names — only groups that return real data
SATELLITE_GROUPS = {
    "stations": {"name": "Kosmik stansiyalar", "color": "#00ffff", "size": 3, "limit": 50},
    "active": {"name": "Faol yo'ldoshlar", "color": "#00ff88", "size": 1, "limit": 2000},
    "last-30-days": {"name": "Yangi uchirilgan", "color": "#ffffff", "size": 1.2, "limit": 400},
    "gps-ops": {"name": "GPS", "color": "#ffaa00", "size": 1.5, "limit": 50},
    "galileo": {"name": "Galileo", "color": "#0088ff", "size": 1.5, "limit": 50},
    "weather": {"name": "Ob-havo", "color": "#88ff00", "size": 1.2, "limit": 100},
    "resource": {"name": "Yer resurslari", "color": "#ff8800", "size": 1.2, "limit": 200},
    "science": {"name": "Ilmiy", "color": "#ff00ff", "size": 1.5, "limit": 100},
    "military": {"name": "Harbiy", "color": "#ff0044", "size": 1, "limit": 100},
    "geo": {"name": "Geostatsionar", "color": "#ffff00", "size": 2, "limit": 500},
    "visual": {"name": "Ko'zga ko'rinadigan", "color": "#44ffaa", "size": 1.8, "limit": 200},
}


class SatelliteTrackerAgent(BaseAgent):
    """
    Tracks satellites using TLE data from CelesTrak.
    Calculates real-time positions and broadcasts to frontend.
    """

    def __init__(self):
        super().__init__("satellite_tracker", agent_config.SATELLITE_INTERVAL)
        self.tle_cache: Dict[str, Dict] = {}
        self.satcat_cache: Dict[str, Dict] = {}
        self.tle_last_fetch: Optional[float] = None
        self.satcat_fetched = False
        self.TLE_REFRESH_INTERVAL = 3600

    async def execute(self):
        """Main execution — fetch TLE if needed, calculate positions"""
        now = datetime.now(timezone.utc).timestamp()

        # Refresh TLE data periodically
        if not self.tle_cache or (now - (self.tle_last_fetch or 0)) > self.TLE_REFRESH_INTERVAL:
            await self._fetch_all_tle()
            self.tle_last_fetch = now

        # Fetch SATCAT metadata once (enriches satellite info)
        if self.tle_cache and not self.satcat_fetched:
            await self._fetch_satcat()
            self.satcat_fetched = True

        # Calculate current positions for all satellites
        satellites = []
        for sat_id, sat_data in self.tle_cache.items():
            pos = tle_to_position(sat_data["tle1"], sat_data["tle2"], now)
            if pos:
                entry = {
                    "id": sat_id,
                    "name": sat_data["name"],
                    "group": sat_data["group"],
                    "color": sat_data["color"],
                    "size": sat_data["size"],
                    **pos,
                }
                # Add extended metadata
                for key in ("country_code", "country_name", "object_type",
                            "object_type_label", "launch_date", "launch_site",
                            "intl_designator", "decay_date", "rcs_size", "rcs_label",
                            "apoapsis_km", "periapsis_km", "period_min",
                            "mean_motion", "eccentricity"):
                    if key in sat_data and sat_data[key]:
                        entry[key] = sat_data[key]
                satellites.append(entry)

        # Emit batch update
        if satellites:
            # Count by group
            group_counts = {}
            for s in satellites:
                g = s["group"]
                group_counts[g] = group_counts.get(g, 0) + 1

            await self.emit(EventType.SATELLITE_BATCH, {
                "satellites": satellites,
                "total_count": len(satellites),
                "group_counts": group_counts,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            # Check satellites over Uzbekistan (lat: 37-46, lon: 56-73)
            uz_sats = [
                s for s in satellites
                if 37 <= s["lat"] <= 46 and 56 <= s["lon"] <= 73
            ]
            if uz_sats:
                await self.emit(EventType.SATELLITE_UPDATE, {
                    "over_uzbekistan": uz_sats,
                    "count": len(uz_sats),
                }, priority=1)

    async def _fetch_all_tle(self):
        """Fetch TLE data from CelesTrak for all satellite groups"""
        fetched_any = False
        for group_key, group_info in SATELLITE_GROUPS.items():
            try:
                # Try TLE format first (3LE)
                url = f"{api_config.CELESTRAK_BASE_URL}"
                params = {"GROUP": group_key, "FORMAT": "json"}
                data = await self.fetch_json(url, params)

                if data and isinstance(data, list):
                    limit = group_info.get("limit", 500)
                    for sat in data[:limit]:
                        norad_id = str(sat.get("NORAD_CAT_ID", ""))
                        tle1 = sat.get("TLE_LINE1", "")
                        tle2 = sat.get("TLE_LINE2", "")

                        # If JSON-GP format (no TLE lines), build from orbital elements
                        if norad_id and not tle1:
                            inc = sat.get("INCLINATION", 0)
                            raan = sat.get("RA_OF_ASC_NODE", 0)
                            ecc = sat.get("ECCENTRICITY", 0.0001)
                            argp = sat.get("ARG_OF_PERICENTER", 0)
                            ma = sat.get("MEAN_ANOMALY", 0)
                            mm = sat.get("MEAN_MOTION", 15.0)
                            epoch = sat.get("EPOCH", "2026-03-01T00:00:00")

                            # Build synthetic TLE lines
                            ep_year = 26
                            try:
                                from datetime import datetime as dt
                                ep_dt = dt.fromisoformat(epoch.replace("Z", "+00:00"))
                                ep_day = ep_dt.timetuple().tm_yday + (ep_dt.hour * 3600 + ep_dt.minute * 60 + ep_dt.second) / 86400
                            except Exception:
                                ep_day = 85.0

                            ecc_str = f"{ecc:.7f}"[2:]  # Remove "0."
                            tle1 = f"1 {int(norad_id):05d}U 24001A   {ep_year:02d}{ep_day:12.8f}  .00000000  00000-0  00000-0 0    0"
                            tle2 = f"2 {int(norad_id):05d} {inc:8.4f} {raan:8.4f} {ecc_str:>7s} {argp:8.4f} {ma:8.4f} {mm:11.8f}    0"

                        if norad_id and tle1 and tle2:
                            # Extract all metadata from CelesTrak
                            object_type = sat.get("OBJECT_TYPE", "UNKNOWN")
                            country = sat.get("COUNTRY_CODE", "")
                            launch_date = sat.get("LAUNCH_DATE", "")
                            site = sat.get("SITE", "")
                            decay_date = sat.get("DECAY_DATE", "")
                            intl_des = sat.get("OBJECT_ID", sat.get("INTLDES", ""))
                            rcs_size = sat.get("RCS_SIZE", "")
                            period = sat.get("PERIOD", 0)
                            apoapsis = sat.get("APOAPSIS", 0)
                            periapsis = sat.get("PERIAPSIS", 0)

                            # Country name mapping
                            country_names = {
                                "US": "AQSH", "CIS": "Rossiya/MDH", "RU": "Rossiya",
                                "PRC": "Xitoy", "CN": "Xitoy", "JPN": "Yaponiya",
                                "JP": "Yaponiya", "IND": "Hindiston", "IN": "Hindiston",
                                "FR": "Fransiya", "ESA": "Yevropa KA", "EU": "Yevropa",
                                "UK": "Buyuk Britaniya", "GB": "Buyuk Britaniya",
                                "DE": "Germaniya", "IT": "Italiya", "CA": "Kanada",
                                "KR": "Janubiy Koreya", "IL": "Isroil",
                                "BR": "Braziliya", "AR": "Argentina",
                                "KZ": "Qozog'iston", "UZ": "O'zbekiston",
                                "AE": "BAA", "SA": "Saudiya", "TR": "Turkiya",
                                "TW": "Tayvan", "SES": "SES (Lyuksemburg)",
                                "O3B": "O3b Networks", "ORB": "Orbcomm",
                                "SAUD": "Saudiya Arabistoni", "ISRA": "Isroil",
                                "EGYP": "Misr", "IRAN": "Eron",
                            }

                            # Object type descriptions
                            type_labels = {
                                "PAYLOAD": "Foydali yuk (yo'ldosh)",
                                "ROCKET BODY": "Raketa tanasi",
                                "DEBRIS": "Axlat/parchalanma",
                                "TBA": "Tasniflanmagan",
                                "UNKNOWN": "Noma'lum",
                            }

                            # RCS size descriptions
                            rcs_labels = {
                                "LARGE": "Katta (>1m²)",
                                "MEDIUM": "O'rta (0.1-1m²)",
                                "SMALL": "Kichik (<0.1m²)",
                            }

                            self.tle_cache[norad_id] = {
                                "name": sat.get("OBJECT_NAME", "Unknown"),
                                "tle1": tle1,
                                "tle2": tle2,
                                "group": group_key,
                                "color": group_info["color"],
                                "size": group_info["size"],
                                # Extended metadata
                                "country_code": country,
                                "country_name": country_names.get(country, country),
                                "object_type": object_type,
                                "object_type_label": type_labels.get(object_type, object_type),
                                "launch_date": launch_date,
                                "launch_site": site,
                                "intl_designator": intl_des,
                                "decay_date": decay_date,
                                "rcs_size": rcs_size,
                                "rcs_label": rcs_labels.get(rcs_size, rcs_size),
                                "apoapsis_km": round(float(apoapsis), 1) if apoapsis else None,
                                "periapsis_km": round(float(periapsis), 1) if periapsis else None,
                                "period_min": round(float(period), 2) if period else None,
                                "mean_motion": sat.get("MEAN_MOTION", 0),
                                "eccentricity": sat.get("ECCENTRICITY", 0),
                            }
                            fetched_any = True

                await asyncio.sleep(0.3)

            except Exception as e:
                self._last_error = f"TLE fetch error ({group_key}): {e}"

        if not fetched_any and not self.tle_cache:
            self._last_error = "CelesTrak API unreachable — no satellite data"

    async def _fetch_satcat(self):
        """Fetch SATCAT data to enrich satellites with owner, launch info, type"""
        # Owner code mappings
        owner_names = {
            "CIS": "Rossiya/MDH", "US": "AQSH", "PRC": "Xitoy", "JPN": "Yaponiya",
            "IND": "Hindiston", "FR": "Fransiya", "ESA": "Yevropa KA",
            "UK": "Buyuk Britaniya", "GER": "Germaniya", "IT": "Italiya",
            "ISRA": "Isroil", "BRAZ": "Braziliya", "CA": "Kanada",
            "SKOR": "Janubiy Koreya", "ISS": "Xalqaro (ISS)",
            "SES": "SES (Lyuksemburg)", "ORB": "Orbcomm",
            "O3B": "O3b/SES", "SAUD": "Saudiya Arabistoni",
            "TURK": "Turkiya", "UAE": "BAA", "IRAN": "Eron",
            "EGYP": "Misr", "AB": "Arabsat", "AC": "AsiaSat",
            "INDO": "Indoneziya", "MALA": "Malayziya", "THAI": "Tailand",
            "PAKI": "Pokiston", "ARGN": "Argentina", "CHLE": "Chili",
            "LUXE": "Lyuksemburg", "NETH": "Niderlandiya", "SWED": "Shvetsiya",
            "NOR": "Norvegiya", "SAFR": "Janubiy Afrika", "KAZ": "Qozog'iston",
            "TBD": "Noma'lum",
        }
        type_map = {"PAY": "Foydali yuk", "R/B": "Raketa tanasi", "DEB": "Axlat/parchalanma", "TBA": "Noma'lum"}
        site_map = {
            "AFETR": "Cape Canaveral, AQSH", "AFWTR": "Vandenberg, AQSH",
            "TYMSC": "Baykonur, Qozog'iston", "PKMTR": "Plesetsk, Rossiya",
            "JSC": "Jiuquan, Xitoy", "XSC": "Xichang, Xitoy", "TSC": "Taiyuan, Xitoy",
            "WSLC": "Wenchang, Xitoy", "SRILR": "Satish Dhawan, Hindiston",
            "TNSTA": "Tanegashima, Yaponiya", "KWAJ": "Kwajalein",
            "KODAK": "Kodiak, AQSH", "SEAL": "Dengiz platformasi",
            "RLLB": "Rocket Lab, Yangi Zelandiya", "KSCUT": "Kourou, Fransiya",
            "VOSTO": "Vostochniy, Rossiya", "OREN": "Dombarovskiy, Rossiya",
            "SNMLP": "San Marco, Keniya", "WOMRA": "Woomera, Avstraliya",
        }

        try:
            # Fetch SATCAT by same GROUP names as GP data
            for group_key in SATELLITE_GROUPS.keys():
                data = await self.fetch_json(
                    "https://celestrak.org/satcat/records.php",
                    {"GROUP": group_key, "FORMAT": "json"}
                )

                if data and isinstance(data, list):
                    for rec in data:
                        nid = str(rec.get("NORAD_CAT_ID", ""))
                        if nid in self.tle_cache:
                            owner = rec.get("OWNER", "")
                            obj_type = rec.get("OBJECT_TYPE", "")
                            self.tle_cache[nid].update({
                                "country_code": owner,
                                "country_name": owner_names.get(owner, owner),
                                "object_type": obj_type,
                                "object_type_label": type_map.get(obj_type, obj_type),
                                "launch_date": rec.get("LAUNCH_DATE", ""),
                                "launch_site": rec.get("LAUNCH_SITE", ""),
                                "launch_site_name": site_map.get(rec.get("LAUNCH_SITE", ""), rec.get("LAUNCH_SITE", "")),
                                "intl_designator": rec.get("OBJECT_ID", ""),
                                "rcs_m2": round(rec.get("RCS", 0), 4) if rec.get("RCS") else None,
                                "apoapsis_km": rec.get("APOGEE", 0),
                                "periapsis_km": rec.get("PERIGEE", 0),
                                "period_min": round(rec.get("PERIOD", 0), 2) if rec.get("PERIOD") else None,
                                "ops_status": rec.get("OPS_STATUS_CODE", ""),
                            })

                await asyncio.sleep(0.3)

        except Exception as e:
            self._last_error = f"SATCAT fetch error: {e}"
