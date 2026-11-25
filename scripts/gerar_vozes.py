# -*- coding: utf-8 -*-
"""Gera as falas dos personagens com a Fish Audio (modelo s1, plano free) e salva em assets/voz/.

A chave da API fica SÓ no chaves.txt local (ignorado pelo git). O site publicado usa apenas
os MP3 prontos — nenhuma chave vai para o GitHub Pages.

Controle de qualidade de cada fala:
  1. várias tentativas com temperatura baixa (menos variação de timbre);
  2. texto conferido com whisper.cpp (frase inteira + nome "Lebot" pronunciado certo);
  3. timbre conferido com embedding de locutor (ECAPA/SpeechBrain): escolhe a tentativa mais
     parecida com a "voz média" do personagem e descarta as que fogem do padrão;
  4. pausas longas encurtadas, volume normalizado, MP3 mono leve.

Uso: python -I scripts/gerar_vozes.py [id | id:chave ...] [--tentativas N]
"""
import concurrent.futures as cf, difflib, json, os, re, shutil, subprocess, sys, time, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'voz')
TMP = r'D:\Claude config\temp\site-temas\voz2'
WHISPER = r'D:\Claude config\tools\whisper.cpp'
os.makedirs(TMP, exist_ok=True)

NOMES = {'capri': 'capri', 'sukuna': 'sukuna', 'kaneki': 'kaneki', 'frieren': 'frieren', 'emilia': 'emilia re zero',
         'beatrice': 'beatrice', 'rem': 'rem re zero', 'eren': 'eren', 'thorfinn': 'thorfinn', 'gojo': 'satoru gojo'}
# grafia só para o TTS pronunciar certo (o texto exibido continua igual)
PRONUNCIA = [(r'\bLebot\b', 'Lebót')]
EXIGIR = {'lebot': ['lebot', 'lebote']}   # se a fala tem "Lebot", o whisper precisa ouvir isso


def chaves():
    txt = open(os.path.join(ROOT, 'chaves.txt'), encoding='utf-8').read()
    key = re.search(r'sk-fish-\S+', txt).group(0)
    ids = {}
    for cid, nome in NOMES.items():
        m = re.search(r'\b' + re.escape(nome).replace(r'\ ', r'\s+') + r'[^:\n]*:+\s*([0-9a-f]{32})', txt, re.I)
        ids[cid] = m.group(1)
    return key, ids


def tts(key, ref, text, path):
    for a, b in PRONUNCIA:
        text = re.sub(a, b, text)
    body = json.dumps({'text': text, 'reference_id': ref, 'format': 'wav', 'latency': 'normal',
                       'normalize': True, 'temperature': 0.55, 'top_p': 0.6, 'chunk_length': 300}).encode()
    req = urllib.request.Request('https://api.fish.audio/v1/tts', data=body, method='POST', headers={
        'Authorization': f'Bearer {key}', 'Content-Type': 'application/json', 'model': 's1'})
    for i in range(5):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                open(path, 'wb').write(r.read())
            return
        except Exception:
            if i == 4:
                raise
            time.sleep(4 * (i + 1))


def norm(w):
    w = unicodedata.normalize('NFD', w.lower())
    w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', w)


def ouvir(path):
    wav = path + '.16k.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', path, '-ar', '16000', '-ac', '1', wav], check=True)
    r = subprocess.run([WHISPER + r'\whisper-cli.exe', '-m', WHISPER + r'\ggml-large-v3-turbo.bin', '-l', 'pt',
                        '-f', wav, '-np', '-nt'], capture_output=True)
    return r.stdout.decode('utf-8', 'replace').strip(), wav


def nota_texto(text, heard):
    alvo = [norm(w) for w in text.split() if norm(w)]
    ouv = [norm(w) for w in heard.replace('-', ' ').split() if norm(w)]
    sim = difflib.SequenceMatcher(None, ouv, alvo).ratio()
    junto = ''.join(ouv)
    for chave, aceitos in EXIGIR.items():
        if chave in [norm(w) for w in text.split()] and not any(a in junto for a in aceitos):
            sim = min(sim, 0.5)
    return sim


def duracao(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                       capture_output=True, text=True)
    return round(float(r.stdout.strip()), 2)


def finalizar(src, dst):
    filt = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,'
            'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,'
            'silenceremove=stop_periods=-1:stop_duration=0.55:stop_threshold=-45dB:stop_silence=0.4,'
            'loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.02')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', filt, '-ar', '44100', '-ac', '1',
                    '-c:a', 'libmp3lame', '-b:a', '96k', dst], check=True)


class Timbre:
    def __init__(self):
        import torch, torchaudio
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy
        self.torch, self.ta = torch, torchaudio
        self.m = EncoderClassifier.from_hparams('speechbrain/spkrec-ecapa-voxceleb',
                                                savedir=r'D:\Claude config\modelos\speechbrain-ecapa',
                                                run_opts={'device': 'cpu'}, local_strategy=LocalStrategy.COPY)

    def emb(self, wav16):
        import soundfile as sf
        x, sr = sf.read(wav16, dtype='float32')
        t = self.torch.from_numpy(x).unsqueeze(0)
        with self.torch.no_grad():
            e = self.m.encode_batch(t).squeeze()
        return e / e.norm()


