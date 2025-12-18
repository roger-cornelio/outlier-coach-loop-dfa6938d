/**
 * Estimador de duração de treino baseado em parsing de texto
 * 
 * MVP: Extrai volumes do conteúdo textual e calcula tempo estimado
 * usando pacing padrão para cada tipo de exercício.
 */

// Pacing padrão (segundos por unidade)
const PACING = {
  // Cardio
  corrida: 360 / 1000, // 6:00/km = 0.36s/m
  remo: 130 / 500,     // 2:10/500m = 0.26s/m
  skierg: 140 / 500,   // 2:20/500m = 0.28s/m
  bike: 5,             // 5s/cal (12 cal/min)
  
  // Movimentos
  wallBall: 3.3,       // 3.3s/rep (18 reps/min)
  burpee: 5,           // 5s/rep (12 reps/min)
  
  // Sled/Carry
  lunge: 2.7,          // 2.7s/m (22 m/min)
  farmer: 1.7,         // 1.7s/m (35 m/min)
  sled: 3.3,           // 3.3s/m (18 m/min)
  
  // Default para reps genéricas
  genericRep: 3,       // 3s/rep (20 reps/min)
} as const;

// Transição entre exercícios (segundos)
const TRANSITION_TIME = 12;

interface ExtractedItem {
  type: string;
  value: number;
  unit: string;
  seconds: number;
}

interface EstimationResult {
  totalMinutes: number;
  itemsFound: number;
  breakdown: ExtractedItem[];
}

/**
 * Extrai padrões de volume do texto do treino
 */
function extractPatterns(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const lowerText = text.toLowerCase();
  
  // Padrões de distância (metros)
  const distancePatterns = [
    // Remo: "1000m Remo", "500 m Row", "Remo 2000m"
    { regex: /(\d+)\s*m\s*(remo|row)/gi, type: 'remo', pacing: PACING.remo },
    { regex: /(remo|row)\s*(\d+)\s*m/gi, type: 'remo', pacing: PACING.remo, valueGroup: 2 },
    
    // SkiErg: "1000m SkiErg", "Ski 500m"
    { regex: /(\d+)\s*m\s*(skierg|ski\s*erg|ski)/gi, type: 'skierg', pacing: PACING.skierg },
    { regex: /(skierg|ski\s*erg|ski)\s*(\d+)\s*m/gi, type: 'skierg', pacing: PACING.skierg, valueGroup: 2 },
    
    // Corrida: "1000m Corrida", "Run 800m", "800m Run"
    { regex: /(\d+)\s*m\s*(corrida|run|running)/gi, type: 'corrida', pacing: PACING.corrida },
    { regex: /(corrida|run|running)\s*(\d+)\s*m/gi, type: 'corrida', pacing: PACING.corrida, valueGroup: 2 },
    
    // Sled Push/Pull: "25m Sled Push", "Sled Pull 50m"
    { regex: /(\d+)\s*m\s*(sled\s*push|sled\s*pull|sled)/gi, type: 'sled', pacing: PACING.sled },
    { regex: /(sled\s*push|sled\s*pull|sled)\s*(\d+)\s*m/gi, type: 'sled', pacing: PACING.sled, valueGroup: 2 },
    
    // Farmer Carry: "50m Farmer", "Farmer Carry 100m"
    { regex: /(\d+)\s*m\s*(farmer|farmer\s*carry)/gi, type: 'farmer', pacing: PACING.farmer },
    { regex: /(farmer|farmer\s*carry)\s*(\d+)\s*m/gi, type: 'farmer', pacing: PACING.farmer, valueGroup: 2 },
    
    // Lunge: "25m Lunge", "Walking Lunge 50m"
    { regex: /(\d+)\s*m\s*(lunge|walking\s*lunge)/gi, type: 'lunge', pacing: PACING.lunge },
    { regex: /(lunge|walking\s*lunge)\s*(\d+)\s*m/gi, type: 'lunge', pacing: PACING.lunge, valueGroup: 2 },
  ];

  // Padrões de calorias (bike)
  const caloriePatterns = [
    // "50 cal Bike", "Assault Bike 30 cal", "Air Bike 40cal"
    { regex: /(\d+)\s*cal\s*(bike|assault\s*bike|air\s*bike|echo\s*bike|assault)/gi, type: 'bike', pacing: PACING.bike },
    { regex: /(bike|assault\s*bike|air\s*bike|echo\s*bike|assault)\s*(\d+)\s*cal/gi, type: 'bike', pacing: PACING.bike, valueGroup: 2 },
  ];

  // Padrões de repetições específicas
  const repPatterns = [
    // Wall Ball: "50 Wall Balls", "30 Wall Ball"
    { regex: /(\d+)\s*(wall\s*balls?)/gi, type: 'wallBall', pacing: PACING.wallBall },
    
    // Burpees: "15 Burpees", "10 Burpee"
    { regex: /(\d+)\s*(burpees?|burpee\s*box\s*jump\s*overs?|bar\s*facing\s*burpees?)/gi, type: 'burpee', pacing: PACING.burpee },
  ];

  // Processar padrões de distância
  for (const pattern of distancePatterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      const valueGroup = pattern.valueGroup || 1;
      const value = parseInt(match[valueGroup], 10);
      if (!isNaN(value) && value > 0) {
        items.push({
          type: pattern.type,
          value,
          unit: 'm',
          seconds: value * pattern.pacing + TRANSITION_TIME,
        });
      }
    }
  }

  // Processar padrões de calorias
  for (const pattern of caloriePatterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      const valueGroup = pattern.valueGroup || 1;
      const value = parseInt(match[valueGroup], 10);
      if (!isNaN(value) && value > 0) {
        items.push({
          type: pattern.type,
          value,
          unit: 'cal',
          seconds: value * pattern.pacing + TRANSITION_TIME,
        });
      }
    }
  }

  // Processar padrões de reps específicas
  for (const pattern of repPatterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      const value = parseInt(match[1], 10);
      if (!isNaN(value) && value > 0) {
        items.push({
          type: pattern.type,
          value,
          unit: 'reps',
          seconds: value * pattern.pacing + TRANSITION_TIME,
        });
      }
    }
  }

  // Padrão genérico de reps: "15 reps", "20 repetições"
  const genericRepRegex = /(\d+)\s*(reps?|repetições?|repetições)/gi;
  let genericMatch;
  while ((genericMatch = genericRepRegex.exec(text)) !== null) {
    const value = parseInt(genericMatch[1], 10);
    if (!isNaN(value) && value > 0) {
      items.push({
        type: 'generic',
        value,
        unit: 'reps',
        seconds: value * PACING.genericRep + TRANSITION_TIME,
      });
    }
  }

  return items;
}

