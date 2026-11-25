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


LANGS = {'fra': 'fr', 'deu': 'de', 'eng': 'en', 'por': 'pt', 'ita': 'it', 'spa': 'es', 'ron': 'ro'}
MAX_SENTENCES = 20000


def tatoeba():
    """Phrases russes courtes avec leurs traductions dans toutes les langues de l'apprenant (CC BY 2.0 FR)."""
    base = 'https://downloads.tatoeba.org/exports/per_language'
    ru = {row[0]: row for row in tsv_bz2(f'{base}/rus/rus_sentences_detailed.tsv.bz2')
          if len(row) > 2 and len(row[2].split()) <= MAX_WORDS and re.search('[а-яё]', row[2], re.I)}
    print('Tatoeba : phrases russes courtes', len(ru))
    by_ru = {}
    for code3, code2 in LANGS.items():
        try:
            links = [(r[0], r[1]) for r in tsv_bz2(f'{base}/rus/rus-{code3}_links.tsv.bz2') if r[0] in ru]
            wanted = {b for _, b in links}
            other = {row[0]: row for row in tsv_bz2(f'{base}/{code3}/{code3}_sentences_detailed.tsv.bz2') if row[0] in wanted}
        except Exception as e:
            print('  Tatoeba indisponible pour', code3, e)
            continue
        n = 0
        for a, b in links:
            t = other.get(b)
            if not t:
                continue
            entry = by_ru.setdefault(a, {'ru_id': int(a), 'ru': ru[a][2].strip(), 'ru_author': ru[a][3] if len(ru[a]) > 3 else '', 'tr': {}})
            if code2 not in entry['tr']:
                entry['tr'][code2] = {'id': int(b), 'text': t[2].strip(), 'author': t[3] if len(t) > 3 else ''}
                n += 1
        print(f'  {code3} : {n} traductions')
    items = list(by_ru.values())
    # Priorité : phrases traduites en français, puis nombre de langues, puis longueur.
    items.sort(key=lambda e: ('fr' not in e['tr'], -len(e['tr']), len(e['ru']), e['ru_id']))
    seen, out = set(), []
    for e in items:
        if e['ru'] in seen:
            continue
        seen.add(e['ru'])
        out.append(e)
        if len(out) >= MAX_SENTENCES:
            break
    save('tatoeba_ru_multi.json', {
        'source': 'Tatoeba — https://tatoeba.org (exports par langue)',
        'license': 'CC BY 2.0 FR — https://creativecommons.org/licenses/by/2.0/fr/ (attribution : auteurs Tatoeba indiqués par phrase)',
        'note': f'Phrases russes de {MAX_WORDS} mots au plus avec leurs traductions (fr, de, en, pt, it, es, ro) ; non relues.',
        'items': out,
    })
    print('Tatoeba :', len(out), 'phrases russes retenues')


def api(host, params):
    url = f'https://{host}/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    with _open(url, 60) as r:
        return json.load(r)


LOAN_LANGS = {'fr': 'French', 'de': 'German', 'en': 'English', 'it': 'Italian', 'es': 'Spanish', 'pt': 'Portuguese', 'ro': 'Romanian'}


def wiktionary_loans():
    """Mots russes empruntés aux langues de l'apprenant, avec le mot d'origine (Wiktionary, CC BY-SA 4.0)."""
    items = []
    for code, name in LOAN_LANGS.items():
        titles, cont = [], {}
        while True:
            d = api('en.wiktionary.org', {'action': 'query', 'list': 'categorymembers', 'cmtitle': f'Category:Russian terms borrowed from {name}', 'cmlimit': 500, 'cmnamespace': 0, **cont})
            titles += [m['title'] for m in d['query']['categorymembers']]
            if 'continue' not in d:
                break
            cont = {'cmcontinue': d['continue']['cmcontinue']}
            time.sleep(1)
        found = 0
        for i in range(0, len(titles), 50):
            batch = titles[i:i + 50]
            d = api('en.wiktionary.org', {'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'titles': '|'.join(batch)})
            for p in d['query']['pages']:
                text = (p.get('revisions') or [{}])[0].get('slots', {}).get('main', {}).get('content', '')
                sec = text.split('==Russian==', 1)[1] if '==Russian==' in text else ''
                sec = re.split(r'\n==[^=]', sec)[0]
                m = re.search(r'\{\{(?:bor\+?|lbor|der)\|ru\|' + code + r'\|([^|}]+)', sec)
                stress = re.search(r'\{\{ru-(?:noun|adj|verb|adv|IPA|proper noun)[^}]*?\|([^|}=]*\u0301[^|}]*)', sec)
                gloss = re.search(r'\n# ([^\n]+)', sec)
                if m:
                    found += 1
                    items.append({'lang': code, 'ru': p['title'], 'ru_stressed': stress.group(1) if stress else None, 'source': m.group(1).strip(),
                                  'gloss_en': re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', re.sub(r'\{\{[^}]*\}\}', '', gloss.group(1))).strip() if gloss else '',
                                  'url': 'https://en.wiktionary.org/wiki/' + urllib.parse.quote(p['title'])})
            time.sleep(1)
        print(f'Wiktionary : {found} emprunts ({name})')
    save('wiktionary_ru_loans.json', {
        'source': 'Wiktionary (anglais), catégories « Russian terms borrowed from … » — https://en.wiktionary.org',
        'license': 'CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/ (auteurs : contributeurs du Wiktionary, voir l’historique de chaque page)',
        'note': 'Emprunts attestés du russe aux langues de l’apprenant ; candidats de passerelles à valider.',
        'items': items,
    })


def wikivoyage():
    pages = [
        ('fr.wikivoyage.org', 'Guide linguistique russe', 'CC BY-SA'), ('ru.wikivoyage.org', 'Французский разговорник', 'CC BY-SA'),
        ('en.wikivoyage.org', 'Russian phrasebook', 'CC BY-SA'), ('de.wikivoyage.org', 'Sprachführer Russisch', 'CC BY-SA'),
        ('it.wikivoyage.org', 'Frasario russo', 'CC BY-SA'), ('es.wikivoyage.org', 'Guía de conversación ruso', 'CC BY-SA'),
        ('pt.wikivoyage.org', 'Livro de frases russo', 'CC BY-SA'),
        ('ru.wikivoyage.org', 'Немецкий разговорник', 'CC BY-SA'), ('ru.wikivoyage.org', 'Английский разговорник', 'CC BY-SA'),
        ('ru.wikivoyage.org', 'Итальянский разговорник', 'CC BY-SA'), ('ru.wikivoyage.org', 'Испанский разговорник', 'CC BY-SA'),
    ]
    out = []
    for host, title, lic in pages:
        try:
            d = api(host, {'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'titles': title})
            page = d['query']['pages'][0]
            if page.get('missing'):
                print('Wikivoyage : page absente', host, title)
                continue
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
    for step in (wiktionary_loans, wikivoyage, tatoeba):
        try:
            step()
        except Exception as e:
            print('Étape échouée :', step.__name__, e)
