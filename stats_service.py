# FastAPI microservice that exposes OKC Thunder roster + season stats
# from the official NBA Stats API via the `nba_api` package.
#
# Run:  uvicorn stats_service:app --port 8000
# Next.js calls this from app/api/players/route.js (server-side only).
#
# Endpoints:
#   GET /roster           -> full roster (id, name, jersey, position, ...)
#   GET /stats            -> season averages for every rostered player (map by id)
#   GET /stats/{player_id}-> season averages for one player

import os
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from nba_api.stats.endpoints import commonteamroster, leaguedashplayerstats
from nba_api.stats.static import teams

OKC = next(t for t in teams.get_teams() if t["abbreviation"] == "OKC")
TEAM_ID = OKC["id"]
SEASON = os.environ.get("NBA_SEASON", "2025-26")
# NBA CDN headshot — works without any key.
HEADSHOT = "https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png"

app = FastAPI(title="Thunder Stats Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
)


def _fmt_height(h):
    # nba_api returns "6-6"; ESPN UI style is "6' 6\""
    if not h or "-" not in h:
        return h or "—"
    ft, inches = h.split("-", 1)
    return f"{ft}' {inches}\""


@lru_cache(maxsize=1)
def _roster():
    df = commonteamroster.CommonTeamRoster(
        team_id=TEAM_ID, season=SEASON, timeout=30
    ).get_data_frames()[0]
    players = []
    for _, r in df.iterrows():
        players.append(
            {
                "id": str(r["PLAYER_ID"]),
                "name": r["PLAYER"],
                "jersey": r["NUM"] or "—",
                "position": r["POSITION"] or "—",
                "height": _fmt_height(r["HEIGHT"]),
                "weight": f"{r['WEIGHT']} lbs" if r["WEIGHT"] else "—",
                "age": int(r["AGE"]) if r["AGE"] == r["AGE"] else None,
                "headshot": HEADSHOT.format(player_id=r["PLAYER_ID"]),
            }
        )
    # Sort by jersey number where possible for a stable, readable order.
    def sort_key(p):
        try:
            return (0, int(p["jersey"]))
        except (ValueError, TypeError):
            return (1, p["name"])
    return sorted(players, key=sort_key)


@lru_cache(maxsize=1)
def _stats_map():
    df = leaguedashplayerstats.LeagueDashPlayerStats(
        team_id_nullable=TEAM_ID, season=SEASON, timeout=30
    ).get_data_frames()[0]
    out = {}
    for _, r in df.iterrows():
        gp = r["GP"] or 0
        if not gp:
            continue
        out[str(r["PLAYER_ID"])] = {
            "available": True,
            "label": f"{SEASON} season · {int(gp)} GP",
            "ppg": round(r["PTS"] / gp, 1),
            "rpg": round(r["REB"] / gp, 1),
            "apg": round(r["AST"] / gp, 1),
            "spg": round(r["STL"] / gp, 1),
            "bpg": round(r["BLK"] / gp, 1),
            "fgPct": f"{round(r['FG_PCT'] * 100, 1)}%",
            "threePct": f"{round(r['FG3_PCT'] * 100, 1)}%",
        }
    return out


@app.get("/roster")
def roster():
    try:
        return {"players": _roster()}
    except Exception as e:  # nba_api can raise on network/parse issues
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/stats")
def all_stats():
    try:
        return _stats_map()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/stats/{player_id}")
def player_stats(player_id: str):
    try:
        stats = _stats_map().get(player_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    if not stats:
        return {"available": False}
    return stats


@app.get("/health")
def health():
    return {"ok": True, "team": OKC["full_name"], "season": SEASON}
