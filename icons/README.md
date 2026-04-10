# icons/

## Placeholder Icons

This folder must contain four PNG icons:

| File        | Size    |
| ----------- | ------- |
| icon16.png  | 16×16   |
| icon32.png  | 32×32   |
| icon48.png  | 48×48   |
| icon128.png | 128×128 |

---

## Generate placeholder icons (one-time setup)

Run the script below from the **extension root folder** (the folder containing manifest.json).
It requires **Python 3** — no external libraries needed.

```bash
python3 generate_icons.py
```

Or, to run it inline:

```bash
python3 - <<'EOF'
import struct, zlib, os

def make_png(size, bg=(30, 30, 60), fg=(137, 180, 250)):
    """Generate a minimal solid-color PNG with a small moon glyph."""
    w = h = size
    raw = []
    for y in range(h):
        row = [0]  # filter byte
        for x in range(w):
            # Simple crescent-moon shape via distance math
            cx, cy = w / 2, h / 2
            r_outer = w * 0.38
            r_inner = w * 0.26
            offset  = w * 0.12
            dist_outer = ((x - cx)**2 + (y - cy)**2) ** 0.5
            dist_inner = ((x - (cx + offset))**2 + (y - cy)**2) ** 0.5
            if dist_outer <= r_outer and dist_inner > r_inner:
                row += list(fg) + [255]
            else:
                row += list(bg) + [255]
        raw.append(bytes(row))

    def chunk(name, data):
        c = name + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr_data = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    idat_data = zlib.compress(b"".join(raw))

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr_data)
        + chunk(b"IDAT", idat_data)
        + chunk(b"IEND", b"")
    )

os.makedirs("icons", exist_ok=True)
for sz in [16, 32, 48, 128]:
    path = f"icons/icon{sz}.png"
    with open(path, "wb") as f:
        f.write(make_png(sz))
    print(f"Created {path} ({sz}x{sz})")
EOF
```

---

## Replace with your own icons

Drop in any 16×16, 32×32, 48×48, and 128×128 PNG files and name them accordingly.
Recommended tools: Figma, Inkscape, or any image editor.
A half-moon or sun icon works well thematically.
