import type { DayWorkout, WorkoutBlock } from '@/types/outlier';

// Mapeamento de substituições de equipamentos
const EQUIPMENT_SUBSTITUTIONS: Record<string, string> = {
  // Sled
  'sled': 'Lunges com peso',
  'sled push': 'Lunges com peso',
  'sled pull': 'Farmer Carry',
  
  // SkiErg
  'skierg': 'Assault Bike ou Mountain Climbers',
  'ski erg': 'Assault Bike ou Mountain Climbers',
  'ski': 'Assault Bike ou Mountain Climbers',
  
  // Rower
  'rower': 'Assault Bike ou Burpees',
  'remo': 'Assault Bike ou Burpees',
  'row': 'Assault Bike ou Burpees',
  
  // Bike
  'assault bike': 'Remo ou Running',
  'bike': 'Remo ou Running',
  'airbike': 'Remo ou Running',
  'air bike': 'Remo ou Running',
};

// Mapeia IDs para palavras-chave a procurar
const EQUIPMENT_KEYWORDS: Record<string, string[]> = {
  'sled': ['sled', 'sled push', 'sled pull'],
  'skierg': ['skierg', 'ski erg', 'ski'],
  'rower': ['rower', 'remo', 'row'],
  'bike': ['assault bike', 'bike', 'airbike', 'air bike'],
};

interface AdaptationResult {
  adapted: boolean;
  substitutions: string[];
  noSubstitutionItems: string[];
}

/**
 * Aplica substituições de equipamento no conteúdo de um bloco
 */
function substituteEquipmentInContent(
  content: string,
  unavailableEquipment: string[]
): { content: string; substitutions: string[]; noSub: string[] } {
  const substitutions: string[] = [];
  const noSub: string[] = [];
  let modified = content;

  for (const equipmentId of unavailableEquipment) {
    const keywords = EQUIPMENT_KEYWORDS[equipmentId] || [equipmentId];
    
    let found = false;
    for (const keyword of keywords) {
      // Regex case-insensitive para o equipamento
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      
      if (regex.test(modified)) {
        const substitute = EQUIPMENT_SUBSTITUTIONS[keyword.toLowerCase()];
        if (substitute) {
          const primarySubstitute = substitute.split(' ou ')[0].trim();
          substitutions.push(`${keyword.toUpperCase()} → ${primarySubstitute}`);
          modified = modified.replace(regex, primarySubstitute);
          found = true;
        }
      }
    }
    
    if (!found) {
      // Equipamento não encontrado no conteúdo - pode não precisar de substituição
      // Não adicionamos a noSub a menos que realmente exista no conteúdo original
    }
  }

  return { content: modified, substitutions, noSub };
}

/**
 * Adapta um workout completo substituindo equipamentos indisponíveis
 */
export function adaptWorkoutForEquipment(
  workout: DayWorkout,
  unavailableEquipment: string[]
): { 
  workout: DayWorkout; 
  result: AdaptationResult;
} {
  if (!unavailableEquipment || unavailableEquipment.length === 0) {
    return {
      workout,
      result: { adapted: false, substitutions: [], noSubstitutionItems: [] },
    };
  }

  const allSubstitutions: string[] = [];
  const noSubItems: string[] = [];

  const adaptedBlocks: WorkoutBlock[] = workout.blocks.map((block) => {
    // Adaptar conteúdo principal
    const { content: adaptedContent, substitutions, noSub } = substituteEquipmentInContent(
      block.content,
      unavailableEquipment
    );

    allSubstitutions.push(...substitutions);
    noSubItems.push(...noSub);

    // Se houver levelVariants, adaptar cada um também
    let adaptedLevelVariants = block.levelVariants;
    if (block.levelVariants) {
      adaptedLevelVariants = {};
      for (const [level, variant] of Object.entries(block.levelVariants)) {
        if (variant) {
          const { content: adaptedVariantContent } = substituteEquipmentInContent(
            variant.content,
            unavailableEquipment
          );
          adaptedLevelVariants[level as keyof typeof block.levelVariants] = {
            ...variant,
            content: adaptedVariantContent,
          };
        }
      }
    }

    return {
      ...block,
      content: adaptedContent,
      levelVariants: adaptedLevelVariants,
    };
  });

  return {
    workout: {
      ...workout,
      blocks: adaptedBlocks,
    },
    result: {
      adapted: allSubstitutions.length > 0,
      substitutions: [...new Set(allSubstitutions)], // Remover duplicatas
      noSubstitutionItems: [...new Set(noSubItems)],
    },
  };
}
