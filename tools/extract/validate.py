import json, re, sys
W = sys.argv[1]
ds = json.load(open(W + '/questions.json', encoding='utf-8'))
flags = {}
def flag(q, m): flags.setdefault(q['id'], []).append(m)

ids = [q['id'] for q in ds]
assert ids == list(range(1, len(ids) + 1)), 'question ids are not contiguous 1..N'
for q in ds:
    for m in q.get('needsReview', []): flag(q, m)
    if len(q['options']) < 4: flag(q, f"{len(q['options'])} options")
    for o in q['options']:
        if len(o['text']) < 2 or re.search(r'Answer:|Explanation|Question:|\?LBL', o['text']): flag(q, f"suspicious option {o['id']}: {o['text'][:60]}")
    if re.search(r'\?LBL', q['question'] + q['explanation']): flag(q, 'marker left in text')
    # cross-check: explanation's "correct answer is X" sentence vs key
    m = re.search(r'correct (?:answers?|options?|choices?) (?:is|are)\b[^\n]*', q['explanation'], re.I)
    if m:
        sent = m.group(0)
        if len(q['correctAnswers']) == 1:
            sent = re.split(r'(?<=[a-z0-9)\]])\.\s', sent)[0]
        letters = sorted(set(re.findall(r'(?<![A-Za-z])([A-E])(?=[.:,)]|\s+and\b|\s*&|\s*$)', sent)))
        key = sorted(q['correctAnswers'])
        if letters and not set(key) <= set(letters) | set() and not set(letters) <= set(key):
            flag(q, f"explanation says {''.join(letters)} but key is {''.join(key)}")
        elif letters and len(key) == 1 and letters != key:
            flag(q, f"explanation says {''.join(letters)} but key is {''.join(key)}")
    if len(q['explanation']) < 80: flag(q, 'very short explanation')
    if re.search(r'\s[A-Ha-h]\.$', q['question']): flag(q, 'question ends with stray label')
json.dump(flags, open(W + '/flags.json', 'w'), indent=1)
print('flagged', len(flags))
for k, v in flags.items(): print(k, v)
