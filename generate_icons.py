"""
generate_icons.py
Run from the extension root: python3 generate_icons.py

Generates placeholder PNG icons (16, 32, 48, 128 px) with a simple
crescent-moon silhouette on a dark blue background.
Requires only Python 3 stdlib — no external packages.
"""

import struct
import zlib
import os


def make_png(size: int, bg=(30, 30, 60), fg=(137, 180, 250)) -> bytes:
    """Return raw bytes of a square RGBA PNG with a crescent-moon glyph."""
    w = h = size
    cx, cy = w / 2.0, h / 2.0
    r_outer = w * 0.38
    r_inner = w * 0.26
    offset  = w * 0.13   # shift inner circle to create crescent

    rows: list[bytes] = []
    for y in range(h):
        row = bytearray([0])  # PNG filter byte (None)
        for x in range(w):
            dist_outer = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            dist_inner = ((x - (cx + offset)) ** 2 + (y - cy) ** 2) ** 0.5
            if dist_outer <= r_outer and dist_inner > r_inner:
                row += bytes([*fg, 255])   # foreground + fully opaque
            else:
                row += bytes([*bg, 255])   # background + fully opaque
        rows.append(bytes(row))

    def png_chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return (
            struct.pack(">I", len(data))
            + body
            + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # RGBA = color type 2 with alpha? No — use 6
    # Correct: color type 6 = RGBA
    ihdr = struct.pack(">II", w, h) + bytes([8, 6, 0, 0, 0])

    idat = zlib.compress(b"".join(rows), level=9)

    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", idat)
        + png_chunk(b"IEND", b"")
    )


def main():
    icons_dir = os.path.join(os.path.dirname(__file__), "icons")
    os.makedirs(icons_dir, exist_ok=True)

    for size in (16, 32, 48, 128):
        path = os.path.join(icons_dir, f"icon{size}.png")
        data = make_png(size)
        with open(path, "wb") as f:
            f.write(data)
        print(f"  Created {path}  ({size}×{size} px)")

    print("\nDone. Replace these placeholders with your real artwork before publishing.")


if __name__ == "__main__":
    main()
