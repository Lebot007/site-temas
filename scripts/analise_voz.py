# -*- coding: utf-8 -*-
"""Análise de voz usada para garantir que todas as falas soam como o mesmo personagem.

- timbre: embedding de locutor ECAPA (SpeechBrain), comparado por similaridade de cosseno
- tom:    pitch mediano (librosa.pyin), comparado em semitons
- ritmo:  palavras por segundo de fala efetiva (sem silêncios)
"""
import math, os, subprocess, tempfile
import numpy as np

_tim = None


def wav16(path):
    out = os.path.join(tempfile.gettempdir() if not os.path.isdir(r'D:\Claude config\temp\site-temas') else r'D:\Claude config\temp\site-temas',
                       'an_' + os.path.basename(path) + f'_{os.getpid()}.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', path, '-ar', '16000', '-ac', '1', out], check=True)
    return out


def timbre():
    global _tim
    if _tim is None:
        import torch
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy
        m = EncoderClassifier.from_hparams('speechbrain/spkrec-ecapa-voxceleb',
                                           savedir=r'D:\Claude config\modelos\speechbrain-ecapa',
                                           run_opts={'device': 'cpu'}, local_strategy=LocalStrategy.COPY)
        _tim = (torch, m)
    return _tim


def embedding(w16):
    import soundfile as sf
    torch, m = timbre()
    x, sr = sf.read(w16, dtype='float32')
    with torch.no_grad():
        e = m.encode_batch(torch.from_numpy(x).unsqueeze(0)).squeeze()
    return (e / e.norm()).numpy()


def tom_e_ritmo(w16, texto):
    import librosa
    y, sr = librosa.load(w16, sr=16000)
    f0, voz, _ = librosa.pyin(y, fmin=65, fmax=650, sr=sr, frame_length=1024)
    f0 = f0[voz & ~np.isnan(f0)] if f0 is not None else np.array([])
    pitch = float(np.median(f0)) if len(f0) > 5 else float('nan')
    trechos = librosa.effects.split(y, top_db=35)
    fala = sum(b - a for a, b in trechos) / sr
    palavras = len([w for w in texto.split() if any(c.isalnum() for c in w)])
    return pitch, palavras / max(fala, 0.3), fala


def centroide(embs):
    E = np.stack(embs)
    c = E.mean(0); c /= np.linalg.norm(c)
    s = E @ c
    manter = s >= np.quantile(s, 0.25)
    c = E[manter].mean(0); c /= np.linalg.norm(c)
    return c


def semitons(f, ref):
    if not f or not ref or math.isnan(f) or math.isnan(ref):
        return 0.0
    return 12 * math.log2(f / ref)


def ruido(w16):
    """Ruído de fundo (dB do piso nas pausas), estalos e clipping."""
    import librosa
    y, sr = librosa.load(w16, sr=16000)
    rms = librosa.feature.rms(y=y, frame_length=512, hop_length=160)[0]
    db = 20 * np.log10(rms + 1e-9)
    fala = db > (db.max() - 35)
    pausas = db[~fala]
    piso = float(np.percentile(pausas, 50)) if len(pausas) > 10 else -90.0
    clip = int((np.abs(y) > 0.995).sum())
    # estalo: salto de amostra muito grande e isolado
    d = np.abs(np.diff(y))
    estalos = int((d > 0.6).sum())
    return piso, clip, estalos
