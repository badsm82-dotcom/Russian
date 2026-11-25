#!/usr/bin/env python3
"""
Produit les fichiers audio de Russian 365 (exécuté sur un runner GitHub Actions, qui a accès à internet).

1. Lingua Libre (Wikimedia Commons) : enregistrements de locuteurs natifs pour les mots isolés.
   Licence vérifiée fichier par fichier (CC0, CC BY, CC BY-SA uniquement), auteur conservé.
2. Silero TTS v4 (ru) : synthèse neuronale pour tout le reste, deux voix (xenia, aidar), accent tonique respecté.
   Modèles sous licence CC BY-NC-SA 4.0 : usage personnel, non commercial uniquement.

Sortie : apps/web/public/audio/*.mp3 + apps/web/public/audio/manifest.json
Usage : python3 scripts/collect_audio.py audio-texts.json
"""
import hashlib, json, os, re, subprocess, sys, time, unicodedata, urllib.error, urllib.parse, urllib.request

OUT = 'apps/web/public/audio'
UA = 'Russian365-personal-learning-app/1.0 (non-commercial; contact via GitHub repository)'
OK_LICENSES = re.compile(r'^(cc0|cc[- ]by(-sa)?[- ]\d(\.\d)?|public domain|cc by(-sa)? \d\.\d)', re.I)
ACUTE = '́'
VOWELS = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ'


def _open(url, timeout=60):
    """Requête avec réessais polis (429/503 : on respecte Retry-After), pour ne pas surcharger les serveurs."""
    for attempt in range(6):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < 5:
                wait = int(e.headers.get('Retry-After') or 0) or 5 * (attempt + 1)
                print(f'  {e.code} sur {url[:80]}… attente {wait} s')
                time.sleep(min(wait, 60))
                continue
            raise
        except urllib.error.URLError:
            if attempt < 5:
                time.sleep(3 * (attempt + 1))
                continue
            raise


def http_json(url):
    with _open(url, 30) as r:
        return json.load(r)


def download(url, path):
    with _open(url, 120) as r, open(path, 'wb') as f:
        f.write(r.read())


def to_mp3(src, dst):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', '-af',
                    'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm',
                    '-b:a', '64k', dst], check=True)


def strip_html(s):
    return re.sub(r'<[^>]+>', '', s or '').strip()


def lingua_libre(word):
    """Enregistrements « LL-Q7737 (rus)-<locuteur>-<mot>.wav » sur Commons, licence vérifiée."""
    q = f'intitle:"LL-Q7737 (rus)" intitle:"{word}"'
    api = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'list': 'search', 'srsearch': q, 'srnamespace': 6, 'srlimit': 20})
    try:
        titles = [r['title'] for r in http_json(api)['query']['search']]
    except Exception as e:  # réseau, quota : on passe à la synthèse
        print('  commons search error', word, e)
        return []
    exact = [t for t in titles if t.lower().endswith(f'-{word.lower()}.wav')][:3]
    out = []
    for t in exact:
        info = http_json('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
            'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'titles': t, 'iiprop': 'url|extmetadata'}))
        page = next(iter(info['query']['pages'].values()))
        ii = (page.get('imageinfo') or [{}])[0]
        meta = ii.get('extmetadata', {})
        lic = strip_html(meta.get('LicenseShortName', {}).get('value', ''))
        if not OK_LICENSES.match(lic):
            print('  licence refusée', t, lic)
            continue
        out.append({'url': ii['url'], 'page': ii.get('descriptionurl', ''), 'license': lic,
                    'author': strip_html(meta.get('Artist', {}).get('value', '')) or 'Lingua Libre', 'title': t})
        time.sleep(0.3)
    return out


def silero_text(text):
    """Accent pédagogique (voyelle + U+0301) → notation Silero (« + » devant la voyelle accentuée)."""
    s = unicodedata.normalize('NFD', text)
    s = unicodedata.normalize('NFC', s.replace('̆', '̆'))  # й reste й
    out = []
    chars = list(unicodedata.normalize('NFC', text))
    i = 0
    res = ''
    nfd = unicodedata.normalize('NFD', text)
    # Parcours NFD : quand une voyelle est suivie de U+0301, on insère « + » avant elle.
    buf = []
    for ch in nfd:
        if ch == ACUTE and buf:
            j = len(buf) - 1
            while j >= 0 and unicodedata.combining(buf[j]):
                j -= 1
            buf.insert(j, '+')
        else:
            buf.append(ch)
    res = unicodedata.normalize('NFC', ''.join(buf))
    return res.replace('…', '').replace('—', '').strip()


def main():
    texts = json.load(open(sys.argv[1]))
    os.makedirs(OUT, exist_ok=True)
    manifest_path = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}

    import torch
    torch.set_num_threads(4)
    # Chargement direct du modèle (sans torch.hub, qui interroge l'API GitHub et atteint vite sa limite).
    model_file = '/tmp/silero_v4_ru.pt'
    if not os.path.exists(model_file):
        download('https://models.silero.ai/models/tts/ru/v4_ru.pt', model_file)
    model = torch.package.PackageImporter(model_file).load_pickle('tts_models', 'model')
    model.to(torch.device('cpu'))
    import soundfile as sf

    for n, item in enumerate(texts):
        key, text = item['key'], item['text']
        h = hashlib.sha1(key.encode()).hexdigest()[:10]
        entries = [e for e in manifest.get(key, []) if os.path.exists(os.path.join(OUT, e['file']))]
        have = {e['voice'] for e in entries}
        print(f'[{n + 1}/{len(texts)}] {text}')
        if item['words'] == 1 and not any(e['source'] == 'lingualibre' for e in entries):
            word = unicodedata.normalize('NFC', text.replace(ACUTE, '')).strip(' ,.!?').lower()
            try:
                recs = lingua_libre(word)
            except Exception as e:  # Commons indisponible : la synthèse prend le relais pour ce mot
                print('  Lingua Libre indisponible pour', word, e)
                recs = []
            time.sleep(1.0)  # rythme poli envers l'API Wikimedia
            for k, rec in enumerate(recs):
                tmp = f'/tmp/ll_{h}_{k}.wav'
                download(rec['url'], tmp)
                fname = f'{h}-ll{k}.mp3'
                to_mp3(tmp, os.path.join(OUT, fname))
                entries.append({'file': fname, 'source': 'lingualibre', 'voice': f'll{k}', 'license': rec['license'],
                                'author': rec['author'], 'url': rec['page']})
        for voice in ('xenia', 'aidar'):
            if voice in have:
                continue
            audio = model.apply_tts(text=silero_text(text), speaker=voice, sample_rate=48000, put_accent=True, put_yo=True)
            tmp = f'/tmp/s_{h}_{voice}.wav'
            sf.write(tmp, audio.numpy(), 48000)
            fname = f'{h}-{voice}.mp3'
            to_mp3(tmp, os.path.join(OUT, fname))
            entries.append({'file': fname, 'source': 'silero', 'voice': voice, 'license': 'CC BY-NC-SA 4.0 (Silero TTS, usage non commercial)',
                            'author': 'Silero Team (synthèse)', 'url': 'https://github.com/snakers4/silero-models'})
        manifest[key] = entries
        if n % 20 == 0:
            json.dump(manifest, open(manifest_path, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
    json.dump(manifest, open(manifest_path, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
    ll = sum(1 for v in manifest.values() for e in v if e['source'] == 'lingualibre')
    print(f'{len(manifest)} textes, {ll} enregistrements natifs Lingua Libre.')


if __name__ == '__main__':
    main()
