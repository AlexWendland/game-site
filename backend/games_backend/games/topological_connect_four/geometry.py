from typing import Callable

from games_backend import models

"""
The Geometry Function should take an position and normalise it to be between 0 and max_size - 1.

It should return None if the position is not valid.
"""

GeometryFunction = Callable[[int, int, int], tuple[int, int] | None]


def no_geometry(max_size: int, row: int, column: int) -> tuple[int, int] | None:
    if (0 <= column < max_size) and (0 <= row < max_size):
        return row, column
    return None


def toric_geometry(max_size: int, row: int, column: int) -> tuple[int, int] | None:
    return (row % max_size, column % max_size)


def band_geometry(max_size: int, row: int, column: int) -> tuple[int, int] | None:
    if 0 <= row < max_size:
        return row, column % max_size
    return None


GEOMETRY_MAP: dict[models.Geometry, GeometryFunction] = {
    models.Geometry.NO_GEOMETRY: no_geometry,
    models.Geometry.TORUS: toric_geometry,
    models.Geometry.BAND: band_geometry,
}
