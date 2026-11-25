# -*- coding: utf-8 -*-
"""Gera as imagens otimizadas do site a partir do _acervo e da curadoria.json.

- heroi/alt: personagem recortado (fundo transparente). Se a arte já tiver transparência usa ela;
  senão recorta com rembg (modelo isnet-anime). Saída WebP em 2 tamanhos (PC/TV e celular).
- rosto: avatar quadrado tirado da cabeça do recorte.
- fundo: arte pequena e leve (o site desfoca por CSS).
- galeria: miniatura + versão grande, com crédito do artista.
Uso: python -I scripts/processar_imagens.py [id ...]
"""
import json, os, sys
os.environ.setdefault('U2NET_HOME', r'D:\Claude config\cache\u2net')
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACERVO = os.path.join(ROOT, '_acervo')
OUT = os.path.join(ROOT, 'assets', 'img')
_sess = None


def achar(cid, ref):
    sub, pref = ref.split('/')
    d = os.path.join(ACERVO, cid, sub)
    for f in sorted(os.listdir(d)):
        if f.startswith(pref):
            return os.path.join(d, f)
    raise FileNotFoundError(f'{cid}: {ref}')


def tem_alfa(im):
    if im.mode not in ('RGBA', 'LA', 'P'):
        return False
    a = np.asarray(im.convert('RGBA'))[:, :, 3]
    return (a < 20).mean() > 0.05


def recortar(path):
    global _sess
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    if tem_alfa(im):
        return im.convert('RGBA'), 'transparente original'
    from rembg import remove, new_session
    if _sess is None:
        _sess = new_session('isnet-anime')
    src = im.convert('RGB')
    if max(src.size) > 2400:
        src.thumbnail((2400, 2400), Image.LANCZOS)
    out = remove(src, session=_sess, post_process_mask=True)
    return out.convert('RGBA'), 'rembg isnet-anime'


def aparar(im):
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.where(a > 12)
    if not len(xs):
        return im
    pad = 6
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))


def suavizar_bordas(im):
    """Se o personagem encosta na borda da arte original (corte reto), esmaece essa borda."""
    a = np.asarray(im).copy()
    al = a[:, :, 3].astype(np.float32)
    H, W = al.shape
    def toca(v):
        return (v > 128).mean() > 0.04
    fh, fw = max(2, int(H * 0.07)), max(2, int(W * 0.07))
    if toca(al[0, :]):
        al[:fh, :] *= np.linspace(0, 1, fh)[:, None] ** 0.8
    if toca(al[:, 0]):
        al[:, :fw] *= np.linspace(0, 1, fw)[None, :] ** 0.8
    if toca(al[:, -1]):
        al[:, -fw:] *= np.linspace(1, 0, fw)[None, :] ** 0.8
    a[:, :, 3] = al.clip(0, 255).astype(np.uint8)
    return Image.fromarray(a, 'RGBA')


def salvar(im, path, q=84, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6, **kw)
    return os.path.relpath(path, ROOT).replace('\\', '/')


def limitar(im, w=None, h=None):
    im = im.copy()
    im.thumbnail((w or 99999, h or 99999), Image.LANCZOS)
    return im


