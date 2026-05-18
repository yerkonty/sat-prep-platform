"""One-off fixes for specific Area-and-volume question images.

Operates directly on the base64-encoded images in the DB because the original
source PDFs are not retained locally. Run from the backend directory.
"""
import base64
import io
import sqlite3
from PIL import Image

DB_PATH = "sat_platform.db"

# (external_id, action, params)
FIXES = [
    # Q10 — labels cut at top/bottom; we cannot recover lost pixels, but upscale
    # with high-quality resampling so the visible letters/digits read clearly.
    ("e9c5bfb2", "upscale", {"factor": 3}),
    # Q25 — leftover passage text "es TUV and XYZ, where TU corresponds to X"
    # at the top of the cropped figure.
    ("fc5ef8d3", "crop", {"top": 20, "bottom": 0}),
    # Q30 — partial caption "The figure shows the lengths, in cer" at bottom.
    ("d683a9cc", "crop", {"top": 0, "bottom": 22}),
    # Q60 — partial caption "In the xy-plane shown, square AB" at bottom.
    ("cf53cb56", "crop", {"top": 0, "bottom": 32}),
]


def load_image(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64)))


def encode_image(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> None:
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    for ext_id, action, params in FIXES:
        cur.execute("SELECT image FROM questions WHERE external_id=?", (ext_id,))
        row = cur.fetchone()
        if not row or not row[0]:
            print(f"SKIP {ext_id}: no image")
            continue

        img = load_image(row[0])
        original_size = img.size

        if action == "crop":
            w, h = img.size
            box = (0, params["top"], w, h - params["bottom"])
            img = img.crop(box)
        elif action == "upscale":
            factor = params["factor"]
            img = img.resize((img.width * factor, img.height * factor), Image.LANCZOS)
        else:
            raise ValueError(f"Unknown action {action}")

        new_b64 = encode_image(img)
        cur.execute(
            "UPDATE questions SET image=? WHERE external_id=?",
            (new_b64, ext_id),
        )
        print(f"OK   {ext_id}: {action} {original_size} -> {img.size}")

    con.commit()
    con.close()


if __name__ == "__main__":
    main()
