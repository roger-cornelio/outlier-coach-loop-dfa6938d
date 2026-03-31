

## Fluxo Completo de Onboarding — Explicação

O onboarding tem duas fases: a fase de diagnóstico (para quem tem prova HYROX) e a fase de cadastro (obrigatória para todos).

### Fase 1 — Diagnóstico (opcional, só para quem tem prova)

```text
Busca → Resultado → Gargalos → Chamada para ação
  ↕         ↕           ↕              ↕
  —       Busca      Resultado    Gargalos/Resultado
```

1. **Busca** — O atleta digita seu nome para encontrar resultados de provas HYROX
2. **Resultado** — Mostra o tempo da prova e a posição no ranking
3. **Gargalos** — Exibe os 3 maiores pontos fracos identificados nos dados da prova
4. **Chamada para ação** — Tela motivacional: "Pronto para ser fora da curva?"

Cada tela tem um botão "Voltar" que retorna à tela anterior (indicado pelas setas verticais ↕).

---

### Fase 2 — Cadastro (todos passam por aqui)

```text
CTA → Biometria → Experiência → Objetivo → Motivacional → Coach → Plano → FIM
 ↕        ↕            ↕            ↕            ↕            ↕       ↕
 —    CTA/Busca    Biometria    Experiência    Objetivo    Motivacional  Coach
```

1. **CTA** — Tela de chamada para ação (ponto de entrada para quem não tem prova)
2. **Biometria** — Dados simples: peso, altura, idade, sexo, estilo de coach, tempo disponível
3. **Experiência** — Nível de experiência com HYROX (nunca fez, já fez provas, etc.)
4. **Objetivo** — O que o atleta quer alcançar (completar, melhorar tempo, pódio, etc.)
5. **Motivacional** — Tela de reforço antes das escolhas finais
6. **Coach** — Escolha do treinador + tela de confirmação de solicitação
7. **Plano** — Escolha entre ESSENCIAL (open) ou PERFORMANCE (pro)
8. **FIM** — Salva tudo no banco e vai para o dashboard

O botão "Voltar" de cada tela retorna exatamente à tela anterior na sequência (indicado pela linha de baixo do diagrama).

---

### Resumo da lógica

- **Quem tem prova**: passa pelas 4 telas de diagnóstico primeiro, depois entra na fase de cadastro
- **Quem não tem prova**: pula direto para a fase de cadastro a partir do CTA
- **Todos os dados são salvos de uma vez só** no final, quando o atleta clica "CONTINUAR" na tela de plano

