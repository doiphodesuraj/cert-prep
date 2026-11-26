# Completeness check: dark pixels on the rendered page that are not covered by any extracted text line or OCR'd glyph region.
import pymupdf as fitz, json, sys
from PIL import Image, ImageDraw
PDF = sys.argv[1]; meta = json.load(open('meta.json'))
d = fitz.open(PDF); Z = 1.5; report = []
for pno in range(len(d)):
    p = d[pno]
    pix = p.get_pixmap(matrix=fitz.Matrix(Z, Z), alpha=False, colorspace=fitz.csGRAY)
    img = Image.frombytes('L', (pix.width, pix.height), pix.samples)
    dr = ImageDraw.Draw(img)
    m = meta[str(pno)]
    for l in m['lines']:
        x0, y0, x1, y1 = l['bbox']; dr.rectangle([x0*Z-2, y0*Z-2, x1*Z+2, y1*Z+2], fill=255)
    for g in m['glyph']:
        dr.rectangle([g[0]*Z-2, g[1]*Z-2, g[2]*Z+2, g[3]*Z+2], fill=255)
    px = img.load(); W_, H = img.size
    rows = {}
    for y in range(H):
        c = sum(1 for x in range(0, W_, 1) if px[x, y] < 110)
        if c: rows[y] = c
    dark = sum(rows.values())
    if dark > 60:
        ys = sorted(rows); report.append((pno + 1, dark, round(ys[0] / Z), round(ys[-1] / Z)))
print(len(report)); print(report[:40])