/**
 * Detecta multiplicador de rounds (AMRAP, For Time, rounds)
 */
function detectRoundsMultiplier(text: string): number {
  const lowerText = text.toLowerCase();
  
  // "X rounds", "X rodadas"
  const roundsMatch = lowerText.match(/(\d+)\s*(rounds?|rodadas?)/);
  if (roundsMatch) {
    return parseInt(roundsMatch[1], 10) || 1;
  }
  
  // "For Time" sem rounds especificados = 1
  if (lowerText.includes('for time')) {
    return 1;
  }
  
  // AMRAP estima 3 rounds em média
  if (lowerText.includes('amrap')) {
    return 3;
  }
  
  return 1;
}

/**
 * Estima duração do treino a partir do conteúdo textual
 */
export function estimateWorkoutTime(workoutContent: string | string[]): EstimationResult {
  // Normalizar entrada
  const text = Array.isArray(workoutContent) 
    ? workoutContent.join('\n') 
    : workoutContent;
  
  // Extrair itens
  const items = extractPatterns(text);
  
  // Detectar multiplicador de rounds
  const roundsMultiplier = detectRoundsMultiplier(text);
  
  // Somar segundos
  const baseSeconds = items.reduce((sum, item) => sum + item.seconds, 0);
  const totalSeconds = baseSeconds * roundsMultiplier;
  const totalMinutes = Math.ceil(totalSeconds / 60);
  
  // Debug log em dev mode
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 estimateWorkoutTime breakdown:', {
      itemsFound: items.length,
      roundsMultiplier,
      baseSeconds,
      totalSeconds,
      totalMinutes,
      items: items.map(i => `${i.type}: ${i.value}${i.unit} = ${Math.round(i.seconds)}s`),
    });
  }
  
  return {
    totalMinutes,
    itemsFound: items.length,
    breakdown: items,
  };
}

/**
 * Estima duração total de um array de blocos de treino
 */
export function estimateBlocksTime(blocks: Array<{ content: string; durationMinutes?: number }>): number {
  let totalMinutes = 0;
  
  for (const block of blocks) {
    const estimation = estimateWorkoutTime(block.content);
    
    // Se encontrou padrões, usa estimativa; senão, usa durationMinutes se existir
    if (estimation.itemsFound > 0) {
      totalMinutes += estimation.totalMinutes;
    } else if (block.durationMinutes && block.durationMinutes > 0) {
      totalMinutes += block.durationMinutes;
    }
  }
  
  return totalMinutes;
}

/**
 * Estima duração de um DayWorkout
 */
export function estimateDayWorkoutTime(dayWorkout: { blocks: Array<{ content: string; durationMinutes?: number }> }): number {
  return estimateBlocksTime(dayWorkout.blocks);
}
