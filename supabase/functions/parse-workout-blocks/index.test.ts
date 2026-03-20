import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/parse-workout-blocks`;

interface ParsedExercise {
  slug: string;
  name: string;
  movementPatternSlug?: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  loadKg?: number;
  intensityType?: string;
  intensityValue?: number;
  restSeconds?: number;
  notes?: string;
}

interface BlockResult {
  blockId: string;
  parsedExercises: ParsedExercise[];
  parseStatus: string;
}

async function callParser(blocks: Array<{ blockId: string; blockType: string; content: string; title?: string }>): Promise<BlockResult[]> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ blocks }),
  });
  const body = await res.text();
  assertEquals(res.status, 200, `Expected 200, got ${res.status}: ${body}`);
  const parsed = JSON.parse(body);
  return parsed.results;
}

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 1: Força Tradicional — Front Squat 4x8 @50kg
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 1: Força Tradicional - Front Squat 4x8 @50kg", async () => {
  const results = await callParser([{
    blockId: "test-forca-1",
    blockType: "STRENGTH",
    title: "Força",
    content: "Front Squat 4x8 @50kg - descanso 90s",
  }]);

  assertEquals(results.length, 1);
  const block = results[0];
  assertEquals(block.parseStatus, "completed");
  assertEquals(block.parsedExercises.length, 1);

  const ex = block.parsedExercises[0];
  console.log("📊 Cenário 1 - Front Squat:", JSON.stringify(ex, null, 2));
  
  assertEquals(ex.slug, "front_squat", `Slug esperado: front_squat, recebido: ${ex.slug}`);
  assertEquals(ex.movementPatternSlug, "squat", `Pattern esperado: squat, recebido: ${ex.movementPatternSlug}`);
  assertEquals(ex.sets, 4, `Sets esperado: 4, recebido: ${ex.sets}`);
  assertEquals(ex.reps, 8, `Reps esperado: 8, recebido: ${ex.reps}`);
  assertEquals(ex.loadKg, 50, `Load esperado: 50, recebido: ${ex.loadKg}`);
  assertEquals(ex.restSeconds, 90, `Rest esperado: 90, recebido: ${ex.restSeconds}`);
});

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 2: ROUNDS — 3 rounds de 400m Run + KB Swings + Pull-ups
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 2: 3 ROUNDS - Run + KB + Pull-ups", async () => {
  const results = await callParser([{
    blockId: "test-rounds-1",
    blockType: "ROUNDS",
    title: "3 ROUNDS",
    content: "400m Run\n21 KB Swings (24kg)\n12 Pull-ups",
  }]);

  const block = results[0];
  assertEquals(block.parseStatus, "completed");
  assertEquals(block.parsedExercises.length, 3, `Esperado 3 exercícios, recebido: ${block.parsedExercises.length}`);

  const [run, kb, pullup] = block.parsedExercises;
  console.log("📊 Cenário 2 - Run:", JSON.stringify(run));
  console.log("📊 Cenário 2 - KB:", JSON.stringify(kb));
  console.log("📊 Cenário 2 - Pullup:", JSON.stringify(pullup));

  // Run: deve ser distance_cardio com 400m, sets=1 (engine multiplica)
  assertEquals(run.movementPatternSlug, "distance_cardio", `Run pattern: ${run.movementPatternSlug}`);
  assertEquals(run.distanceMeters, 400, `Run distância: ${run.distanceMeters}`);
  assertEquals(run.sets, 1, `Run sets deve ser 1 (engine multiplica): ${run.sets}`);

  // KB: hinge, 21 reps, 24kg, sets=1
  assertEquals(kb.reps, 21, `KB reps: ${kb.reps}`);
  assertEquals(kb.loadKg, 24, `KB load: ${kb.loadKg}`);
  assertEquals(kb.sets, 1, `KB sets deve ser 1: ${kb.sets}`);

  // Pull-ups: pull, 12 reps, sets=1
  assertEquals(pullup.reps, 12, `Pullup reps: ${pullup.reps}`);
  assertEquals(pullup.sets, 1, `Pullup sets deve ser 1: ${pullup.sets}`);
});

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 3: AMRAP 15' — Burpees + Wall Balls
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 3: AMRAP 15' - Burpees + Wall Balls", async () => {
  const results = await callParser([{
    blockId: "test-amrap-1",
    blockType: "FIXED_TIME",
    title: "AMRAP 15'",
    content: "10 Burpees\n15 Wall Balls (9kg)",
  }]);

  const block = results[0];
  assertEquals(block.parseStatus, "completed");
  assertEquals(block.parsedExercises.length, 2);

  const [burpees, wb] = block.parsedExercises;
  console.log("📊 Cenário 3 - Burpees:", JSON.stringify(burpees));
  console.log("📊 Cenário 3 - Wall Balls:", JSON.stringify(wb));

  // AMRAP: IA NÃO deve setar durationSeconds nos exercícios
  assertEquals(burpees.durationSeconds, undefined, `Burpees NÃO deve ter durationSeconds em AMRAP: ${burpees.durationSeconds}`);
  assertEquals(wb.durationSeconds, undefined, `WB NÃO deve ter durationSeconds em AMRAP: ${wb.durationSeconds}`);
  assertEquals(burpees.sets, 1, `Burpees sets=1 em AMRAP: ${burpees.sets}`);
  assertEquals(wb.loadKg, 9, `WB load: ${wb.loadKg}`);
});

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 4: Cardio Distance — 1000m Remo
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 4: Cardio Distance - 1000m Remo", async () => {
  const results = await callParser([{
    blockId: "test-cardio-dist-1",
    blockType: "CARDIO",
    title: "Cardio",
    content: "1000m Remo",
  }]);

  const block = results[0];
  const ex = block.parsedExercises[0];
  console.log("📊 Cenário 4 - Remo:", JSON.stringify(ex));

  assertEquals(ex.slug, "rowing", `Slug esperado: rowing, recebido: ${ex.slug}`);
  assertEquals(ex.movementPatternSlug, "distance_cardio", `Pattern: ${ex.movementPatternSlug}`);
  assertEquals(ex.distanceMeters, 1000, `Distância: ${ex.distanceMeters}`);
});

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 5: Assault Bike — deve ser assault_bike, NÃO distance_cardio
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 5: Assault Bike 20 cal", async () => {
  const results = await callParser([{
    blockId: "test-assault-1",
    blockType: "CARDIO",
    title: "Cardio",
    content: "20 cal Assault Bike",
  }]);

  const block = results[0];
  const ex = block.parsedExercises[0];
  console.log("📊 Cenário 5 - Assault Bike:", JSON.stringify(ex));

  assertEquals(ex.slug, "assault_bike", `Slug esperado: assault_bike, recebido: ${ex.slug}`);
  assertEquals(ex.movementPatternSlug, "assault_bike", `Pattern esperado: assault_bike, recebido: ${ex.movementPatternSlug}`);
  // NÃO deve ser distance_cardio
  if (ex.movementPatternSlug === "distance_cardio") {
    throw new Error("❌ ERRO CRÍTICO: Assault Bike classificado como distance_cardio! Isso causaria cálculo ACSM incorreto.");
  }
});

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 6: Assault Bike por tempo
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 6: Assault Bike 15min", async () => {
  const results = await callParser([{
    blockId: "test-assault-2",
    blockType: "CARDIO",
    title: "Cardio",
    content: "Assault Bike 15min",
  }]);

  const block = results[0];
  const ex = block.parsedExercises[0];
  console.log("📊 Cenário 6 - Assault Bike 15min:", JSON.stringify(ex));

  assertEquals(ex.slug, "assault_bike", `Slug: ${ex.slug}`);
  assertEquals(ex.movementPatternSlug, "assault_bike", `Pattern: ${ex.movementPatternSlug}`);
  assertEquals(ex.durationSeconds, 900, `Duration esperado: 900, recebido: ${ex.durationSeconds}`);
});

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 7: Corrida contínua Z2 30min
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 7: Corrida contínua 30min Z2", async () => {
  const results = await callParser([{
    blockId: "test-run-z2",
    blockType: "CARDIO",
    title: "Cardio",
    content: "Corrida contínua 30min Z2",
  }]);

  const block = results[0];
  const ex = block.parsedExercises[0];
  console.log("📊 Cenário 7 - Corrida Z2:", JSON.stringify(ex));

  assertEquals(ex.slug, "running", `Slug: ${ex.slug}`);
  assertEquals(ex.movementPatternSlug, "distance_cardio", `Pattern: ${ex.movementPatternSlug}`);
  assertEquals(ex.durationSeconds, 1800, `Duration: ${ex.durationSeconds}`);
  assertEquals(ex.intensityType, "zone", `Intensity type: ${ex.intensityType}`);
  assertEquals(ex.intensityValue, 2, `Intensity value: ${ex.intensityValue}`);
});

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 8: EMOM 12min — IA NÃO deve setar durationSeconds
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 8: EMOM 12min - Wall Balls + Burpees", async () => {
  const results = await callParser([{
    blockId: "test-emom-1",
    blockType: "FIXED_TIME",
    title: "EMOM 12min",
    content: "Min 1 - 15 Wall Balls (9kg)\nMin 2 - 12 Burpees",
  }]);

  const block = results[0];
  assertEquals(block.parsedExercises.length, 2);

  const [wb, burpees] = block.parsedExercises;
  console.log("📊 Cenário 8 - WB:", JSON.stringify(wb));
  console.log("📊 Cenário 8 - Burpees:", JSON.stringify(burpees));

  // EMOM: IA NÃO deve setar durationSeconds
  assertEquals(wb.durationSeconds, undefined, `WB NÃO deve ter durationSeconds em EMOM: ${wb.durationSeconds}`);
  assertEquals(burpees.durationSeconds, undefined, `Burpees NÃO deve ter durationSeconds em EMOM: ${burpees.durationSeconds}`);
});

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 9: Treino complexo real — múltiplos blocos
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 9: Treino completo real - Aquecimento + Força + WOD", async () => {
  const results = await callParser([
    {
      blockId: "aquecimento",
      blockType: "WARMUP",
      title: "Aquecimento",
      content: "500m Row\n20 Air Squats\n10 Push-ups",
    },
    {
      blockId: "forca",
      blockType: "STRENGTH",
      title: "Força",
      content: "Back Squat 5x5 @80kg - descanso 2min",
    },
    {
      blockId: "wod",
      blockType: "ROUNDS",
      title: "5 ROUNDS",
      content: "200m Run\n15 KB Swings (20kg)\n10 Box Jumps",
    },
  ]);

  assertEquals(results.length, 3, `Esperado 3 blocos, recebido: ${results.length}`);
  
  // Aquecimento
  const aq = results[0];
  console.log("📊 Cenário 9 - Aquecimento:", JSON.stringify(aq.parsedExercises.map(e => `${e.slug}(${e.movementPatternSlug})`)));
  assertEquals(aq.parseStatus, "completed");
  assertEquals(aq.parsedExercises.length, 3);

  // Força
  const forca = results[1];
  console.log("📊 Cenário 9 - Força:", JSON.stringify(forca.parsedExercises[0]));
  assertEquals(forca.parsedExercises[0].sets, 5);
  assertEquals(forca.parsedExercises[0].reps, 5);
  assertEquals(forca.parsedExercises[0].loadKg, 80);

  // WOD: todos com sets=1 (engine multiplica por 5)
  const wod = results[2];
  console.log("📊 Cenário 9 - WOD:", JSON.stringify(wod.parsedExercises.map(e => `${e.slug}(sets=${e.sets})`)));
  for (const ex of wod.parsedExercises) {
    assertEquals(ex.sets, 1, `WOD exercício ${ex.slug} deve ter sets=1: ${ex.sets}`);
  }
});

// ════════════════════════════════════════════════════════════════════════
// CENÁRIO 10: Descanso — deve retornar array vazio
// ════════════════════════════════════════════════════════════════════════
Deno.test("Cenário 10: Dia de descanso - array vazio", async () => {
  const results = await callParser([{
    blockId: "test-rest",
    blockType: "REST",
    title: "Descanso",
    content: "Hoje é dia de descanso ativo. Alongamento livre e mobilidade.",
  }]);

  const block = results[0];
  console.log("📊 Cenário 10 - Descanso:", JSON.stringify(block.parsedExercises));
  assertEquals(block.parsedExercises.length, 0, `Descanso deve retornar 0 exercícios: ${block.parsedExercises.length}`);
});
