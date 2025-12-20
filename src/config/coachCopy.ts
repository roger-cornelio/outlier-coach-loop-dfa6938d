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
  };
  workoutComments: {
    preWorkout: string[];
    midWorkout: string[];
    postWorkout: string[];
  };
  feedback: {
    great: string[];        // arrebentou / PR
    goodButMore: string[];  // bom, mas dava pra mais
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
      title: 'Escolha quem vai te guiar.',
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
      subheadline: 'A partir de agora, você é OUTLIER. Sem espaço pra mediocridade.',
      coachCardIntro: 'O que você vai sentir nessa experiência:',
      bullets: [
        'Exigência máxima em cada treino',
        'Zero desculpas, foco total no resultado',
        'Progressão implacável rumo ao pódio',
      ],
      footer: 'Prepare-se. Vai doer, mas vai valer.',
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
      title: 'Escolha quem vai te guiar.',
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
      subheadline: 'A partir de agora, você é OUTLIER. Um passo de cada vez.',
      coachCardIntro: 'O que você vai sentir nessa experiência:',
      bullets: [
        'Consistência como chave do sucesso',
        'Apoio constante na sua jornada',
        'Evolução sustentável e inteligente',
      ],
      footer: 'Um passo de cada vez. Juntos até o fim.',
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
      title: 'Escolha quem vai te guiar.',
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
      subheadline: 'A partir de agora, você é OUTLIER. Bora fazer acontecer!',
      coachCardIntro: 'O que você vai sentir nessa experiência:',
      bullets: [
        'Energia positiva em cada sessão',
        'Criatividade para superar desafios',
        'Diversão sem perder a intensidade',
      ],
      footer: 'Bora fazer acontecer! 🔥',
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
