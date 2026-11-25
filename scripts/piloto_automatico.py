# -*- coding: utf-8 -*-
"""Piloto automático: termina as vozes sozinho (sem precisar do Claude) e publica no GitHub.

1. Mantém o PC acordado enquanto trabalha.
2. Espera os geradores locais em andamento terminarem; se algum personagem ficou
   incompleto, gera o que faltar.
3. Gera as 71 falas do Gojo com o modelo V2 (referência: amostra oficial do modelo V2
   da Fish Audio), 3 tentativas por fala, valida (fala completa, sem corte no fim,
   voz parecida com o V2) e refaz as reprovadas.
4. Faz commit e push no GitHub com a identidade do repositório (Lebot007).

Log: D:\\Claude config\\temp\\site-temas\\piloto.log
Uso: python -I scripts/piloto_automatico.py
"""
import ctypes, datetime, glob, json, os, subprocess, sys, time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
TMP = r'D:\Claude config\temp\site-temas'
LOG = os.path.join(TMP, 'piloto.log')
PY_SITE = r'D:\Claude config\venvs\site-temas\Scripts\python.exe'
PY_FISH = r'D:\Claude config\venvs\fish-speech\Scripts\python.exe'
REFS = os.path.join(TMP, 'refs')
LOCAL = os.path.join(TMP, 'local')
ENV = dict(os.environ, PYTHONIOENCODING='utf-8')
TODOS = ['capri', 'sukuna', 'kaneki', 'frieren', 'emilia', 'beatrice', 'rem', 'eren', 'thorfinn', 'gojo']


def log(msg):
    linha = f'[{datetime.datetime.now():%d/%m %H:%M:%S}] {msg}'
    print(linha, flush=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(linha + '\n')


def manter_acordado():
    # ES_CONTINUOUS | ES_SYSTEM_REQUIRED: impede o Windows de dormir enquanto o piloto roda
    try:
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001)
    except Exception:
        pass


def geradores_rodando():
    cmd = ['powershell', '-NoProfile', '-Command',
           "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | "
           "Where-Object { $_.CommandLine -like '*gerar_local.py*' -or $_.CommandLine -like '*tts_local.py*' } | "
           "Measure-Object | Select-Object -ExpandProperty Count"]
    try:
        return int(subprocess.run(cmd, capture_output=True, text=True, timeout=60).stdout.strip() or 0)
    except Exception:
        return 0


