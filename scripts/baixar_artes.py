# -*- coding: utf-8 -*-
"""Baixa as artes de cada personagem para _acervo/<id>/ (originais, fora do site publicado).

- oficial/ : imagens da wiki Fandom oficial do personagem (frames, designs de anime, key visuals)
- fanart/  : fanarts do Safebooru (somente rating general/safe, filtrando conteúdo impróprio)
- recorte/ : candidatas a recorte (fundo branco/simples/transparente), depois passam no rembg

Gera _acervo/<id>/FONTES.json com URL de origem, autor e tags de cada arquivo.
Uso: python -I scripts/baixar_artes.py [id ...]
"""
import json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACERVO = os.path.join(ROOT, '_acervo')
UA = {'User-Agent': 'Mozilla/5.0 (portfolio-asset-collector)'}

CHARS = {
    'capri':    ('capri_(cyberpunk)',               'cyberpunk',         'Capri'),
    'sukuna':   ('ryoumen_sukuna_(jujutsu_kaisen)', 'jujutsu-kaisen',    'Sukuna'),
    'kaneki':   ('kaneki_ken',                      'tokyoghoul',        'Ken Kaneki'),
    'frieren':  ('frieren',                         'frieren',           'Frieren'),
    'emilia':   ('emilia_(re:zero)',                'rezero',            'Emilia'),
    'beatrice': ('beatrice_(re:zero)',              'rezero',            'Beatrice'),
    'rem':      ('rem_(re:zero)',                   'rezero',            'Rem'),
    'eren':     ('eren_yeager',                     'attackontitan',     'Eren Yeager'),
    'thorfinn': ('thorfinn',                        'vinlandsaga',       'Thorfinn'),
    'gojo':     ('gojou_satoru',                    'jujutsu-kaisen',    'Satoru Gojo'),
}

BAN = set('''nude completely_nude nipples underwear panties lingerie bra cleavage large_breasts huge_breasts
gigantic_breasts bikini swimsuit ass bathing onsen towel sexually_suggestive groin navel_cutout thighhighs_pull
blood gore guro corpse death injury severed_head decapitation vomit
comic 4koma manga meme parody crossover cosplay photo_(medium) ai-generated ai-assisted english_text speech_bubble
text_focus translation_request translated chinese_text korean_text genderswap genderswap_(mtf) genderswap_(ftm)
yaoi yuri kiss couple hetero multiple_views character_sheet chibi_inset sketch lineart monochrome greyscale
spoilers what multiple_boys multiple_girls 2boys 2girls 3boys 3girls 4girls 4boys 5girls 6+girls 6+boys
pregnant bdsm bondage tied_up restrained crying_with_eyes_open feet foot_focus pantyshot upskirt'''.split())


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(2 + 2 * i)


def safebooru(tags, limit=100, pid=0):
    q = urllib.parse.urlencode({'page': 'dapi', 's': 'post', 'q': 'index', 'json': 1, 'limit': limit,
                                'pid': pid, 'tags': tags})
    raw = get('https://safebooru.org/index.php?' + q)
    return json.loads(raw) if raw.strip() else []


def ok_post(p, min_side=900):
    tags = set(p['tags'].split())
    if p.get('rating') not in ('general', 'safe'):
        return False
    if tags & BAN:
        return False
    if min(p['width'], p['height']) < min_side:
        return False
    return p['image'].lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))


def credit(p):
    src = p.get('source') or ''
    m = re.search(r'(?:twitter|x)\.com/([^/]+)/', src)
    if m:
        return '@' + m.group(1)
    m = re.search(r'pixiv\.net/(?:en/)?artworks/(\d+)|illust_id=(\d+)', src)
    if m:
        return 'pixiv ' + (m.group(1) or m.group(2))
    return src or 'safebooru #%s' % p['id']


def fetch_posts(tag, extra, want, seen, min_side=900):
    out = []
    for pid in range(0, 6):
        posts = safebooru(f'{tag} {extra} sort:score:desc', 100, pid)
        if not posts:
            break
        for p in posts:
            if p['id'] in seen or not ok_post(p, min_side):
                continue
            seen.add(p['id'])
            out.append(p)
            if len(out) >= want:
                return out
        time.sleep(0.5)
    return out


