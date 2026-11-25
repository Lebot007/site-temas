# -*- coding: utf-8 -*-
"""Gera a lista de caracteres que o site usa, para pedir ao Google Fonts só esses glifos (&text=).

As fontes continuam exatamente as mesmas (mesmo desenho); o Google só deixa de mandar os milhares de
caracteres que nunca aparecem (ex.: o alfabeto japonês inteiro das fontes Zen do Kaneki/Sukuna/Rem).
Rode de novo sempre que mudar textos do site (perfis.js, temas.js, index.html, falas) — o script
também atualiza o <link> inicial do index.html.
Uso: python -I scripts/gerar_glifos.py
"""
import json, os, re, unicodedata
from urllib.parse import quote

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(RAIZ, *p)

textos = []
for rel in ('index.html', 'assets/js/app.js', 'assets/js/temas.js', 'assets/js/perfis.js', 'assets/js/voice.js'):
    textos.append(open(A(rel), encoding='utf-8').read())
man = json.load(open(A('assets/voz/manifest.json'), encoding='utf-8'))
textos += [v['t'] for falas in man.values() for v in falas.values()]
dados = json.load(open(A('assets/data/imagens.json'), encoding='utf-8'))
textos += [g.get('credito', '') for d in dados.values() for g in d.get('galeria', [])]

usados = set(''.join(textos))
# margem de segurança: todo o ASCII imprimível + Latin-1 (acentos) + pontuação tipográfica comum
base = {chr(c) for c in range(0x20, 0x7F)} | {chr(c) for c in range(0xA0, 0x100)} | set('“”‘’—–…•·€™←→✕›‹')
def entra(ch):
    if ch in base: return True
    cat = unicodedata.category(ch)
    if cat[0] in 'CZ' and ch != ' ': return False                 # controle / separadores
    nome = unicodedata.name(ch, '')
    return not any(p in nome for p in ('CJK', 'HIRAGANA', 'KATAKANA'))   # kanji usam a Noto Serif JP (link próprio)
glifos = ''.join(sorted({c for c in usados if entra(c)} | base))

js = ('// Gerado por scripts/gerar_glifos.py — caracteres que o site usa (as fontes do Google vêm só com eles).\n'
      f'export const GLIFOS = {json.dumps(glifos, ensure_ascii=False)};\n')
open(A('assets/js/glifos.js'), 'w', encoding='utf-8').write(js)

# <link> inicial do index.html (tema padrão) com o mesmo parâmetro que o app.js usa
html = open(A('index.html'), encoding='utf-8').read()
txt = quote(glifos, safe="-_.!~*'()")   # igual ao encodeURIComponent do navegador
novo, n = re.subn(r'(<link id="fonte-tema" rel="stylesheet" href="https://fonts\.googleapis\.com/css2\?family=[^"&]+(?:&amp;family=[^"&]+|&family=[^"&]+)*)(?:&(?:amp;)?text=[^"&]*)?(&(?:amp;)?display=swap")',
                  lambda m: f'{m.group(1)}&amp;text={txt}{m.group(2)}', html)
assert n == 1, 'link fonte-tema não encontrado'
open(A('index.html'), 'w', encoding='utf-8').write(novo)
print(len(glifos), 'caracteres')
