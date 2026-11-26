# Render masked pages: white-out text-layer spans so only vector-glyph text remains, for OCR.
import pymupdf as fitz, json, sys, os
# usage: python render.py <work_dir> <path-to.pdf>
OUT = sys.argv[1]
PDF = sys.argv[2]
os.makedirs(OUT + '/masked', exist_ok=True)
d = fitz.open(PDF)
ZOOM = 3.0
meta = {}
for pno in range(len(d)):
    p = d[pno]
    # text-layer lines
    lines = []
    dd = p.get_text('dict')
    for b in dd['blocks']:
        if b['type'] != 0: continue
        for l in b['lines']:
            txt = ''.join(s['text'] for s in l['spans'])
            if not txt.strip(): continue
            bold = any('Bold' in s['font'] for s in l['spans'] if s['text'].strip())
            lines.append({'bbox': l['bbox'], 'text': txt, 'bold': bold})
    # vector glyph drawings: filled paths with many items, small height (text-like)
    glyph = []
    for dr in p.get_drawings():
        r = dr['rect']
        fill = dr.get('fill') or (1,1,1)
        if dr['type'] in ('f', 'fs') and sum(fill) < 1.5 and r.height < 20 and r.width < 580:
            glyph.append([r.x0, r.y0, r.x1, r.y1])
    meta[pno] = {'lines': lines, 'glyph': glyph}
    if glyph:
        pix = p.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), alpha=False)
        # white out everything except glyph regions: build image of white and paste glyph crops
        from PIL import Image
        img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        out = Image.new('RGB', img.size, 'white')
        for g in glyph:
            box = tuple(int(round(v * ZOOM)) for v in (g[0]-1, g[1]-1, g[2]+1, g[3]+1))
            out.paste(img.crop(box), box[:2])
        out.save(f'{OUT}/masked/p{pno+1:04d}.png')
json.dump(meta, open(OUT + '/meta.json', 'w'))
print('pages', len(d), 'with glyph text', sum(1 for v in meta.values() if v['glyph']))
