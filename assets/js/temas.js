// Cada tema = um personagem. Cores, fontes, atmosfera 3D e textos com a personalidade dele.
// modo: 0 chuva · 1 subindo · 2 caindo devagar · 3 vórtice · 4 flutuando
// forma: 0 brilho · 1 pétala · 2 risco · 3 estrela · 4 floco

export const TEMAS = {
  capri: {
    nome: 'Capri', curto: 'Capri', kanji: '電', anime: 'Cyberpunk: Edgerunners 2', escuro: true,
    cores: { bg: '#090512', bg2: '#170b2b', ink: '#f6ecff', muted: '#b9a6cf', acc: '#ff3d9a', acc2: '#2ef2ff', card: 'rgba(32,14,56,.55)' },
    fontes: { display: 'Chakra Petch', body: 'Chakra Petch', google: 'Chakra+Petch:wght@400;500;600;700' },
    fx: { modo: 0, forma: 2, vel: 0.9, tam: 22, alfa: 0.75, qtd: 2600, cor1: '#ff3d9a', cor2: '#2ef2ff', aditivo: true },
    assinatura: 'Conexão estabelecida. Bem-vindo à Night City do Lebot.',
    papel: 'Desenvolvedor e criador, rodando direto do chip.',
  },
  sukuna: {
    nome: 'Ryomen Sukuna', curto: 'Sukuna', kanji: '呪', anime: 'Jujutsu Kaisen', escuro: true,
    cores: { bg: '#0f0405', bg2: '#260a0d', ink: '#f3e6d6', muted: '#bf9f94', acc: '#e0242f', acc2: '#f0c987', card: 'rgba(48,10,14,.55)' },
    fontes: { display: 'Shippori Mincho B1', body: 'Zen Kaku Gothic New', google: 'Shippori+Mincho+B1:wght@600;800&family=Zen+Kaku+Gothic+New:wght@400;500;700' },
    fx: { modo: 1, forma: 0, vel: 1, tam: 16, alfa: 0.85, qtd: 1800, cor1: '#ff3b2f', cor2: '#ffb347', aditivo: true },
    assinatura: 'Você entrou no Santuário Malevolente. Conheça o seu lugar.',
    papel: 'Desenvolvedor e criador. Domínio expandido em código.',
  },
  kaneki: {
    nome: 'Ken Kaneki', curto: 'Kaneki', kanji: '喰', anime: 'Tokyo Ghoul', escuro: true,
    cores: { bg: '#0b0b0e', bg2: '#17171c', ink: '#ececf1', muted: '#9c9ca8', acc: '#c3142d', acc2: '#ffffff', card: 'rgba(28,28,34,.6)' },
    fontes: { display: 'Cormorant Garamond', body: 'Zen Kaku Gothic New', google: 'Cormorant+Garamond:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700' },
    fx: { modo: 2, forma: 1, vel: 0.8, tam: 20, alfa: 0.8, qtd: 900, cor1: '#c3142d', cor2: '#e8e8ee', aditivo: false },
    assinatura: 'Um café no Anteiku, um livro aberto e o portfólio do Lebot.',
    papel: 'Desenvolvedor e criador. Metade código, metade história.',
  },
  frieren: {
    nome: 'Frieren', curto: 'Frieren', kanji: '魔', anime: 'Sousou no Frieren', escuro: false,
    cores: { bg: '#eef3ea', bg2: '#d9e6d3', ink: '#24352b', muted: '#5d7264', acc: '#4f8a6a', acc2: '#c79a3a', card: 'rgba(255,255,255,.62)' },
    fontes: { display: 'Spectral', body: 'Mulish', google: 'Spectral:wght@500;600;700&family=Mulish:wght@400;500;700' },
    fx: { modo: 2, forma: 1, vel: 0.6, tam: 18, alfa: 0.85, qtd: 700, cor1: '#6fa8dc', cor2: '#f3f0d8', aditivo: false },
    assinatura: 'Uma jornada calma pelos campos, colecionando feitiços.',
    papel: 'Desenvolvedor e criador. Um grimório de projetos.',
  },
  emilia: {
    nome: 'Emilia', curto: 'Emilia', kanji: '氷', anime: 'Re:Zero', escuro: false,
    cores: { bg: '#f6f6fb', bg2: '#e6e4f4', ink: '#2c2a44', muted: '#6c6890', acc: '#8f6fd1', acc2: '#5eb6e6', card: 'rgba(255,255,255,.66)' },
    fontes: { display: 'Marcellus', body: 'Quicksand', google: 'Marcellus&family=Quicksand:wght@400;500;600;700' },
    fx: { modo: 2, forma: 4, vel: 0.55, tam: 20, alfa: 0.9, qtd: 1100, cor1: '#b9a8ef', cor2: '#a6dcf7', aditivo: false },
    assinatura: 'Neve prateada e um coração gentil. Seja bem-vindo.',
    papel: 'Desenvolvedor e criador. Feito com carinho e esforço.',
  },
  beatrice: {
    nome: 'Beatrice', curto: 'Beatrice', kanji: '書', anime: 'Re:Zero', escuro: false,
    cores: { bg: '#fff1f6', bg2: '#fbdbe8', ink: '#4a2733', muted: '#8e5d6d', acc: '#e0558f', acc2: '#b98a3e', card: 'rgba(255,255,255,.64)' },
    fontes: { display: 'Cinzel Decorative', body: 'Nunito', google: 'Cinzel+Decorative:wght@400;700&family=Nunito:wght@400;600;700' },
    fx: { modo: 4, forma: 3, vel: 0.7, tam: 18, alfa: 0.9, qtd: 800, cor1: '#ff8ab8', cor2: '#e8c26a', aditivo: false },
    assinatura: 'Biblioteca dos Livros Proibidos. Entre em silêncio, eu diria.',
    papel: 'Desenvolvedor e criador. Aprovado pela Betty, eu diria.',
  },
  rem: {
    nome: 'Rem', curto: 'Rem', kanji: '鬼', anime: 'Re:Zero', escuro: true,
    cores: { bg: '#07142b', bg2: '#0e2a55', ink: '#eaf3ff', muted: '#9db7da', acc: '#58a8ff', acc2: '#ffffff', card: 'rgba(14,38,78,.55)' },
    fontes: { display: 'Zen Maru Gothic', body: 'Zen Maru Gothic', google: 'Zen+Maru+Gothic:wght@400;500;700;900' },
    fx: { modo: 2, forma: 1, vel: 0.65, tam: 18, alfa: 0.85, qtd: 1000, cor1: '#7fc0ff', cor2: '#e6f2ff', aditivo: true },
    assinatura: 'A Rem preparou tudo com cuidado. Fique à vontade.',
    papel: 'Desenvolvedor e criador. Organizado com dedicação.',
  },
  eren: {
    nome: 'Eren Yeager', curto: 'Eren', kanji: '進', anime: 'Shingeki no Kyojin', escuro: true,
    cores: { bg: '#121210', bg2: '#22211b', ink: '#eee8da', muted: '#a8a08c', acc: '#c45a2c', acc2: '#7d9460', card: 'rgba(40,38,30,.6)' },
    fontes: { display: 'Big Shoulders Display', body: 'Barlow', google: 'Big+Shoulders+Display:wght@600;800;900&family=Barlow:wght@400;500;600' },
    fx: { modo: 1, forma: 0, vel: 0.7, tam: 26, alfa: 0.5, qtd: 1200, cor1: '#d9cbb0', cor2: '#ff7a3d', aditivo: true },
    assinatura: 'Além das muralhas há liberdade. Siga em frente.',
    papel: 'Desenvolvedor e criador. Avançando, sem parar.',
  },
  thorfinn: {
    nome: 'Thorfinn', curto: 'Thorfinn', kanji: '麦', anime: 'Vinland Saga', escuro: false,
    cores: { bg: '#f6ecd2', bg2: '#ecd9a8', ink: '#3b2a14', muted: '#7a6240', acc: '#c98d17', acc2: '#5f7a35', card: 'rgba(255,250,236,.62)' },
    fontes: { display: 'Cinzel', body: 'Source Serif 4', google: 'Cinzel:wght@500;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600' },
    fx: { modo: 4, forma: 0, vel: 0.6, tam: 14, alfa: 0.8, qtd: 900, cor1: '#f2b632', cor2: '#fff3c4', aditivo: false },
    assinatura: 'Uma terra sem guerra, campos dourados e trabalho honesto.',
    papel: 'Desenvolvedor e criador. Plantando projetos que duram.',
  },
  gojo: {
    nome: 'Satoru Gojo', curto: 'Gojo', kanji: '無', anime: 'Jujutsu Kaisen', escuro: true,
    cores: { bg: '#03050d', bg2: '#0a1230', ink: '#eef6ff', muted: '#97aacc', acc: '#4fc3ff', acc2: '#9a6bff', card: 'rgba(12,22,58,.55)' },
    fontes: { display: 'Unbounded', body: 'Manrope', google: 'Unbounded:wght@500;700;900&family=Manrope:wght@400;500;700' },
    fx: { modo: 3, forma: 3, vel: 0.8, tam: 14, alfa: 0.9, qtd: 3200, cor1: '#7fd6ff', cor2: '#b79bff', aditivo: true },
    assinatura: 'Expansão de Domínio: Vazio Infinito. Relaxa, você tá seguro.',
    papel: 'Desenvolvedor e criador. O mais forte no código.',
  },
};

export const ORDEM = ['capri', 'sukuna', 'kaneki', 'frieren', 'emilia', 'beatrice', 'rem', 'eren', 'thorfinn', 'gojo'];
