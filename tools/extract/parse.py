import json, sys, re
W = sys.argv[1]
lines = json.load(open(W + '/lines.json', encoding='utf-8'))
QRE = re.compile(r'^Question:\s*(\d+)\s*$')
ORE = re.compile(r'^([A-Ha-h])\s*[.)]\s*(.*)$')
ARE = re.compile(r'^Answer\s*:\s*([A-H][A-H,\s&and]*?)\s*(Explanation\s*:?)?\s*$', re.I)
qs, cur = [], None
for l in lines:
    t = l['text'].strip()
    m = QRE.match(t)
    if m:
        cur = {'id': int(m.group(1)), 'state': 'q', 'q': [], 'opts': [], 'ans': None, 'exp': [], 'ocr': 0, 'pages': set(), 'issues': []}
        qs.append(cur); continue
    if cur is None: continue
    cur['pages'].add(l['page'])
    if 'ocr' in l['src'] and cur['state'] != 'exp': cur['ocr'] += 1
    if 'ocr' in l['src'] and cur['state'] == 'exp': cur['ocr'] += 1
    st = cur['state']
    if st in ('q', 'o'):
        am = ARE.match(t)
        if am:
            cur['ans'] = re.findall(r'[A-H]', am.group(1)); cur['state'] = 'exp' if am.group(2) else 'a'; continue
        t = re.sub(r'^([A-H]\. )\?LBL ', r'\1', t)
        if t.startswith('?LBL ') and cur['opts'] == [] and st == 'q' and False: pass
        if t.startswith('?LBL '): t = chr(ord('A') + len(cur['opts'])) + '. ' + t[5:]; cur['implicit'] = cur.get('implicit', 0) + 1
        om = ORE.match(t)
        expected = chr(ord('A') + len(cur['opts']))
        if om and om.group(1).upper() == expected:
            cur['opts'].append([om.group(2), l]); cur['state'] = 'o'; continue
        if st == 'q': cur['q'].append(l)
        else: cur['opts'][-1][0] += ' ' + t
        continue
    t = t.replace('?LBL ', ''); l = dict(l, text=t)
    if st == 'a':
        if re.match(r'^Explanation\s*:?\s*$', t, re.I): cur['state'] = 'exp'; continue
        if re.match(r'^Explanation\s*:', t, re.I):
            t = re.sub(r'^Explanation\s*:\s*', '', t); l = dict(l, text=t); cur['state'] = 'exp'
        else:
            cur['issues'].append('text between Answer and Explanation: ' + t); cur['state'] = 'exp'
    cur['exp'].append(l)

def paras(ls):
    out, prev = [], None
    for l in ls:
        t = l['text'].strip()
        new = prev is None
        if prev is not None:
            if l['page'] != prev['page']:
                new = bool(re.search(r'[.:?!)]$', prev['text'].strip())) and not re.match(r'^[a-z]', t)
            else:
                new = (l['y0'] - prev['y1']) > 6.5
            if re.match(r'^(\d+\.|[•●▪◦\-–]\s|[a-z]\)\s)', t): new = True
        if new or not out: out.append(t)
        else:
            out[-1] = out[-1] + t if out[-1].endswith(('-', '/')) and not out[-1].endswith(' -') else out[-1] + ' ' + t
        prev = l
    return [re.sub(r'\s+', ' ', p).strip() for p in out if p.strip()]

def clean(s): return re.sub(r'\s+', ' ', s).strip()

TOPICS = [
 ('Billing, Pricing & Support', r'pric|cost|billing|bill\b|invoice|budget|savings plan|reserved instance|spot instance|on-demand|free tier|support plan|enterprise support|business support|developer support|technical account manager|\bTAM\b|cost explorer|pricing calculator|marketplace|consolidated|charges|pay-as|discount|concierge|tag'),
 ('Security & Compliance', r'secur|complian|IAM|MFA|encrypt|shared responsibility|artifact|guardduty|inspector|shield|\bWAF\b|KMS|macie|cloudtrail|audit|permission|credential|access key|root user|firewall|security group|network acl|secrets manager|cognito|detective|security hub|DDoS|identity|policy|privilege|vulnerab|threat'),
 ('Cloud Concepts', r'well-architected|pillar|benefit of|advantage|economies of scale|elastic|agility|cloud adoption framework|\bCAF\b|migration strateg|rehost|replatform|refactor|total cost of ownership|\bTCO\b|capex|opex|capital expense|design principle|global infrastructure|availability zone|region|edge location|high availab|fault toleran|scalab|deployment model|hybrid'),
]
def topic(text):
    for name, rx in TOPICS:
        if re.search(rx, text, re.I): return name
    return 'Cloud Technology & Services'