def save_post(p, folder, prefix, i, fontes):
    ext = os.path.splitext(p['image'])[1].lower()
    name = f'{prefix}_{i:02d}_{p["id"]}{ext}'
    path = os.path.join(folder, name)
    if not os.path.exists(path):
        data = get(f'https://safebooru.org/images/{p["directory"]}/{p["image"]}')
        open(path, 'wb').write(data)
    fontes[os.path.relpath(path, ACERVO).replace('\\', '/')] = {
        'origem': f'https://safebooru.org/index.php?page=post&s=view&id={p["id"]}',
        'fonte_original': p.get('source', ''), 'credito': credit(p),
        'tamanho': [p['width'], p['height']], 'oficial': 'official_art' in p['tags'].split(),
        'tags': p['tags'][:400]}


def fandom(wiki, page):
    api = f'https://{wiki}.fandom.com/api.php?'
    q = urllib.parse.urlencode({'action': 'query', 'titles': page, 'prop': 'images', 'imlimit': 200,
                                'format': 'json', 'redirects': 1})
    d = json.loads(get(api + q))
    files = []
    for pg in d['query']['pages'].values():
        files += [i['title'] for i in pg.get('images', [])]
    files = [f for f in files if re.search(r'\.(png|jpe?g|webp)$', f, re.I)
             and not re.search(r'icon|logo|symbol|signature|kanji|chibi|sticker|button|flag|map|emblem', f, re.I)]
    out = []
    for chunk in range(0, len(files), 40):
        q = urllib.parse.urlencode({'action': 'query', 'titles': '|'.join(files[chunk:chunk + 40]),
                                    'prop': 'imageinfo', 'iiprop': 'url|size', 'format': 'json'})
        d = json.loads(get(api + q))
        for pg in d['query']['pages'].values():
            ii = (pg.get('imageinfo') or [{}])[0]
            if ii.get('url') and min(ii.get('width', 0), ii.get('height', 0)) >= 400:
                out.append((pg['title'], ii['url'], ii['width'], ii['height']))
    return out


def main(ids):
    for cid in ids:
        tag, wiki, page = CHARS[cid]
        base = os.path.join(ACERVO, cid)
        for sub in ('oficial', 'fanart', 'recorte'):
            os.makedirs(os.path.join(base, sub), exist_ok=True)
        fpath = os.path.join(base, 'FONTES.json')
        fontes = json.load(open(fpath, encoding='utf-8')) if os.path.exists(fpath) else {}
        seen = set()
        print(f'== {cid}', flush=True)

        # 1) oficial (wiki)
        try:
            imgs = fandom(wiki, page)
        except Exception as e:
            print('  wiki falhou:', e); imgs = []
        imgs.sort(key=lambda x: -(x[2] * x[3]))
        for i, (title, url, w, h) in enumerate(imgs[:30]):
            ext = os.path.splitext(title)[1].lower()
            safe = re.sub(r'[^A-Za-z0-9_-]+', '_', title[5:-len(ext)])[:60]
            path = os.path.join(base, 'oficial', f'{cid}_wiki_{i:02d}_{safe}{ext}')
            try:
                if not os.path.exists(path):
                    open(path, 'wb').write(get(url))
                fontes[os.path.relpath(path, ACERVO).replace('\\', '/')] = {
                    'origem': f'https://{wiki}.fandom.com/wiki/{urllib.parse.quote(title.replace(" ", "_"))}',
                    'credito': f'{page} Wiki (Fandom) — material oficial © detentores dos direitos',
                    'tamanho': [w, h], 'oficial': True}
            except Exception as e:
                print('  falhou', title, e)
        print(f'  oficial: {min(len(imgs), 30)}', flush=True)

        # 2) arte oficial no safebooru
        offi = fetch_posts(tag, 'official_art', 12, seen, 700)
        for i, p in enumerate(offi):
            save_post(p, os.path.join(base, 'oficial'), f'{cid}_arte', i, fontes)
        print(f'  official_art: {len(offi)}', flush=True)

        # 3) recortes: fundo transparente / branco / simples, solo
        rec = fetch_posts(tag, 'transparent_background', 10, seen, 700)
        rec += fetch_posts(tag, 'solo white_background', 14, seen, 900)
        rec += fetch_posts(tag, 'solo simple_background', 8, seen, 900)
        for i, p in enumerate(rec):
            save_post(p, os.path.join(base, 'recorte'), f'{cid}_rec', i, fontes)
        print(f'  recorte: {len(rec)}', flush=True)

        # 4) fanarts (melhores notas)
        fan = fetch_posts(tag, 'solo', 24, seen, 1000)
        fan += fetch_posts(tag, '', 8, seen, 1000)
        for i, p in enumerate(fan):
            save_post(p, os.path.join(base, 'fanart'), f'{cid}_fan', i, fontes)
        print(f'  fanart: {len(fan)}', flush=True)

        json.dump(fontes, open(fpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:] or list(CHARS))
