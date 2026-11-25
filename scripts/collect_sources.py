#!/usr/bin/env python3
"""
Collecte de ressources ouvertes russe ↔ français (exécuté sur un runner GitHub Actions).

1. Tatoeba : paires de phrases russe → français (CC BY 2.0 FR), phrases courtes uniquement, auteur conservé.
2. Wiktionary (anglais) : mots russes empruntés au français, avec le mot français d'origine (CC BY-SA 4.0).
3. Wikivoyage : guide de conversation russe (fr) et guide de français (ru), texte brut (CC BY-SA 4.0 / 3.0).

Sortie : packages/content/data/sources/*.json (chaque fichier porte sa licence et sa source).
Aucun site commercial n'est interrogé ; rythme poli et User-Agent identifiable.
"""
import bz2, csv, io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

OUT = 'packages/content/data/sources'
UA = 'Russian365-personal-learning-app/1.0 (non-commercial; github.com/badsm82-dotcom)'
MAX_WORDS = 7
MAX_PAIRS = 15000


def _open(url, timeout=120):
    for attempt in range(6):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=timeout)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < 5:
                time.sleep(min(int(e.headers.get('Retry-After') or 0) or 5 * (attempt + 1), 60))
                continue
            raise
        except urllib.error.URLError:
            if attempt < 5:
                time.sleep(3 * (attempt + 1))
                continue
            raise


def tsv_bz2(url):
    with _open(url) as r:
        data = bz2.decompress(r.read()).decode('utf-8')
    return csv.reader(io.StringIO(data), delimiter='\t', quoting=csv.QUOTE_NONE)


def tatoeba():
    base = 'https://downloads.tatoeba.org/exports/per_language'
    ru = {row[0]: row for row in tsv_bz2(f'{base}/rus/rus_sentences_detailed.tsv.bz2')}
    fr = {row[0]: row for row in tsv_bz2(f'{base}/fra/fra_sentences_detailed.tsv.bz2')}
    pairs, seen = [], set()
    for row in tsv_bz2(f'{base}/rus/rus-fra_links.tsv.bz2'):
        a, b = row[0], row[1]
        r, f = ru.get(a), fr.get(b)
        if not r or not f:
            continue
        text = r[2].strip()
        if len(text.split()) > MAX_WORDS or text in seen or not re.search('[а-яё]', text, re.I):
            continue
        seen.add(text)
        pairs.append({'ru_id': int(a), 'ru': text, 'fr_id': int(b), 'fr': f[2].strip(), 'ru_author': r[3] if len(r) > 3 else '', 'fr_author': f[3] if len(f) > 3 else ''})
    pairs.sort(key=lambda p: (len(p['ru']), p['ru_id']))
    pairs = pairs[:MAX_PAIRS]
    save('tatoeba_ru_fr.json', {
        'source': 'Tatoeba — https://tatoeba.org (exports par langue)',
        'license': 'CC BY 2.0 FR — https://creativecommons.org/licenses/by/2.0/fr/ (attribution : auteurs Tatoeba indiqués par phrase)',
        'note': f'Phrases russes de {MAX_WORDS} mots au plus avec leur traduction française ; non relues.',
        'items': pairs,
    })
    print('Tatoeba :', len(pairs), 'paires')


def api(host, params):
    url = f'https://{host}/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    with _open(url, 60) as r:
        return json.load(r)


def wiktionary_french_loans():
    titles, cont = [], {}
    while True:
        d = api('en.wiktionary.org', {'action': 'query', 'list': 'categorymembers', 'cmtitle': 'Category:Russian terms borrowed from French', 'cmlimit': 500, 'cmnamespace': 0, **cont})
        titles += [m['title'] for m in d['query']['categorymembers']]
        if 'continue' not in d:
            break
        cont = {'cmcontinue': d['continue']['cmcontinue']}
        time.sleep(1)
    items = []
    for i in range(0, len(titles), 50):
        batch = titles[i:i + 50]
        d = api('en.wiktionary.org', {'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'titles': '|'.join(batch)})
        for p in d['query']['pages']:
            text = (p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', '')
            sec = text.split('==Russian==', 1)[1] if '==Russian==' in text else ''
            sec = re.split(r'\n==[^=]', sec)[0]
            m = re.search(r'\{\{(?:bor\+?|bor|lbor|der|inh)\|ru\|fr\|([^|}]+)', sec)
            stress = re.search(r'\{\{ru-(?:noun|adj|verb|adv|IPA|proper noun)[^}]*?\|([^|}=]*́[^|}]*)', sec)
            gloss = re.search(r'\n# ([^\n]+)', sec)
            if m:
                items.append({'ru': p['title'], 'ru_stressed': stress.group(1) if stress else None, 'fr': m.group(1).strip(),
                              'gloss_en': re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', re.sub(r'\{\{[^}]*\}\}', '', gloss.group(1))).strip() if gloss else '',
                              'url': 'https://en.wiktionary.org/wiki/' + urllib.parse.quote(p['title'])})
        time.sleep(1)
    save('wiktionary_ru_from_fr.json', {
        'source': 'Wiktionary (anglais), catégorie « Russian terms borrowed from French » — https://en.wiktionary.org',
        'license': 'CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/ (auteurs : contributeurs du Wiktionary, voir l’historique de chaque page)',
        'note': 'Emprunts attestés du russe au français, avec le mot français d’origine ; candidats de passerelles à valider.',
        'items': items,
    })
    print('Wiktionary :', len(items), 'emprunts au français')


def wikivoyage():
    pages = [('fr.wikivoyage.org', 'Guide linguistique russe', 'CC BY-SA 4.0'), ('ru.wikivoyage.org', 'Французский разговорник', 'CC BY-SA 4.0')]
    out = []
    for host, title, lic in pages:
        try:
            d = api(host, {'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'titles': title})
            page = d['query']['pages'][0]
            text = (page.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', '')
            out.append({'host': host, 'title': title, 'license': lic, 'url': f'https://{host}/wiki/' + urllib.parse.quote(title), 'wikitext': text})
            print('Wikivoyage :', host, title, len(text), 'caractères')
        except Exception as e:
            print('Wikivoyage indisponible', host, title, e)
        time.sleep(1)
    save('wikivoyage_phrasebooks.json', {
        'source': 'Wikivoyage — guides de conversation',
        'license': 'CC BY-SA (version indiquée par page) — auteurs : contributeurs Wikivoyage (historique des pages)',
        'note': 'Texte brut (wikitexte) ; à extraire et relire avant tout usage pédagogique.',
        'items': out,
    })


def save(name, payload):
    os.makedirs(OUT, exist_ok=True)
    payload['collected_at'] = time.strftime('%Y-%m-%d')
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=0)


if __name__ == '__main__':
    for step in (wiktionary_french_loans, wikivoyage, tatoeba):
        try:
            step()
        except Exception as e:
            print('Étape échouée :', step.__name__, e)
