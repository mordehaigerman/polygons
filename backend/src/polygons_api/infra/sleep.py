"""Artificial latency for local demos and stress-testing optimistic UI.

See ``core/config.py`` for the ``SLEEP_SECONDS`` env var.

production: remove the artificial delay; the frontend's optimistic UI keeps
working unchanged.
"""

from __future__ import annotations

import asyncio


async def sleep_for(seconds: float) -> None:
    if seconds > 0:
        await asyncio.sleep(seconds)
