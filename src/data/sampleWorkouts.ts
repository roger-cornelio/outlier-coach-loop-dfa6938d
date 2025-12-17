import type { DayWorkout } from '@/types/outlier';

export const sampleWeeklyWorkouts: DayWorkout[] = [
  {
    day: 'seg',
    stimulus: 'Força + Capacidade Aeróbia',
    estimatedTime: 60,
    blocks: [
      {
        id: 'seg-1',
        type: 'aquecimento',
        title: '🔥 AQUECIMENTO',
        content: `3 Rounds:
• 500m Row (ritmo leve)
• 10 Air Squats
• 10 Push-ups
• 10 Ring Rows`,
      },
      {
        id: 'seg-2',
        type: 'forca',
        title: '💪 FORÇA - Back Squat',
        content: `5x5 Back Squat @ 75-80%
Rest 2-3min entre séries

Foco: Controle excêntrico, explosão concêntrica`,
      },
      {
        id: 'seg-3',
        type: 'conditioning',
        title: '⚡ CONDITIONING',
        content: `For Time:
21-15-9
• Thrusters (42.5/30kg)
• Pull-ups

CAP: 12 min`,
        isMainWod: true,
        referenceTime: {
          iniciante: 720,
          intermediario: 540,
          avancado: 420,
          hyrox_pro: 360,
        },
      },
      {
        id: 'seg-4',
        type: 'core',
        title: '🎯 CORE',
        content: `3 Rounds:
• 30s Hollow Hold
• 15 V-ups
• 30s Side Plank (cada lado)`,
      },
    ],
  },
  {
    day: 'ter',
    stimulus: 'HYROX Específico - Sled + Corrida',
    estimatedTime: 75,
    blocks: [
      {
        id: 'ter-1',
        type: 'aquecimento',
        title: '🔥 AQUECIMENTO',
        content: `2 Rounds:
• 400m Run (progressivo)
• 10 Lunges
• 10 Burpees
• 20 Mountain Climbers`,
      },
      {
        id: 'ter-2',
        type: 'especifico',
        title: '🛷 ESPECÍFICO HYROX',
        content: `4 Rounds For Time:
• 1km Run
• 50m Sled Push (152/102kg)
• 50m Sled Pull (103/78kg)

Rest 3min entre rounds`,
        isMainWod: true,
        referenceTime: {
          iniciante: 2400,
          intermediario: 1800,
          avancado: 1500,
          hyrox_pro: 1200,
        },
      },
      {
        id: 'ter-3',
        type: 'notas',
        title: '📝 NOTAS',
        content: `Mantenha pace consistente na corrida.
Sled: técnica > velocidade.
Monitore FC entre rounds.`,
      },
    ],
  },
  {
    day: 'qua',
    stimulus: 'Recovery Ativo + Técnica',
    estimatedTime: 45,
    blocks: [
      {
        id: 'qua-1',
        type: 'aquecimento',
        title: '🔥 MOBILIDADE',
        content: `15min Flow:
• Cat-Cow
• World's Greatest Stretch
• Hip 90/90
• T-Spine Rotations`,
      },
      {
        id: 'qua-2',
        type: 'conditioning',
        title: '🚣 TÉCNICA ERG',
        content: `Remo - Drills:
4x500m @ conversational pace
Focus: Drive legs → lean back → pull arms

Rest 1min entre sets`,
      },
      {
        id: 'qua-3',
        type: 'core',
        title: '🎯 CORE ESTABILIZAÇÃO',
        content: `3 Rounds (não por tempo):
• 45s Dead Bug
• 45s Bird Dog (alternando)
• 45s Pallof Press Hold`,
      },
    ],
  },
  {
    day: 'qui',
    stimulus: 'Potência + MetCon Curto',
    estimatedTime: 60,
    blocks: [
      {
        id: 'qui-1',
        type: 'aquecimento',
        title: '🔥 AQUECIMENTO',
        content: `3 Rounds:
• 200m Run
• 5 Inch Worms
• 10 KB Swings (leve)
• 5 Broad Jumps`,
      },
      {
        id: 'qui-2',
        type: 'forca',
        title: '💪 POTÊNCIA - Power Clean',
        content: `EMOM 12:
Min 1: 3 Power Cleans @ 70%
Min 2: 6 Box Jumps (explosivos)
Min 3: Rest`,
      },
      {
        id: 'qui-3',
        type: 'conditioning',
        title: '⚡ AMRAP 15',
        content: `AMRAP 15:
• 15 Wall Balls (9/6kg)
• 12 Toes to Bar
• 9 Burpee Box Jump Overs
• 200m Run`,
        isMainWod: true,
        referenceTime: {
          iniciante: 900,
          intermediario: 900,
          avancado: 900,
          hyrox_pro: 900,
        },
      },
    ],
  },
  {
    day: 'sex',
    stimulus: 'Capacidade Aeróbia Longa',
    estimatedTime: 90,
    blocks: [
      {
        id: 'sex-1',
        type: 'aquecimento',
        title: '🔥 AQUECIMENTO',
        content: `10min Easy:
• 500m Row
• 500m Bike
• 200m Run`,
      },
      {
        id: 'sex-2',
        type: 'conditioning',
        title: '⚡ AEROBIC CAPACITY',
        content: `For Time:
5km Row
+ 50 Burpees
+ 2km Bike
+ 50 Wall Balls
+ 1km Run

Pace: Sustentável. Não sprint.`,
        isMainWod: true,
        referenceTime: {
          iniciante: 3600,
          intermediario: 2700,
          avancado: 2400,
          hyrox_pro: 2100,
        },
      },
      {
        id: 'sex-3',
        type: 'notas',
        title: '📝 NOTAS',
        content: `Este é um teste de resistência mental.
Quebre em chunks mentais.
Hidrate durante o treino.`,
      },
    ],
  },
  {
    day: 'sab',
    stimulus: 'HYROX Simulation',
    estimatedTime: 90,
    blocks: [
      {
        id: 'sab-1',
        type: 'aquecimento',
        title: '🔥 AQUECIMENTO',
        content: `15min Progressive:
• 1km Easy Run
• Dynamic Stretching
• Movement Prep específico`,
      },
      {
        id: 'sab-2',
        type: 'especifico',
        title: '🏆 HYROX SIMULATION',
        content: `8 Rounds For Time:
• 1km Run
• Estação Alternada:
  R1: 1km SkiErg
  R2: 50m Sled Push
  R3: 50m Sled Pull
  R4: 80m Burpee Broad Jump
  R5: 1km Row
  R6: 200m Farmers Carry
  R7: 100m Sandbag Lunges
  R8: 75/100 Wall Balls`,
        isMainWod: true,
        referenceTime: {
          iniciante: 5400,
          intermediario: 4500,
          avancado: 3900,
          hyrox_pro: 3600,
        },
      },
    ],
  },
  {
    day: 'dom',
    stimulus: 'Recovery Total',
    estimatedTime: 30,
    blocks: [
      {
        id: 'dom-1',
        type: 'notas',
        title: '😴 DESCANSO ATIVO',
        content: `Opções:
• 30-45min caminhada leve
• Yoga/Stretching
• Foam Rolling
• Sauna/Banho gelado

Foco: Recuperação para a próxima semana.`,
      },
    ],
  },
];