def manifest():
    p = os.path.join(ROOT, 'assets', 'voz', 'manifest.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


def gravar_manifest(cid, dados):
    mpath = os.path.join(ROOT, 'assets', 'voz', 'manifest.json')
    trava = mpath + '.trava'
    while True:
        try:
            fd = os.open(trava, os.O_CREAT | os.O_EXCL | os.O_WRONLY); break
        except FileExistsError:
            time.sleep(0.3)
    try:
        atual = manifest()
        atual[cid] = dados
        json.dump(atual, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    finally:
        os.close(fd); os.unlink(trava)


# ---------------- etapa 2: completar os outros personagens ----------------
def completar_outros(falas):
    while geradores_rodando():
        manter_acordado()
        time.sleep(60)
    log('geradores em andamento terminaram')
    m = manifest()
    faltando = [c for c in TODOS if c != 'gojo' and len(m.get(c, {})) < len(falas[c])]
    if faltando:
        log(f'completando personagens incompletos: {faltando}')
        env = dict(ENV, TENTATIVAS='1', RODADAS='1')
        subprocess.run([PY_SITE, '-I', '-u', os.path.join(ROOT, 'scripts', 'gerar_local.py')] + faltando, env=env)
    m = manifest()
    log('falas por personagem: ' + ', '.join(f'{c}={len(m.get(c, {}))}' for c in TODOS))


# ---------------- etapa 3: Gojo V2 ----------------
def tts(jobs):
    path = os.path.join(TMP, f'jobs_piloto_{os.getpid()}.json')
    json.dump(jobs, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    p = subprocess.run([PY_FISH, os.path.join(ROOT, 'scripts', 'tts_local.py'), path], env=ENV,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    if p.returncode != 0:
        log('ERRO no TTS: ' + p.stderr[-1500:])
        raise SystemExit(1)


def fim_abrupto(w16):
    """Fala cortada no fim: a energia dos últimos 40 ms ainda está alta (não houve decaimento)."""
    import numpy as np, soundfile as sf
    x, sr = sf.read(w16, dtype='float32')
    if len(x) < sr * 0.3:
        return True
    cauda = x[-int(sr * 0.04):]
    corpo = x[int(len(x) * 0.2):int(len(x) * 0.8)]
    rc = 20 * np.log10(np.sqrt((cauda ** 2).mean()) + 1e-9)
    rb = 20 * np.log10(np.sqrt((corpo ** 2).mean()) + 1e-9)
    return rc > rb - 6


def avaliar(falas_gojo, ref_emb):
    import analise_voz as av, gerar_vozes as gv
    cache_p = os.path.join(LOCAL, '_notas_gojo_v2.json')
    cache = json.load(open(cache_p, encoding='utf-8')) if os.path.exists(cache_p) else {}
    res = {}
    for f in sorted(glob.glob(os.path.join(LOCAL, 'gojo_v2', '*.wav'))):
        k = os.path.basename(f).split('__')[0]
        if k not in falas_gojo:
            continue
        if f not in cache:
            heard, w2 = gv.ouvir(f); os.remove(w2)
            w = av.wav16(f)
            piso, clip, _ = av.ruido(w)
            cache[f] = {'texto': gv.nota_texto(falas_gojo[k], heard), 'ouvido': heard, 'voz': float(av.embedding(w) @ ref_emb),
                        'ruido': piso, 'clip': clip, 'cortado': bool(fim_abrupto(w))}
            os.remove(w)
            json.dump(cache, open(cache_p, 'w', encoding='utf-8'), ensure_ascii=False)
        t = dict(cache[f], f=f)
        t['ok'] = t['texto'] >= 0.85 and not t['cortado'] and t['ruido'] <= -48 and t['clip'] <= 20 and t['voz'] >= 0.55
        t['nota'] = 3 * t['ok'] + t['texto'] + 2 * t['voz'] - 2 * t['cortado']
        res.setdefault(k, []).append(t)
    return res


def gojo_v2(falas):
    import numpy as np, gerar_vozes as gv
    fg = falas['gojo']
    ref_emb = np.load(os.path.join(REFS, 'gojo_v2.npy'))
    log('Gojo V2: gerando 71 falas x 3 tentativas')
    tts([{'id': 'gojo_v2', 'k': k, 't': t, 'n': 3, 'rodada': 0} for k, t in fg.items()])
    for rodada, n in ((1, 3), (2, 2)):
        res = avaliar(fg, ref_emb)
        ruins = [k for k in fg if not any(t['ok'] for t in res.get(k, []))]
        log(f'Gojo V2: rodada extra {rodada}: {len(ruins)} falas reprovadas {ruins}')
        if not ruins:
            break
        tts([{'id': 'gojo_v2', 'k': k, 't': fg[k], 'n': n, 'rodada': rodada} for k in ruins])
    res = avaliar(fg, ref_emb)
    dados, relatorio, vozes = {}, [], []
    for k, texto in fg.items():
        ts = res.get(k, [])
        if not ts:
            log(f'Gojo V2: SEM ÁUDIO para {k} — mantém a versão anterior'); continue
        best = max(ts, key=lambda t: t['nota'])
        dst = os.path.join(ROOT, 'assets', 'voz', 'gojo', f'{k}.mp3')
        gv.finalizar(best['f'], dst)
        dados[k] = {'t': texto, 'd': gv.duracao(dst)}
        vozes.append(best['voz'])
        relatorio.append(f"{k}: ok={best['ok']} texto={best['texto']:.2f} voz={best['voz']:.2f} cortado={best['cortado']} ({len(ts)} tent.) \"{best['ouvido'][:80]}\"")
    antigo = manifest().get('gojo', {})
    antigo.update(dados)
    gravar_manifest('gojo', antigo)
    open(os.path.join(TMP, 'relatorio_gojo_v2.txt'), 'w', encoding='utf-8').write('\n'.join(relatorio))
    ok = sum(1 for l in relatorio if 'ok=True' in l)
    log(f'Gojo V2: finalizado {len(dados)}/71 · aprovadas {ok} · voz mediana {sorted(vozes)[len(vozes)//2]:.2f} · relatório em relatorio_gojo_v2.txt')
    return ok, len(dados)


# ---------------- etapa 4: commit e push ----------------
def git(*args):
    p = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    log(f'git {" ".join(args[:2])}: {(p.stdout + p.stderr).strip()[-300:]}')
    return p.returncode


def publicar(ok, total):
    git('add', 'assets/voz', 'scripts')
    msg = (f'Vozes de todos os personagens + Gojo com o modelo V2\n\n'
           f'Falas geradas localmente no OpenAudio S1-mini. Gojo refeito com a voz do\n'
           f'modelo V2 ({ok}/{total} falas aprovadas na validação de corte e timbre).')
    if git('commit', '-m', msg) != 0:
        log('nada para commitar ou commit falhou')
    for i in range(5):
        if git('push', 'origin', 'main') == 0:
            log('PUSH OK — site atualizado em https://lebot007.github.io/site-temas/')
            return
        time.sleep(60)
    log('ERRO: push falhou 5 vezes')


def main():
    manter_acordado()
    log('=== piloto automático iniciado ===')
    falas = json.load(open(os.path.join(ROOT, 'scripts', 'falas.json'), encoding='utf-8'))
    completar_outros(falas)
    manter_acordado()
    ok, total = gojo_v2(falas)
    publicar(ok, total)
    log('=== piloto automático concluído ===')


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        import traceback
        log('ERRO FATAL: ' + traceback.format_exc())
        raise