dataset, report = [], []
for q in qs:
    question = '\n'.join(paras(q['q']))
    raw = [clean(o[0]) for o in q['opts']]
    # split options that were merged into one row, e.g. 'Detailed Billing Reports - D AWS Cost Explorer reports'
    fixed = []
    for t in raw:
        while True:
            nxt = chr(65 + len(fixed) + 1)
            mm = re.search(r'\s[-–]\s*' + nxt + r'[.)]?\s+(.*)$', t)
            if not mm: break
            fixed.append(t[:mm.start()].strip()); t = mm.group(1)
        fixed.append(t)
    opts = [{'id': chr(65 + i), 'text': t} for i, t in enumerate(fixed)]
    exp = '\n\n'.join(paras(q['exp']))
    issues = list(q['issues'])
    implicit = q.get('implicit', 0)
    if not question: issues.append('empty question text')
    if len(opts) < 2: issues.append(f'only {len(opts)} options parsed')
    if not q['ans']: issues.append('no answer parsed')
    ids = {o['id'] for o in opts}
    for a in q['ans'] or []:
        if a not in ids: issues.append(f'answer {a} not among options')
    m = re.search(r'\((?:choose|select)\s+(two|three|four|2|3|4)\.?\)', question, re.I)
    need = {'two': 2, 'three': 3, 'four': 4, '2': 2, '3': 3, '4': 4}[m.group(1).lower()] if m else 1
    if q['ans'] and len(q['ans']) != need: issues.append(f'question asks for {need} answers but key has {len(q["ans"])}')
    if not exp: issues.append('empty explanation')
    for o in opts:
        if not o['text']: issues.append(f'option {o["id"]} empty')
    multi = len(q['ans'] or []) > 1
    words = len(question.split())
    diff = 'Hard' if multi or words > 70 else ('Easy' if words < 25 else 'Medium')
    item = {'id': q['id'], 'question': question, 'options': opts, 'correctAnswers': q['ans'] or [],
            'multiSelect': multi, 'explanation': exp, 'topic': topic(question + ' ' + ' '.join(o['text'] for o in opts)),
            'difficulty': diff, 'sourcePages': sorted(q['pages']), 'ocrLines': q['ocr'], 'inferredOptionLabels': implicit}
    if issues: item['needsReview'] = issues
    dataset.append(item)
    if issues: report.append((q['id'], issues))
json.dump(dataset, open(W + '/questions.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('questions', len(dataset), 'with issues', len(report), 'multi', sum(d['multiSelect'] for d in dataset), 'with OCR', sum(1 for d in dataset if d['ocrLines']))
from collections import Counter
print(Counter(d['topic'] for d in dataset)); print(Counter(len(d['options']) for d in dataset))
for r in report: print(r)

# ---- second pass: manual overrides (verified visually against the PDF render) + validation report ----
OVERRIDES = {
    445: {'sourceNote': 'Source discrepancy: the PDF answer key says A (AWS Direct Connect), but the PDF explanation states that A is incorrect and that B (AWS Transit Gateway) is correct. The PDF key is kept as-is; please verify manually.'},
    393: {'options': [{'id': 'A', 'text': 'Amazon Inspector'}, {'id': 'B', 'text': 'Amazon QuickSight'}, {'id': 'C', 'text': 'Amazon Detective'}, {'id': 'D', 'text': 'Amazon GuardDuty'}],
          'note': 'Options C and D are run together in the PDF ("Amazon Detective - D Amazon GuardDuty"); split manually from the PDF page 306 render.'},
    733: {'options': [{'id': 'A', 'text': 'Tasks that run without interruption for several days'}, {'id': 'B', 'text': 'Variable workloads with runtimes of less than 10 minutes'},
                      {'id': 'C', 'text': 'Deep learning tasks that require a GPU instance'}, {'id': 'D', 'text': 'Tasks that require a high performance computing (HPC) instance'}],
          'note': 'Option labels were vector graphics; options re-entered manually from the PDF page 573 render.'},
    656: {'sourceNote': 'Note: the PDF lists five options for this question but gives a single answer (B) and no "Choose two" instruction. It is scored as a single-answer question, exactly as the PDF key states.'},
    564: {'options': [{'id': 'A', 'text': '1 year'}, {'id': 'B', 'text': '2 years'}, {'id': 'C', 'text': '3 years'}, {'id': 'D', 'text': '5 years'}],
          'note': 'Option labels were vector graphics; options re-entered manually from the PDF page 441-442 render.'},
}
for d in dataset:
    o = OVERRIDES.get(d['id'])
    if o:
        if 'options' in o: d['options'] = o['options']
        if 'question' in o: d['question'] = o['question']
        if 'note' in o: d.pop('needsReview', None); d['manuallyVerified'] = o['note']
        if 'sourceNote' in o: d['sourceNote'] = o['sourceNote']; d.setdefault('needsReview', []).append('source inconsistency: ' + o['sourceNote'][:80])
json.dump(dataset, open(W + '/questions.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---- OCR corrections (each verified against the rendered PDF page) ----
FIXES = [
    (r'\blAM\b', 'IAM'), (r'\blmplement', 'Implement'), (r'\blnstallment', 'Installment'), (r'\bAVVS\b', 'AWS'),
    (r'\bRls\b', 'RIs'), (r'\blac\b', 'IaC'), (r'\bB YOL\b', 'BYOL'), (r'\bA\.AWSConfig\b', 'A.AWS Config'), (r'^AWSConfig$', 'AWS Config'),
    (r'CloudUnderstanding', 'Cloud\nUnderstanding'),
    (r'For further re earch, refer to the A Organization s WS s documentation:.*$',
     'For further research, refer to the AWS Organizations documentation: https://aws.amazon.com/organizations/ and the Consolidated Billing documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html#feature-billing'),
]
def fix(s):
    for a, b in FIXES: s = re.sub(a, b, s, flags=re.S)
    return s
for d in dataset:
    d['question'] = fix(d['question']); d['explanation'] = fix(d['explanation'])
    for o in d['options']: o['text'] = fix(o['text'])
json.dump(dataset, open(W + '/questions.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
