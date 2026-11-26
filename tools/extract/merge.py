import json, sys, re
W = sys.argv[1]
meta = json.load(open(W + '/meta.json'))
ocr = json.load(open(W + '/ocr.json', encoding='utf-8-sig'))
Z = 3.0
out = []
snapped = []
for pno in sorted(meta, key=int):
    items = []
    for l in meta[pno]['lines']:
        x0, y0, x1, y1 = l['bbox']
        items.append({'x': x0, 'x1': x1, 'y0': y0, 'y1': y1, 't': l['text'], 'src': 'pdf'})
    key = f'p{int(pno)+1:04d}'
    for l in ocr.get(key, []) or []:
        ws = l['words'] if isinstance(l['words'], list) else [l['words']]
        x0 = min(w['x'] for w in ws) / Z; y0 = min(w['y'] for w in ws) / Z
        y1 = max(w['y'] + w['h'] for w in ws) / Z
        x1 = max(w['x'] + w['w'] for w in ws) / Z
        g = meta[pno]['glyph']
        ov = lambda r: min(x1, r[2]) - max(x0, r[0]) > 0 and min(y1, r[3]) - max(y0, r[1]) > 0
        if g and not any(ov(r) for r in g) and re.match(r'^[A-Ha-h][.)]$', l['text'].strip()):
            continue  # misplaced bare option label; the glyph-based label detection covers it
        if g and not any(ov(r) for r in g):
            # OCR engine deskewed this page: snap the line to the nearest glyph region
            r = min(g, key=lambda r: abs(r[0] - x0) + abs(r[1] - y0))
            snapped.append((pno, l['text'], round(x0), round(y0), round(r[0]), round(r[1])))
            x1 = r[0] + (x1 - x0); x0, y0, y1 = r[0], r[1], r[3]
        items.append({'x': x0, 'x1': x1, 'y0': y0, 'y1': y1, 't': l['text'], 'src': 'ocr'})
    # unlabeled lines with a small label-like glyph just to their left -> implicit option label
    gl = meta[pno]['glyph']
    for it in items:
        if re.match(r'^[A-Ha-h]\s*[.)]', it['t'].strip()): continue
        for g in gl:
            if g[2] - g[0] < 9 and g[2] <= it['x'] + 1 and it['x'] - g[2] < 14 and g[0] < 70 and min(g[3], it['y1']) - max(g[1], it['y0']) > 2:
                it['t'] = '?LBL ' + it['t'].strip(); it['x'] = g[0]; break
    # attach bare option labels (e.g. 'A.') to the nearest text item on their right
    LBL = re.compile(r'^[A-Ha-h][.)]$')
    labels = [i for i in items if LBL.match(i['t'].strip())]
    for lb in labels:
        c = (lb['y0'] + lb['y1']) / 2
        cands = [i for i in items if i is not lb and not LBL.match(i['t'].strip()) and i['x'] > lb['x']
                 and abs((i['y0'] + i['y1']) / 2 - c) < 14 and not re.match(r'^[A-Ha-h][.)]', i['t'].strip()) and i['x'] - lb['x'] < 40]
        if cands:
            tgt = min(cands, key=lambda i: abs((i['y0'] + i['y1']) / 2 - c))
            tgt['t'] = lb['t'].strip().upper() + ' ' + tgt['t'].strip(); tgt['src'] += '+ocr' if lb['src']=='ocr' else ''
            tgt['y0'] = min(tgt['y0'], lb['y0']); tgt['x'] = lb['x']; items.remove(lb)
    # group into visual rows by vertical center
    items.sort(key=lambda i: ((i['y0'] + i['y1']) / 2, i['x']))
    rows = []
    for it in items:
        c = (it['y0'] + it['y1']) / 2
        def hov(a, b):  # horizontal overlap (approximate widths from text length)
            return min(a['x1'], b['x1']) - max(a['x'], b['x']) > 3
        if rows and abs(rows[-1]['c'] - c) < 3.0 and not any(hov(it, o) for o in rows[-1]['items']):
            rows[-1]['items'].append(it)
        else:
            rows.append({'c': c, 'items': [it]})
    for r in rows:
        its = sorted(r['items'], key=lambda i: i['x'])
        parts = [i['t'].strip() for i in its if i['t'].strip()]
        lbl, implicit, rest = None, False, []
        for p_ in parts:
            if re.match(r'^[A-Ha-h][.)]$', p_): lbl = p_[0].upper(); continue
            if p_.startswith('?LBL '): implicit = True; p_ = p_[5:]
            mm = re.match(r'^([A-Ha-h])[.)]\s*(.*)$', p_) if not rest else None
            if mm and len(its) > 1 and (implicit or lbl): lbl = lbl or mm.group(1).upper(); p_ = mm.group(2)
            rest.append(p_)
        text = ' '.join(rest)
        if lbl: text = lbl + '. ' + text
        elif implicit: text = '?LBL ' + text
        if not text: continue
        out.append({'page': int(pno) + 1, 'x': round(its[0]['x'], 1), 'y0': round(min(i['y0'] for i in its), 1),
                    'y1': round(max(i['y1'] for i in its), 1), 'src': '+'.join(sorted(set(i['src'] for i in its))), 'text': text})
json.dump(out, open(W + '/lines.json', 'w', encoding='utf-8'), ensure_ascii=False)
with open(W + '/lines.txt', 'w', encoding='utf-8') as f:
    for l in out: f.write(f"{l['page']:>3} {l['y0']:6.1f} {l['src']:7} {l['text']}\n")
print(len(out)); print('snapped', snapped)
