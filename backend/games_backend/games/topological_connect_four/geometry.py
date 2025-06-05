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


def toric_geometry(max_size: int, row: int, column: int) -> tuple[int, int]:
    return (row % max_size, column % max_size)


def band_geometry(max_size: int, row: int, column: int) -> tuple[int, int] | None:
    if 0 <= row < max_size:
        return row, column % max_size
    return None


def mobius_geometry(max_size: int, row: int, column: int) -> tuple[int, int] | None:
    if not (0 <= row < max_size):
        return None
    flip_count = column // max_size
    column = column % max_size
    if flip_count % 2 == 1:
        return max_size - row - 1, column
    return row, column


def klein_geometry(max_size: int, row: int, column: int) -> tuple[int, int]:
    flip_count = column // max_size
    row = row % max_size
    column = column % max_size
    if flip_count % 2 == 1:
        row = max_size - row - 1
    return row, column


def invert_geometry(max_size: int, row: int, column: int) -> tuple[int, int]:
    row_flip_count = column // max_size
    column_flip_count = row // max_size
    row = row % max_size
    column = column % max_size
    if row_flip_count % 2 == 1:
        row = max_size - row - 1
    if column_flip_count % 2 == 1:
        column = max_size - column - 1
    return row, column


def sphere_geometry(max_size: int, row: int, column: int) -> tuple[int, int] | None:
    while not ((0 <= row < max_size) and (0 <= column < max_size)):
        if row >= max_size:
            row, column = column, 2 * max_size - row - 1
        elif row < 0:
            row, column = column, (-row) - 1
        elif column >= max_size:
            column, row = row, 2 * max_size - column - 1
        elif column < 0:
            column, row = row, (-column) - 1
    return row, column


GEOMETRY_MAP: dict[models.Geometry, GeometryFunction] = {
    models.Geometry.NO_GEOMETRY: no_geometry,
    models.Geometry.TORUS: toric_geometry,
    models.Geometry.BAND: band_geometry,
    models.Geometry.MOBIUS: mobius_geometry,
    models.Geometry.KLEIN: klein_geometry,
    models.Geometry.INVERT_INVERT: invert_geometry,
    models.Geometry.SPHERE: sphere_geometry,
}
