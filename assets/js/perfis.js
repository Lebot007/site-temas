// Conteúdo sobre cada personagem: quem é, personalidade, ficha e frases famosas.
// As frases têm a chave do áudio correspondente (frase1..4) para tocar com a voz.

export const PERFIS = {
  capri: {
    titulo: 'A garota que mora num chip',
    bio: [
      'Capri é um construto de personalidade criado no Projeto Capricorn, da Arasaka: dezenas de mentes humanas digitalizadas, fundidas em uma só. Ela vive dentro de um shard de dados e só aparece para quem conecta o chip ao próprio cérebro.',
      'Em Cyberpunk: Edgerunners 2, ela se torna o centro da jornada de D, que atravessa Night City tentando deixá-la inteira de novo.',
    ],
    traits: ['Brincalhona', 'Curiosa', 'Carente de companhia', 'Digital até a alma'],
    ficha: [['Obra', 'Cyberpunk: Edgerunners 2'], ['Estúdios', 'Studio Trigger · CD PROJEKT RED'], ['Origem', 'Projeto Capricorn (Arasaka)'], ['Onde vive', 'Um shard de dados'], ['Visual', 'Formas vermelhas e visor verde neon']],
    frases: [{ k: "frase_1", t: "Eu não sou só um programa. Eu sou várias pessoas tentando ser uma só." }, { k: "frase_2", t: "Num mundo feito de cromo, ser lembrada é o jeito de continuar viva." }, { k: "frase_3", t: "Se o mundo inteiro apagar, eu continuo aqui. Guardadinha no chip." }, { k: "frase_4", t: "Night City não perdoa ninguém. Mas aqui a gente tem um ao outro." }, { k: "frase_5", t: "Me conecta de novo? Eu prometo não sumir." }, { k: "frase_6", t: "Eu sou feita de memórias. E agora você é uma delas." }],
  },
  sukuna: {
    titulo: 'O Rei das Maldições',
    bio: [
      'Ryomen Sukuna foi um feiticeiro da era Heian tão temido que virou lenda: o Rei das Maldições. Seus vinte dedos amaldiçoados sobreviveram por mil anos, até Yuji Itadori engolir um deles e se tornar seu receptáculo.',
      'Arrogante, cruel e brilhante em combate, Sukuna só respeita quem é forte. Sua técnica corta tudo o que toca, e sua Expansão de Domínio é considerada uma das mais perigosas da série.',
    ],
    traits: ['Arrogante', 'Implacável', 'Gênio do combate', 'Respeita apenas a força'],
    ficha: [['Obra', 'Jujutsu Kaisen'], ['Criador', 'Gege Akutami'], ['Estúdio', 'MAPPA'], ['Voz original', 'Junichi Suwabe'], ['Técnica', 'Santuário (Desmantelar e Clivar)'], ['Domínio', 'Santuário Malevolente']],
    frases: [{ k: "frase_1", t: "Conheça o seu lugar, tolo." }, { k: "frase_2", t: "Fique orgulhoso. Você é forte." }, { k: "frase_3", t: "Expansão de Domínio. Santuário Malevolente." }, { k: "frase_4", t: "Eu sou o Rei das Maldições. Lembre-se disso." }, { k: "frase_5", t: "Desmantelar. Clivar." }, { k: "frase_6", t: "Eu faço o que quero, quando quero." }],
  },
  kaneki: {
    titulo: 'Metade humano, metade ghoul',
    bio: [
      'Ken Kaneki era um universitário tímido, apaixonado por livros, até sobreviver a um ataque e receber os órgãos de uma ghoul. Desde então vive entre dois mundos, sem pertencer totalmente a nenhum deles.',
      'Acolhido pelo café Anteiku, ele tenta proteger quem ama enquanto luta contra a própria fome. O cabelo branco e a máscara se tornaram o símbolo de quem ele precisou virar.',
    ],
    traits: ['Gentil', 'Leitor voraz', 'Protetor', 'Atormentado'],
    ficha: [['Obra', 'Tokyo Ghoul'], ['Criador', 'Sui Ishida'], ['Estúdio', 'Studio Pierrot'], ['Voz original', 'Natsuki Hanae'], ['Kagune', 'Rinkaku'], ['Refúgio', 'Café Anteiku']],
    frases: [{ k: "frase_1", t: "Eu não sou o protagonista de uma novela. Sou só um universitário que gosta de ler." }, { k: "frase_2", t: "Se você escrevesse uma história comigo, seria uma tragédia." }, { k: "frase_3", t: "Não é o mundo que está errado. Sou eu." }, { k: "frase_4", t: "Mil menos sete... novecentos e noventa e três. Novecentos e noventa e três menos sete... novecentos e oitenta e seis." }, { k: "frase_5", t: "Eu prefiro ser ferido do que ferir alguém." }, { k: "frase_6", t: "Eu vou proteger quem eu amo. Não importa o que eu me torne." }],
  },
  frieren: {
    titulo: 'A maga que aprende a sentir',
    bio: [
      'Frieren é uma elfa maga que, ao lado de Himmel, Heiter e Eisen, derrotou o Rei Demônio. Para alguém que vive mais de mil anos, aqueles dez anos de aventura pareceram um instante, até a morte de Himmel mostrar o quanto ela não tinha prestado atenção.',
      'Agora ela refaz a jornada com sua aprendiz Fern e o guerreiro Stark, colecionando feitiços curiosos e tentando entender os humanos que deixou passar.',
    ],
    traits: ['Calma', 'Distraída', 'Colecionadora de feitiços', 'Mais carinhosa do que parece'],
    ficha: [['Obra', 'Sousou no Frieren'], ['Autores', 'Kanehito Yamada · Tsukasa Abe'], ['Estúdio', 'Madhouse'], ['Voz original', 'Atsumi Tanezaki'], ['Raça', 'Elfa'], ['Feitiço marcante', 'Zoltraak']],
    frases: [{ k: "frase_1", t: "A vida humana é curta. Por que eu não tentei conhecê-lo melhor?" }, { k: "frase_2", t: "Zoltraak." }, { k: "frase_3", t: "Magia é o mundo da imaginação." }, { k: "frase_4", t: "Eu quero entender os humanos." }, { k: "frase_5", t: "Esse baú deve ser um mímico. Mas eu vou abrir mesmo assim." }, { k: "frase_6", t: "Eu aprendo feitiços que fazem flores. É o meu preferido." }],
  },
  emilia: {
    titulo: 'A meia-elfa de coração gentil',
    bio: [
      'Emilia é uma meia-elfa de cabelos prateados e candidata ao trono do Reino de Lugunica. Por se parecer com a Bruxa da Inveja, enfrenta preconceito por onde passa, mas nunca deixa de ajudar quem precisa.',
      'Ao lado do espírito Puck e de Subaru, ela luta com magia de gelo e uma determinação que cresce a cada arco.',
    ],
    traits: ['Gentil', 'Determinada', 'Ingênua', 'Justa'],
    ficha: [['Obra', 'Re:Zero, Começando a Vida em Outro Mundo'], ['Autor', 'Tappei Nagatsuki'], ['Estúdio', 'White Fox'], ['Voz original', 'Rie Takahashi'], ['Espírito', 'Puck'], ['Magia', 'Gelo']],
    frases: [{ k: "frase_1", t: "Eu sou só a Emilia. Só Emilia." }, { k: "frase_2", t: "Eu quero ser alguém que ajuda as pessoas, não importa o que digam." }, { k: "frase_3", t: "Obrigada por estar aqui. De verdade." }, { k: "frase_4", t: "Eu vou me esforçar. Isso eu prometo." }, { k: "frase_5", t: "Eu quero que todos sejam tratados com justiça." }, { k: "frase_6", t: "Mesmo com medo, eu vou seguir em frente." }],
  },
  beatrice: {
    titulo: 'A guardiã da biblioteca proibida',
    bio: [
      'Beatrice, que gosta de ser chamada de Betty, é um Grande Espírito que passou quatrocentos anos guardando a Biblioteca dos Livros Proibidos, escondida na mansão Roswaal.',
      'Por trás do jeito orgulhoso e do "eu diria" no fim das frases, existe alguém que esperou demais por uma única pessoa. Até Subaru aparecer.',
    ],
    traits: ['Orgulhosa', 'Tsundere', 'Leal', 'Mais doce do que admite'],
    ficha: [['Obra', 'Re:Zero, Começando a Vida em Outro Mundo'], ['Autor', 'Tappei Nagatsuki'], ['Estúdio', 'White Fox'], ['Voz original', 'Satomi Arai'], ['Natureza', 'Grande Espírito'], ['Lar', 'Biblioteca dos Livros Proibidos']],
    frases: [{ k: "frase_1", t: "A Betty é um grande espírito, eu diria." }, { k: "frase_2", t: "Quem é você para invadir a Biblioteca dos Livros Proibidos?" }, { k: "frase_3", t: "A Betty não está feliz. Nem um pouquinho, eu diria." }, { k: "frase_4", t: "A Betty esperou por alguém por quatrocentos anos, eu diria." }, { k: "frase_5", t: "Não chame a Betty de criança, eu diria!" }, { k: "frase_6", t: "Se for você... a Betty aceita, eu diria." }],
  },
  rem: {
    titulo: 'A empregada que começou do zero',
    bio: [
      'Rem é uma oni que trabalha como empregada na mansão Roswaal ao lado da irmã gêmea, Ram. Educada e eficiente, esconde a dor de ter sobrevivido à tragédia da sua vila.',
      'Quando passa a confiar em Subaru, se torna seu maior apoio, com um mangual na mão e a frase que marcou a série: vamos começar do zero.',
    ],
    traits: ['Dedicada', 'Educada', 'Corajosa', 'Leal até o fim'],
    ficha: [['Obra', 'Re:Zero, Começando a Vida em Outro Mundo'], ['Autor', 'Tappei Nagatsuki'], ['Estúdio', 'White Fox'], ['Voz original', 'Inori Minase'], ['Raça', 'Oni'], ['Arma', 'Mangual (morning star)']],
    frases: [{ k: "frase_1", t: "Vamos começar do zero. Do zero, juntos." }, { k: "frase_2", t: "A Rem acha que você é um herói." }, { k: "frase_3", t: "Por favor, deixe a Rem ficar ao seu lado." }, { k: "frase_4", t: "Falar do futuro faz o demônio rir, não é?" }, { k: "frase_5", t: "A Rem ama você. Isso nunca vai mudar." }, { k: "frase_6", t: "A Rem vai proteger você. Custe o que custar." }],
  },
  eren: {
    titulo: 'O garoto que queria ver o mar',
    bio: [
      'Eren Yeager cresceu atrás das muralhas sonhando com o mundo lá fora. Depois que um titã destruiu sua cidade, ele jurou exterminar todos e entrou para a Tropa de Exploração.',
      'Herdeiro do Titã de Ataque e do Titã Fundador, Eren é movido por uma única ideia: ser livre. Até onde isso o leva é uma das maiores discussões da história dos animes.',
    ],
    traits: ['Obstinado', 'Impulsivo', 'Movido pela liberdade', 'Implacável'],
    ficha: [['Obra', 'Shingeki no Kyojin (Attack on Titan)'], ['Criador', 'Hajime Isayama'], ['Estúdios', 'WIT Studio · MAPPA'], ['Voz original', 'Yuki Kaji'], ['Titãs', 'Ataque e Fundador'], ['Tropa', 'Tropa de Exploração']],
    frases: [{ k: "frase_1", t: "Se você vencer, você vive. Se perder, morre. Se não lutar, não pode vencer!" }, { k: "frase_2", t: "Tatakae. Lute!" }, { k: "frase_3", t: "Eu continuo seguindo em frente." }, { k: "frase_4", t: "Eu nasci neste mundo. Eu sou livre." }, { k: "frase_5", t: "Além das muralhas tem o mar. Eu vou ver." }, { k: "frase_6", t: "A liberdade não é dada. É conquistada." }],
  },
  thorfinn: {
    titulo: 'O guerreiro que escolheu a paz',
    bio: [
      'Thorfinn passou a infância no campo de batalha, servindo ao homem que matou seu pai, Thors, só para um dia ter direito a um duelo de vingança. Quando essa vingança lhe foi tirada, ficou sem nada.',
      'Vendido como escravo numa fazenda, aprendeu a plantar, a se arrepender e a sonhar com Vinland: uma terra sem guerra e sem escravidão. Hoje ele diz que não tem inimigos.',
    ],
    traits: ['Pacífico', 'Trabalhador', 'Arrependido', 'Sonhador'],
    ficha: [['Obra', 'Vinland Saga'], ['Criador', 'Makoto Yukimura'], ['Estúdios', 'WIT Studio · MAPPA'], ['Voz original', 'Yuto Uemura'], ['Pai', 'Thors, o Troll de Jom'], ['Sonho', 'Fundar Vinland']],
    frases: [{ k: "frase_1", t: "Eu não tenho inimigos." }, { k: "frase_2", t: "Ninguém tem inimigos. Ninguém." }, { k: "frase_3", t: "Eu vou construir uma terra sem guerra e sem escravidão. Vinland." }, { k: "frase_4", t: "Um verdadeiro guerreiro não precisa de espada." }, { k: "frase_5", t: "Eu passei a vida tirando. Agora eu quero dar." }, { k: "frase_6", t: "O arrependimento não apaga o passado. Mas muda o futuro." }],
  },
  gojo: {
    titulo: 'O feiticeiro mais forte',
    bio: [
      'Satoru Gojo é professor no Colégio Técnico de Jujutsu de Tóquio e o feiticeiro mais poderoso de sua geração. Nasceu com os Seis Olhos e com a técnica Ilimitado, o que o torna praticamente intocável.',
      'Brincalhão, confiante e viciado em doces, ele trata tudo com leveza, menos o futuro dos alunos. Sua Expansão de Domínio, o Vazio Infinito, sobrecarrega a mente de quem estiver dentro.',
    ],
    traits: ['Confiante', 'Brincalhão', 'Protetor dos alunos', 'Ama doces'],
    ficha: [['Obra', 'Jujutsu Kaisen'], ['Criador', 'Gege Akutami'], ['Estúdio', 'MAPPA'], ['Voz original', 'Yuichi Nakamura'], ['Técnica', 'Ilimitado e Seis Olhos'], ['Domínio', 'Vazio Infinito']],
    frases: [{ k: "frase_1", t: "Fica tranquilo. Afinal, eu sou o mais forte." }, { k: "frase_2", t: "Expansão de Domínio. Vazio Infinito." }, { k: "frase_3", t: "Ao longo dos céus e da terra, somente eu sou o honrado." }, { k: "frase_4", t: "Perder? Nah. Eu ganharia." }, { k: "frase_5", t: "Ninguém encosta nos meus alunos." }, { k: "frase_6", t: "Eu sou o mais forte porque eu nasci assim." }],
  },
};