def rosto(im, foco=None):
    if foco:  # [centro x, centro y, tamanho] em fração da largura/altura/largura
        cx, cy, t = foco
        s = int(im.width * t)
        x0 = int(im.width * cx - s / 2); y0 = int(im.height * cy - s / 2)
        x0 = max(0, min(im.width - s, x0)); y0 = max(0, min(im.height - s, y0))
        return im.crop((x0, y0, x0 + s, y0 + s)).resize((192, 192), Image.LANCZOS)
    a = np.asarray(im)[:, :, 3] > 40
    H, W = a.shape
    linhas = np.where(a.any(axis=1))[0]
    topo = linhas[0]
    faixa = a[topo:topo + max(4, int(H * 0.16))]
    xs = np.where(faixa.any(axis=0))[0]
    cx = int(xs.mean()) if len(xs) else W // 2
    s = int(min(W, max(H * 0.26, W * 0.42)))
    x0 = max(0, min(W - s, cx - s // 2))
    y0 = max(0, topo - int(s * 0.06))
    return im.crop((x0, y0, x0 + s, y0 + s)).resize((192, 192), Image.LANCZOS)


def heroi(cid, ref, nome, fontes):
    if ref.startswith('foto:'):   # imagem inteira, sem recorte
        path = achar(cid, ref[5:])
        im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
        g = limitar(im, w=1200); m = limitar(im, w=640)
        rel = os.path.relpath(path, ACERVO).replace(os.sep, '/')
        return im.convert('RGBA'), {'src': salvar(g, os.path.join(OUT, cid, f'{nome}.webp'), 84),
                    'm': salvar(m, os.path.join(OUT, cid, f'{nome}-m.webp'), 80), 'w': g.width, 'h': g.height,
                    'metodo': 'foto', 'foto': True, 'credito': fontes.get(rel, {}).get('credito', '')}
    path = achar(cid, ref)
    cache = os.path.join(ACERVO, cid, f'_corte_{nome}_{os.path.basename(path)}.png')
    if os.path.exists(cache):
        im, metodo = Image.open(cache).convert('RGBA'), 'cache'
    else:
        im, metodo = recortar(path)
        im = aparar(im)
        im.save(cache)
    im = suavizar_bordas(im)
    g = limitar(im, h=1500)
    m = limitar(im, h=820)
    rel = os.path.relpath(path, ACERVO).replace('\\', '/')
    info = fontes.get(rel, {})
    return im, {
        'src': salvar(g, os.path.join(OUT, cid, f'{nome}.webp'), 88),
        'm': salvar(m, os.path.join(OUT, cid, f'{nome}-m.webp'), 84),
        'w': g.width, 'h': g.height, 'metodo': metodo,
        'credito': info.get('credito', ''),
    }


def main(ids):
    cur = json.load(open(os.path.join(ROOT, 'scripts', 'curadoria.json'), encoding='utf-8'))
    dpath = os.path.join(ROOT, 'assets', 'data', 'imagens.json')
    dados = json.load(open(dpath, encoding='utf-8')) if os.path.exists(dpath) else {}
    so_rosto = '--herois' in ids
    ids = [i for i in ids if not i.startswith('--')]
    for cid in ids or [k for k in cur if not k.startswith('_')]:
        c = cur[cid]
        fontes = json.load(open(os.path.join(ACERVO, cid, 'FONTES.json'), encoding='utf-8')) if os.path.exists(os.path.join(ACERVO, cid, 'FONTES.json')) else {}
        print('==', cid, flush=True)
        d = dados.get(cid, {}) if so_rosto else {}
        im, d['heroi'] = heroi(cid, c['heroi'], 'heroi', fontes)
        d['rosto'] = salvar(rosto(im, c.get('rosto')), os.path.join(OUT, cid, 'rosto.webp'), 86)
        if so_rosto:
            _, d['alt'] = heroi(cid, c['alt'], 'alt', fontes)
            dados[cid] = d
            json.dump(dados, open(dpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            continue
        _, d['alt'] = heroi(cid, c['alt'], 'alt', fontes)
        f = ImageOps.exif_transpose(Image.open(achar(cid, c['fundo']))).convert('RGB')
        f = limitar(f, w=960).filter(ImageFilter.GaussianBlur(2))
        d['fundo'] = salvar(f, os.path.join(OUT, cid, 'fundo.webp'), 60)
        gal = []
        for i, ref in enumerate(c['galeria']):
            try:
                p = achar(cid, ref)
            except FileNotFoundError as e:
                print('  falta', e); continue
            im = ImageOps.exif_transpose(Image.open(p))
            im = im.convert('RGBA') if tem_alfa(im) else im.convert('RGB')
            t = limitar(im, w=560)
            g = limitar(im, w=1800, h=1800)
            rel = os.path.relpath(p, ACERVO).replace('\\', '/')
            info = fontes.get(rel, {})
            if not info and cid == 'capri':
                info = {'credito': 'Material oficial / fanart (ver _acervo/capri/FONTES.md)', 'oficial': '/oficial/' in rel}
            gal.append({
                't': salvar(t, os.path.join(OUT, cid, 'galeria', f'{i:02d}-p.webp'), 76),
                'f': salvar(g, os.path.join(OUT, cid, 'galeria', f'{i:02d}.webp'), 84),
                'w': t.width, 'h': t.height,
                'oficial': bool(info.get('oficial', ref.startswith('oficial/'))),
                'credito': info.get('credito', ''),
            })
        d['galeria'] = gal
        dados[cid] = d
        print(f"  heroi {d['heroi']['metodo']} {d['heroi']['w']}x{d['heroi']['h']} · galeria {len(gal)}", flush=True)
        json.dump(dados, open(dpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