def gerar_takes(key, ref, cid, k, text, n):
    takes = []
    for t in range(n):
        p = os.path.join(TMP, f'{cid}_{k}_{int(time.time()*1000)%10**8}_{t}.wav')
        tts(key, ref, text, p)
        heard, w16 = ouvir(p)
        takes.append({'wav': p, 'w16': w16, 'heard': heard, 'sim': nota_texto(text, heard)})
    return takes


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    n = 2
    if '--tentativas' in sys.argv:
        n = int(sys.argv[sys.argv.index('--tentativas') + 1]); args = [a for a in args if a != str(n)]
    falas = json.load(open(os.path.join(ROOT, 'scripts', 'falas.json'), encoding='utf-8'))
    key, ids = chaves()
    mpath = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {}
    alvo = {}
    for a in args or list(falas):
        cid, _, k = a.partition(':')
        alvo.setdefault(cid, []).extend([k] if k else list(falas[cid]))
    timbre = Timbre()
    import torch
    relatorio = []
    for cid, keys in alvo.items():
        os.makedirs(os.path.join(OUT, cid), exist_ok=True)
        print(f'== {cid}: {len(keys)} falas x {n} tentativas', flush=True)
        jobs = {k: None for k in keys}
        with cf.ThreadPoolExecutor(6) as ex:
            # falas de primeira impressão (saudação e frases famosas) ganham mais tentativas
            futs = {ex.submit(gerar_takes, key, ids[cid], cid, k, falas[cid][k],
                              n + 2 if k.startswith(('ola_', 'frase_', 'voz_')) else n): k for k in keys}
            for f in cf.as_completed(futs):
                jobs[futs[f]] = f.result()
        # voz de referência: centróide das tentativas com texto correto, sem as 25% mais distantes
        def embs():
            for k, ts in jobs.items():
                for t in ts:
                    if 'e' not in t:
                        t['e'] = timbre.emb(t['w16'])
        embs()
        boas = [t['e'] for ts in jobs.values() for t in ts if t['sim'] >= 0.85]
        if len(boas) < 3:
            boas = [t['e'] for ts in jobs.values() for t in ts]
        c = torch.stack(boas).mean(0); c = c / c.norm()
        d = sorted(float(e @ c) for e in boas)
        corte = d[len(d) // 4]
        boas2 = [e for e in boas if float(e @ c) >= corte]
        c = torch.stack(boas2).mean(0); c = c / c.norm()
        # rodadas extras: falas sem tentativa boa OU com timbre abaixo do padrão do personagem
        for rodada in range(3):
            melhores = {k: max((float(t['e'] @ c) for t in ts if t['sim'] >= 0.85), default=0) for k, ts in jobs.items()}
            vals = sorted(v for v in melhores.values() if v > 0)
            alvo_voz = max(0.62, (vals[len(vals) // 2] if vals else 0.7) - 0.06)
            ruins = [k for k, v in melhores.items() if v < alvo_voz]
            if not ruins:
                break
            print(f'  rodada extra {rodada + 1} (timbre alvo {alvo_voz:.2f}): {len(ruins)} falas', flush=True)
            with cf.ThreadPoolExecutor(6) as ex:
                futs = {ex.submit(gerar_takes, key, ids[cid], cid, k, falas[cid][k], 3): k for k in ruins}
                for f in cf.as_completed(futs):
                    jobs[futs[f]] += f.result()
            embs()
        for k, ts in jobs.items():
            for t in ts:
                t['voz'] = float(t['e'] @ c)
                t['nota'] = (t['sim'] >= 0.85) * 2 + t['sim'] + 1.5 * t['voz']
            best = max(ts, key=lambda t: t['nota'])
            dst = os.path.join(OUT, cid, f'{k}.mp3')
            finalizar(best['wav'], dst)
            manifest.setdefault(cid, {})[k] = {'t': falas[cid][k], 'd': duracao(dst)}
            flag = '' if best['sim'] >= 0.85 and best['voz'] >= 0.6 else '  <<< CONFERIR'
            linha = f"{cid}/{k}: texto={best['sim']:.2f} voz={best['voz']:.2f} ({len(ts)} tent.) \"{best['heard']}\"{flag}"
            print(linha, flush=True)
            relatorio.append(linha)
            for t in ts:
                for f in (t['wav'], t['w16']):
                    try: os.remove(f)
                    except OSError: pass
        atual = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {}
        atual.setdefault(cid, {}).update(manifest.get(cid, {}))
        json.dump(atual, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(TMP, 'relatorio.txt'), 'w', encoding='utf-8').write('\n'.join(relatorio))
    print('ok')


if __name__ == '__main__':
    main()
