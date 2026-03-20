/**
 * COACH COPY ENGINE
 * 
 * Centraliza TODOS os textos dinâmicos baseados na personalidade do coach.
 * Cada frase deve parecer que "um humano com a personalidade escolhida" está guiando o atleta.
 * 
 * Fallback: PULSE
 */

import type { CoachStyle } from '@/types/outlier';

// ============================================================================
// TYPES
// ============================================================================

export interface CoachCopySet {
  selectCoachScreen: {
    title: string;
    subtitle: string;
    cards: Record<CoachStyle, { title: string; description: string }>;
    cta: string;
  };
  welcomeScreen: {
    headline: string;
    subheadline: string;
    coachCardIntro: string;
    bullets: string[];
    footer: string;
    /** Texto institucional explicando que treino ≠ estilo de feedback */
    institutionalNote: string;
  };
  /** Copys institucionais para configurações */
  settings: {
    coachStyleChangeNote: string;
    coachStyleChangeSubnote: string;
  };
  /** Copy antes do treino no dashboard */
  dashboard: {
    workoutAdjustedNote: string;
  };
  workoutComments: {
    preWorkout: string[];
    midWorkout: string[];
    postWorkout: string[];
  };
  feedback: {
    elite: string[];       // performance excepcional, acima do topo
    great: string[];        // arrebentou / PR
    goodButMore: string[];  // bom, mas dava pra mais
    tough: string[];        // dia difícil, mas apareceu
    bad: string[];          // foi mal / abaixo do padrão
    missed: string[];       // não treinou
  };
  blockCompletion: {
    aquecimento: string[];
    conditioning: string[];
    forca: string[];
    especifico: string[];
    core: string[];
    corrida: string[];
    default: string[];
    final: string[];
  };
}

// ============================================================================
// COACH COPY DATA
// ============================================================================

