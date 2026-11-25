# Lebot · Portfólio temático

Portfólio do Lebot em que você escolhe um personagem de anime para guiar a visita. Cada personagem muda o site inteiro (cores, fontes, atmosfera 3D, artes) e pode **falar com a própria voz**, reagindo ao que você clica, passa o mouse e rola na página.

**Personagens:** Capri (Cyberpunk: Edgerunners 2) · Ryomen Sukuna e Satoru Gojo (Jujutsu Kaisen) · Ken Kaneki (Tokyo Ghoul) · Frieren (Sousou no Frieren) · Emilia, Beatrice e Rem (Re:Zero) · Eren Yeager (Shingeki no Kyojin) · Thorfinn (Vinland Saga)

## Como funciona

- **Trocar de tema:** botão com o rosto do personagem no topo → "Escolha seu guia". O tema fica salvo e também pode ser aberto direto por link: `?p=gojo`, `?p=rem`, `?p=thorfinn`…
- **Voz:** botão "Voz ligada / desligada" no topo. Ligada, o personagem fala ao passar o mouse nas redes sociais e no menu, ao clicar nele, nas frases e nas artes, ao chegar em cada seção e quando você fica parado. Desligada, o site fica só decorado, em silêncio.
- **Desempenho adaptativo:** o site mede o aparelho (núcleos, memória, tela, toque, TV, economia de dados) e escolhe o nível de efeitos. Se o FPS cair, ele reduz sozinho. No rodapé dá para escolher manualmente: Máximo, Equilibrado, Leve ou Sem animação. Respeita "reduzir movimento" do sistema.
- **Compatível** com Chrome, Edge, Firefox, Safari (iPhone/Mac), Samsung Internet e navegadores de TV. Sem build, sem dependências: HTML, CSS e JavaScript puros + WebGL 1.

## Estrutura

```
index.html
assets/
  css/main.css          estilos e temas
  js/app.js             troca de tema, seleção, reações, galeria
  js/temas.js           cores, fontes e atmosfera de cada personagem
  js/perfis.js          história, personalidade, ficha e frases
  js/voice.js           sistema de voz (fila, prioridades, legenda)
  js/fx.js              partículas 3D em WebGL (rodam na GPU)
  js/perf.js            detecção do aparelho e nível de qualidade
  img/<personagem>/     recorte, avatar, fundo e galeria (WebP)
  voz/<personagem>/     falas em MP3 + manifest.json
  data/imagens.json     lista de imagens e créditos
scripts/                ferramentas usadas para gerar os assets (não rodam no site)
```

## Gerando de novo (opcional)

As vozes ficam prontas em MP3 dentro de `assets/voz/`; o site não usa nenhuma API nem chave, então **nada sensível vai para o GitHub** (`chaves.txt` está no `.gitignore`).

As falas são geradas **localmente** com o OpenAudio S1-mini (modelo aberto da Fish Audio, roda na GPU, grátis e sem limite), clonando a voz de referência que a API oficial da Fish Audio produziu para cada personagem:

```
python -I scripts/preparar_referencias.py   # monta a voz de referência de cada personagem
python -I scripts/gerar_local.py            # gera as falas de scripts/falas.json, escolhe as melhores e finaliza
python -I scripts/auditar_vozes.py          # audita timbre, tom, ritmo, texto e ruído de todas as falas
python -I scripts/baixar_artes.py           # baixa artes para _acervo/ (fora do git)
python -I scripts/processar_imagens.py      # recorta e otimiza para assets/img/
```

## Publicar no GitHub Pages

1. Crie o repositório e envie os arquivos (`git push`).
2. Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O site fica em `https://lebot007.github.io/<nome-do-repositório>/`.

## Créditos

Personagens e artes oficiais pertencem aos seus autores e estúdios (MAPPA, Studio Pierrot, Madhouse, White Fox, WIT Studio, Studio Trigger, CD PROJEKT RED e editoras). As fanarts pertencem aos artistas creditados na galeria do site (o crédito aparece ao abrir cada imagem). Projeto de fã, sem fins comerciais.

Código sob licença MIT.
