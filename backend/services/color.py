"""Assign maximally distinct hues (0-360) and convert to hex for tasks."""
import colorsys
from typing import List


# First 5: 0, 72, 144, 216, 288 (red, yellow, green, blue, purple)
# Then midpoints: 36, 108, 180, 252, 324
# Then subdivide further (bisection) for endless tasks
INITIAL_HUES = [0, 72, 144, 216, 288]
SECOND_TIER = [36, 108, 180, 252, 324]


def _next_hues(n: int) -> List[float]:
    """Generate n evenly spaced hues. First 5, then 5 more, then bisect intervals."""
    if n <= 5:
        return INITIAL_HUES[:n]
    if n <= 10:
        return (INITIAL_HUES + SECOND_TIER)[:n]
    # Build list of all slots by repeated bisection
    slots: List[float] = INITIAL_HUES + SECOND_TIER
    while len(slots) < n:
        slots.sort()
        # Insert midpoint between each consecutive pair
        new_slots = []
        for i in range(len(slots)):
            new_slots.append(slots[i])
            if i < len(slots) - 1:
                mid = (slots[i] + slots[i + 1]) / 2
                new_slots.append(mid)
            elif len(slots) > 0:
                mid = (slots[i] + slots[0] + 360) / 2
                if mid >= 360:
                    mid -= 360
                new_slots.append(mid)
        slots = new_slots
    return slots[:n]


def hue_to_hex(hue: float, saturation: float = 0.7, value: float = 0.9) -> str:
    """Convert hue (0-360) to hex color."""
    r, g, b = colorsys.hsv_to_rgb(hue / 360.0, saturation, value)
    return f"#{int(r * 255):02x}{int(g * 255):02x}{int(b * 255):02x}"


def next_task_color(existing_task_count: int) -> str:
    """Return next distinct color as hex for the (existing_task_count + 1)-th task."""
    hues = _next_hues(existing_task_count + 1)
    return hue_to_hex(hues[-1])