export const COACH_COPY: Record<CoachStyle, CoachCopySet> = {
  IRON: {
    selectCoachScreen: {
      title: 'Escolha o estilo do seu treinador.',
      subtitle: 'Não é tema. É personalidade. É o jeito que você vai evoluir.',
      cards: {
        IRON: {
          title: 'IRON',
          description: 'Duro. Direto. Sem desculpa. Padrão alto e cobrança pra performance.',
        },
        PULSE: {
          title: 'PULSE',
          description: 'Firme e humano. Constância com direção, sem quebrar seu corpo nem sua cabeça.',
        },
        SPARK: {
          title: 'SPARK',
          description: 'Energia absurda. Aqui não existe difícil: existe "bora".',
        },
      },
      cta: 'PRONTO PARA PERFORMAR',
    },
    welcomeScreen: {
      headline: 'SEJA BEM-VINDO, OUTLIER',
      subheadline: 'Pronto pra ser fora da curva?',
      coachCardIntro: 'O que você vai sentir nessa experiência:',
      bullets: [
        'Exigência máxima em cada treino',
        'Zero desculpas, foco total no resultado',
        'Progressão implacável rumo ao pódio',
      ],
      footer: 'Prepare-se. Vai doer, mas vai valer.',
      institutionalNote: 'O treino é definido pelo seu nível e pelo tempo que você tem. O estilo do treinador define como você recebe o feedback.',
    },
    settings: {
      coachStyleChangeNote: 'Trocar o estilo do treinador não altera o treino, apenas a forma de feedback e cobrança.',
      coachStyleChangeSubnote: 'Seu treino continua sendo ajustado pelo seu nível e tempo.',
    },
    dashboard: {
      workoutAdjustedNote: 'Treino ajustado pelo seu nível e pelo tempo disponível hoje.',
    },
    workoutComments: {
      preWorkout: [
        'Aquece direito. Depois é guerra.',
        'Hoje não é dia de passeio. É dia de trabalho.',
        'Foco. Execução. Resultado.',
      ],
      midWorkout: [
        'No meio você quer parar. É aí que você vira OUTLIER.',
        'Dor é temporária. O resultado fica.',
        'Continua. Sem drama.',
      ],
      postWorkout: [
        'Termina limpo. Padrão alto.',
        'Treino feito. Agora descansa com mérito.',
        'Missão cumprida. Amanhã tem mais.',
      ],
    },
    feedback: {
      elite: [
        'FORA DA CURVA. Isso é nível de quem compete de verdade.',
        'Performance absurda. Poucos chegam aí. Mantém.',
        'Você tá acima do topo. Não relaxa — domina.',
      ],
      great: [
        'CARALHO. É isso. Você mandou muito bem.',
        'Porra… execução limpa. Padrão alto. OUTLIER.',
        'Você fez o que poucos fazem. Mantém.',
      ],
      goodButMore: [
        'Pow, mano… dava pra fazer melhor do que isso.',
        'Foi ok. OUTLIER não vive de "ok".',
        'No próximo, você vai pra cima.',
      ],
      tough: [
        'Dia duro. Mas você apareceu. Isso conta.',
        'Hoje foi pesado. Corrige os detalhes e volta mais forte.',
        'Não foi seu dia, mas você não fugiu. Respeito.',
      ],
      bad: [
        'Hoje foi fraco. Sem drama: corrige e volta.',
        'Tá confortável demais. A conta chega.',
        'Quer resultado? Então aparece de verdade.',
      ],
      missed: [
        'Sumiu. OUTLIER não some.',
        'Sem treino, sem história. Amanhã você volta.',
        'Quer performance? Então executa. Simples.',
      ],
    },
    blockCompletion: {
      aquecimento: ['Aquecimento feito. Agora o trabalho começa.', 'Corpo preparado. Foco no que vem.'],
      conditioning: ['Etapa concluída. Mantenha o ritmo.', 'Bloco finalizado. Sem tempo pra descanso mental.'],
      forca: ['Força registrada. Continue construindo.', 'Bloco de força completo. Isso soma.'],
      especifico: ['Trabalho específico feito. É isso que diferencia.', 'Etapa crítica concluída.'],
      core: ['Core ativado. Fundação sólida.', 'Estabilidade garantida. Próximo.'],
      corrida: ['Corrida concluída. Pernas prontas.', 'Cardio na conta. Siga em frente.'],
      default: ['Feito. Próximo.', 'Concluído. Continue.'],
      final: ['Treino completo. Você fez o que precisava.', 'Missão cumprida. Descanse com mérito.'],
    },
  },

  PULSE: {
    selectCoachScreen: {
      title: 'Escolha o estilo do seu treinador.',
      subtitle: 'Não é tema. É personalidade. É o jeito que você vai evoluir.',
      cards: {
        IRON: {
          title: 'IRON',
          description: 'Duro. Direto. Sem desculpa. Padrão alto e cobrança pra performance.',
        },
        PULSE: {
          title: 'PULSE',
          description: 'Firme e humano. Constância com direção, sem quebrar seu corpo nem sua cabeça.',
        },
        SPARK: {
          title: 'SPARK',
          description: 'Energia absurda. Aqui não existe difícil: existe "bora".',
        },
      },
      cta: 'PRONTO PARA PERFORMAR',
    },
    welcomeScreen: {
      headline: 'SEJA BEM-VINDO, OUTLIER',
      subheadline: 'Pronto pra ser fora da curva?',
      coachCardIntro: 'O que você vai sentir nessa experiência:',
      bullets: [
        'Consistência como chave do sucesso',
        'Apoio constante na sua jornada',
        'Evolução sustentável e inteligente',
      ],
      footer: 'Um passo de cada vez. Juntos até o fim.',
      institutionalNote: 'O treino é definido pelo seu nível e pelo tempo que você tem. O estilo do treinador define como você recebe o feedback.',
    },
    settings: {
      coachStyleChangeNote: 'Trocar o estilo do treinador não altera o treino, apenas a forma de feedback e cobrança.',
      coachStyleChangeSubnote: 'Seu treino continua sendo ajustado pelo seu nível e tempo.',
    },
    dashboard: {
      workoutAdjustedNote: 'Treino ajustado pelo seu nível e pelo tempo disponível hoje.',
    },
    workoutComments: {
      preWorkout: [
        'Hoje é consistência. Sem pressa.',
        'Respira fundo. Você tá pronto.',
        'Cada treino conta. Vamos fazer valer.',
      ],
      midWorkout: [
        'Respira. Ajusta o ritmo. Continua.',
        'Você tá indo bem. Mantém o foco.',
        'Metade do caminho. Continue presente.',
      ],
      postWorkout: [
        'Boa. Recupera bem e volta amanhã.',
        'Treino feito. Isso é o que importa.',
        'Bom trabalho. Descanse com tranquilidade.',
      ],
    },
    feedback: {
      elite: [
        'Excepcional. Esse nível de execução é raro. Você está no topo.',
        'Performance de elite. Continue assim e os resultados vão se multiplicar.',
        'Impressionante. Consistência desse nível é o que separa os melhores.',
      ],
      great: [
        'Excelente. Você executou com controle e consistência.',
        'Muito bom. Isso é evolução real.',
        'Você fez do jeito certo. Agora é repetir.',
      ],
      goodButMore: [
        'Boa. Agora vamos subir um pouco a régua, com calma.',
        'Você tá no caminho. Ajusta 1 detalhe e melhora muito.',
        'Foi sólido. No próximo, mais intenção.',
      ],
      tough: [
        'Dia difícil, mas você estava lá. Isso é o que importa.',
        'Nem todo dia é bom, mas todo dia que você aparece conta.',
        'Foi pesado? Normal. A constância te leva mais longe que a intensidade.',
      ],
      bad: [
        'Hoje não foi seu melhor dia. Tudo bem. Vamos ajustar.',
        'O que pegou mais: sono, foco ou corpo?',
        'Isso não te define. Usa como dado e volta.',
      ],
      missed: [
        'Você não apareceu hoje. Tá tudo bem — vamos retomar amanhã.',
        'Sem culpa. Só compromisso. Um passo de cada vez.',
        'Amanhã: o mínimo possível. Só pra manter constância.',
      ],
    },
    blockCompletion: {
      aquecimento: ['Aquecimento concluído. Seu corpo agradece esse cuidado.', 'Boa preparação. Agora você está pronto.'],
      conditioning: ['Ótimo trabalho no conditioning. Você está construindo resistência.', 'Bloco desafiador concluído. Isso é consistência.'],
      forca: ['Força feita com presença. Cada rep conta.', 'Bloco de força completo. Você está mais forte.'],
      especifico: ['Trabalho específico feito. Evolução acontecendo.', 'Etapa importante concluída. Continue assim.'],
      core: ['Core trabalhado. Base sólida pra tudo.', 'Estabilidade em dia. Bom trabalho.'],
      corrida: ['Corrida concluída. Coração mais forte.', 'Cardio feito. Cada passo importa.'],
      default: ['Mais um bloco feito. Continue presente.', 'Concluído. Você está no caminho certo.'],
      final: ['Treino completo. Você apareceu e entregou. Isso é o que importa.', 'Finalizado. Descanse bem, você merece.'],
    },
  },

  SPARK: {
    selectCoachScreen: {
      title: 'Escolha o estilo do seu treinador.',
      subtitle: 'Não é tema. É personalidade. É o jeito que você vai evoluir.',
      cards: {
        IRON: {
          title: 'IRON',
          description: 'Duro. Direto. Sem desculpa. Padrão alto e cobrança pra performance.',
        },
        PULSE: {
          title: 'PULSE',
          description: 'Firme e humano. Constância com direção, sem quebrar seu corpo nem sua cabeça.',
        },
        SPARK: {
          title: 'SPARK',
          description: 'Energia absurda. Aqui não existe difícil: existe "bora".',
        },
      },
      cta: 'PRONTO PARA PERFORMAR',
    },
    welcomeScreen: {
      headline: 'SEJA BEM-VINDO, OUTLIER',
      subheadline: 'Pronto pra ser fora da curva?',
      coachCardIntro: 'O que você vai sentir nessa experiência:',
      bullets: [
        'Energia positiva em cada sessão',
        'Criatividade para superar desafios',
        'Diversão sem perder a intensidade',
      ],
      footer: 'Bora fazer acontecer! 🔥',
      institutionalNote: 'O treino é definido pelo seu nível e pelo tempo que você tem. O estilo do treinador define como você recebe o feedback.',
    },
    settings: {
      coachStyleChangeNote: 'Trocar o estilo do treinador não altera o treino, apenas a forma de feedback e cobrança.',
      coachStyleChangeSubnote: 'Seu treino continua sendo ajustado pelo seu nível e tempo.',
    },
    dashboard: {
      workoutAdjustedNote: 'Treino ajustado pelo seu nível e pelo tempo disponível hoje.',
    },
    workoutComments: {
      preWorkout: [
        'Bora! Hoje é dia de subir nível!',
        'Energia ON! Vamos destruir esse treino!',
        'Partiu evolução! 🔥',
      ],
      midWorkout: [
        'Tá doendo? Tá funcionando! VAMO!',
        'Metade! Agora acelera!',
        'Você tá voando! Mantém!',
      ],
      postWorkout: [
        'Acabou! Agora você tá mais forte. Simples assim!',
        'TREINO DONE! Isso foi INCRÍVEL!',
        'Arrasou! Descansa e volta com tudo amanhã!',
      ],
    },
    feedback: {
      great: [
        'VAMO! Você destruiu isso! 🔥',
        'ABSURDO! Você tá virando OUTLIER real!',
        'Que dia! Mantém essa pegada!',
      ],
      goodButMore: [
        'Foi bom! Agora bora subir mais um degrau!',
        'Tá quente! No próximo você vai voar!',
        'Curti! Agora mete mais 10%!',
      ],
      bad: [
        'Hoje foi osso? Beleza. Amanhã é revanche!',
        'Você não perdeu. Você coletou dado. Agora melhora!',
        'Sem drama: ajusta e volta mais forte!',
      ],
      missed: [
        'EI! Cadê você? Volta pro jogo! ⚡',
        'Um treino curtinho já muda teu dia!',
        'Hoje não rolou. Amanhã a gente amassa!',
      ],
    },
    blockCompletion: {
      aquecimento: ['Aquecimento check! 🔥 Bora pro show!', 'Corpo ligado! ✨ Vamos nessa!'],
      conditioning: ['ISSO AÍ! 💪 Arrasou no conditioning!', 'Boaaa! 🚀 Tá voando!'],
      forca: ['Força mode ON! 💪 Que fase!', 'Pesado demais! 🔥 Continua assim!'],
      especifico: ['Específico DONE! 🎯 Foco total!', 'Mandou bem! 🚀 É assim que se faz!'],
      core: ['Core ativado! 💪 Barriga de aço!', 'Check no core! ✨ Firme e forte!'],
      corrida: ['Corrida check! 🏃 Tá on fire!', 'Cardio feito! 🔥 Energia pura!'],
      default: ['Mais um! 💪 Vamo que vamo!', 'Check! ✨ Tá demais!'],
      final: ['TREINO COMPLETO! 🎉🔥 Você é incrível!', 'FINALIZOU! 🚀 Isso foi LINDO!'],
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Retorna o copy set do coach. Fallback: PULSE
 */
export function getCoachCopy(coachStyle?: CoachStyle | string): CoachCopySet {
  if (!coachStyle || !(coachStyle in COACH_COPY)) {
    return COACH_COPY.PULSE;
  }
  return COACH_COPY[coachStyle as CoachStyle];
}

/**
 * Retorna uma linha aleatória de uma categoria.
 * Interpola {name} se fornecido.
 */
export function getCoachLine(
  coachStyle: CoachStyle | string | undefined,
  category: keyof CoachCopySet['feedback'] | keyof CoachCopySet['workoutComments'],
  name?: string
): string {
  const copy = getCoachCopy(coachStyle);
  
  let lines: string[] = [];
  
  // Check feedback first
  if (category in copy.feedback) {
    lines = copy.feedback[category as keyof CoachCopySet['feedback']];
  }
  // Then check workoutComments
  else if (category in copy.workoutComments) {
    lines = copy.workoutComments[category as keyof CoachCopySet['workoutComments']];
  }
  
  if (lines.length === 0) {
    return 'Continue evoluindo.';
  }
  
  const line = lines[Math.floor(Math.random() * lines.length)];
  
  // Interpolate {name} if provided
  if (name) {
    return line.replace(/{name}/g, name);
  }
  
  return line;
}

/**
 * Retorna uma linha de completar bloco baseada no tipo e se é o último.
 */
export function getBlockCompletionLine(
  coachStyle: CoachStyle | string | undefined,
  blockType: string,
  isLastBlock: boolean
): string {
  const copy = getCoachCopy(coachStyle);
  const completions = copy.blockCompletion;
  
  if (isLastBlock) {
    const finalLines = completions.final;
    return finalLines[Math.floor(Math.random() * finalLines.length)];
  }
  
  const typeLines = completions[blockType as keyof typeof completions] || completions.default;
  return typeLines[Math.floor(Math.random() * typeLines.length)];
}

/**
 * Mapeia bucket de performance para categoria de feedback
 */
export function getBucketFeedbackCategory(bucket: string): keyof CoachCopySet['feedback'] {
  switch (bucket) {
    case 'ELITE':
    case 'STRONG':
      return 'great';
    case 'OK':
      return 'goodButMore';
    case 'TOUGH':
    case 'DNF':
      return 'bad';
    default:
      return 'goodButMore';
  }
}

// ============================================================================
// WORKOUT FOCUS COPY GENERATOR
// ============================================================================

type BlockType = 'aquecimento' | 'conditioning' | 'forca' | 'especifico' | 'core' | 'corrida' | 'notas';

interface WorkoutBlock {
  type: BlockType;
  isMainWod?: boolean;
  wodType?: string;
  title?: string;
}

/**
 * Analisa o tipo de bloco e retorna o foco dominante
 */
function getBlockFocus(block: WorkoutBlock): string {
  const type = block.type;
  const wodType = block.wodType;
  
  if (wodType === 'hyrox') return 'simulado HYROX';
  if (wodType === 'benchmark') return 'benchmark';
  if (wodType === 'strength') return 'força';
  if (wodType === 'engine') return 'resistência';
  if (wodType === 'skill') return 'técnica';
  
  switch (type) {
    case 'forca': return 'força';
    case 'conditioning': return 'condicionamento';
    case 'corrida': return 'corrida';
    case 'core': return 'core e estabilidade';
    case 'especifico': return 'trabalho específico';
    default: return 'condicionamento geral';
  }
}

/**
 * Copys dinâmicas por estilo de coach e foco do treino
 */
const FOCUS_COPY: Record<CoachStyle, Record<string, string[]>> = {
  IRON: {
    'força': [
      'Hoje é dia de carga. Sem desculpa.',
      'Força no foco. Execução perfeita.',
      'Dia de construir potência. Entrega total.',
    ],
    'resistência': [
      'Resistência no foco. Aguenta firme.',
      'Hoje o motor vai trabalhar. Sem parar.',
      'Prepara o fôlego. Vai precisar.',
    ],
    'condicionamento': [
      'Condicionamento pesado hoje. Foco.',
      'Trabalho de base. Sem atalhos.',
      'Capacidade geral no foco. Entrega.',
    ],
    'corrida': [
      'Hoje a corrida cobra. Responde.',
      'Pernas no trabalho. Ritmo constante.',
      'Run day. Cada metro conta.',
    ],
    'core e estabilidade': [
      'Core no foco. Fundação primeiro.',
      'Estabilidade em dia. Sem pular etapa.',
    ],
    'trabalho específico': [
      'Trabalho específico. Precisão máxima.',
      'Foco técnico. Detalhes importam.',
    ],
    'simulado HYROX': [
      'Simulado HYROX. Trata como prova.',
      'Race day mode. Sem piedade.',
    ],
    'benchmark': [
      'Benchmark hoje. É hora de medir.',
      'Teste de referência. Dá tudo.',
    ],
    'condicionamento geral': [
      'Trabalho geral hoje. Constância.',
      'Dia de treinar. Sem drama.',
    ],
  },
  PULSE: {
    'força': [
      'Hoje trabalhamos força com presença.',
      'Dia de construir. Cada rep conta.',
      'Força no foco. Qualidade antes de tudo.',
    ],
    'resistência': [
      'Resistência no programa. Ritmo sustentável.',
      'Hoje é sobre durar. Respira e continua.',
      'Motor em construção. Consistência.',
    ],
    'condicionamento': [
      'Condicionamento em foco. Você aguenta.',
      'Trabalho de base hoje. Importante.',
      'Capacidade geral. Passo a passo.',
    ],
    'corrida': [
      'Corrida no programa. Mantém o ritmo.',
      'Hoje é dia de correr. Com consciência.',
      'Pernas trabalhando. Cada passo importa.',
    ],
    'core e estabilidade': [
      'Core e estabilidade hoje. Base sólida.',
      'Fundação em dia. Isso sustenta tudo.',
    ],
    'trabalho específico': [
      'Trabalho específico hoje. Atenção aos detalhes.',
      'Foco técnico. Qualidade acima de volume.',
    ],
    'simulado HYROX': [
      'Simulado HYROX hoje. Trate com seriedade.',
      'Dia de testar o sistema. Confie no processo.',
    ],
    'benchmark': [
      'Benchmark hoje. Oportunidade de medir.',
      'Teste de referência. Faça o seu melhor.',
    ],
    'condicionamento geral': [
      'Treino geral hoje. Mantenha a consistência.',
      'Dia de aparecer e entregar. Simples assim.',
    ],
  },
  SPARK: {
    'força': [
      'Dia de FORÇA! 💪 Bora ficar mais forte!',
      'Hoje é pesado e é incrível! Vamo! 🔥',
      'Força no menu! Prepara que vai ser bom!',
    ],
    'resistência': [
      'Resistência ON! 🔥 Bora testar o motor!',
      'Hoje é aguenta firme e brilha! ⚡',
      'Engine day! Prepara o fôlego! 🚀',
    ],
    'condicionamento': [
      'Condicionamento pesado e eu amo! 💪',
      'Bora construir capacidade! Você consegue!',
      'Hoje o corpo agradece! Vamo! 🔥',
    ],
    'corrida': [
      'Run day! 🏃 Bora voar!',
      'Hoje é correr e curtir! ⚡',
      'Pernas no trabalho! Vamo que vamo! 🔥',
    ],
    'core e estabilidade': [
      'Core day! 💪 Barriga de aço vindo aí!',
      'Estabilidade em foco! Fundação forte! ✨',
    ],
    'trabalho específico': [
      'Trabalho específico! 🎯 Foco total!',
      'Detalhes importam! Bora refinar! ⚡',
    ],
    'simulado HYROX': [
      'SIMULADO HYROX! 🔥 É dia de prova!',
      'Race mode ON! Trata como se fosse de verdade! 🚀',
    ],
    'benchmark': [
      'BENCHMARK! 🎯 Hora de medir sua evolução!',
      'Teste hoje! Bora bater recorde! 🔥',
    ],
    'condicionamento geral': [
      'Treino geral e eu amo! 💪 Bora!',
      'Hoje é dia de evoluir! Vamo! 🔥',
    ],
  },
};

/**
 * Gera a copy dinâmica para o treino do dia baseada no WOD principal
 */
export function getWorkoutFocusCopy(
  coachStyle: CoachStyle | string | undefined,
  todayWorkout: WorkoutBlock[] | null | undefined,
  hasWorkout: boolean
): string {
  // Se não tem treino
  if (!hasWorkout || !todayWorkout || todayWorkout.length === 0) {
    return 'Nenhum treino programado para hoje.';
  }
  
  // Encontrar o WOD principal
  const mainWod = todayWorkout.find(block => block.isMainWod);
  const targetBlock = mainWod || todayWorkout.find(block => 
    block.type !== 'aquecimento' && block.type !== 'notas'
  ) || todayWorkout[0];
  
  if (!targetBlock) {
    return 'Nenhum treino programado para hoje.';
  }
  
  // Obter o foco do treino
  const focus = getBlockFocus(targetBlock);
  
  // Obter o estilo normalizado
  const style = (coachStyle?.toUpperCase() as CoachStyle) || 'PULSE';
  const validStyle = ['IRON', 'PULSE', 'SPARK'].includes(style) ? style : 'PULSE';
  
  // Obter as copys para o estilo e foco
  const styleCopys = FOCUS_COPY[validStyle as CoachStyle];
  const focusCopys = styleCopys[focus] || styleCopys['condicionamento geral'];
  
  // Retornar uma copy aleatória
  return focusCopys[Math.floor(Math.random() * focusCopys.length)];
}
