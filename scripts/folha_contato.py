# -*- coding: utf-8 -*-
"""Monta folhas de contato (miniaturas numeradas) para conferir visualmente as artes baixadas.
Uso: python -I scripts/folha_contato.py <id> <pasta: oficial|recorte|fanart|corte> <saida.jpg>
"""
import os, sys
from PIL import Image, ImageDraw, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main(cid, pasta, out, cols=8, tw=170, th=220):
    base = os.path.join(ROOT, '_acervo', cid, pasta)
    files = sorted(f for f in os.listdir(base) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')))
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * th), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        try:
            im = Image.open(os.path.join(base, f))
            im.draft('RGB', (tw * 2, th * 2))
            if im.mode in ('RGBA', 'LA', 'P'):
                im = im.convert('RGBA')
                bg = Image.new('RGBA', im.size, (255, 0, 255, 255))   # magenta revela transparência
                bg.alpha_composite(im); im = bg
            im = ImageOps.contain(im.convert('RGB'), (tw - 6, th - 26))
        except Exception as e:
            im = Image.new('RGB', (tw - 6, th - 26), (120, 0, 0))
        x, y = (i % cols) * tw, (i // cols) * th
        sheet.paste(im, (x + 3, y + 3))
        d.rectangle([x, y + th - 22, x + tw, y + th], fill=(0, 0, 0))
        d.text((x + 4, y + th - 19), f'{i} {f[:22]}', fill=(255, 255, 0))
    sheet.save(out, quality=82)
    print(out, len(files))


if __name__ == '__main__':
    main(*sys.argv[1:4])
