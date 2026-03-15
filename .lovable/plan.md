

## Periodização OUTLIER — Bloco de Direcionamento no Dashboard

### O que muda

O bloco atual "Direcionamento" no dashboard (BLOCO 8 do `DiagnosticRadarBlock`) será transformado em **"Periodização OUTLIER"** — um bloco que vende ao atleta a ideia de que há uma direção clara e personalizada para os treinos da próxima semana, baseada nos gargalos identificados no diagnóstico.

### Como funciona hoje
- O bloco "Direcionamento" exibe o campo `direcionamento` da IA (cache do `diagnostico_resumo`), que é uma frase genérica tipo "Concentre-se em dominar o ritmo de corrida sob fadiga..."
- Esse texto é o mesmo gerado pelo prompt do "Protocolo de Choque" no Raio X

### O que será feito

**1. Novo texto no dashboard (front-end only)**

Substituir o bloco "Direcionamento" por "Periodização OUTLIER" com um texto dinâmico construído a partir dos dados já disponíveis no componente (`worstStations`), sem precisar de nova chamada à IA.

Lógica:
- Pegar os top 2-3 gargalos do `worstStations` (que já estão ordenados por prioridade)
- Construir uma frase genérica mas personalizada: *"Os treinos da próxima semana serão focados em **Corrida** e **Sled Push**, os pontos com maior potencial de evolução identificados no seu diagnóstico."*
- Fallback sem dados: *"Importe sua primeira prova para receber periodização personalizada."*

**2. Arquivo a editar:** `src/components/DiagnosticRadarBlock.tsx`

- Substituir o `useMemo` do `trainingFocus` (linhas ~2103-2109) por uma lógica que usa `worstStations` filtrados (stars < 5, top 3) para gerar o texto
- Atualizar o BLOCO 8 (linhas ~2585-2589): trocar label "Direcionamento" → "Periodização OUTLIER", ícone e estilo visual mais premium (gradiente sutil, tipografia display)

**3. Formato do texto gerado**

```text
Periodização OUTLIER:
"Os treinos da próxima semana serão focados em [Gargalo 1] e [Gargalo 2],
os pontos com maior potencial de evolução no seu perfil."
```

- Se houver 1 gargalo: "focados em **X**"
- Se houver 2+: "focados em **X** e **Y**"
- Sem gargalos: "focados em desenvolver todas as capacidades de forma equilibrada"

### Detalhes técnicos

- Não precisa de nova edge function nem chamada IA — os dados de `worstStations` já estão calculados no componente
- O campo `direcionamento` do cache da IA continua sendo usado na tela de diagnóstico completo (Raio X), mas **não** no dashboard
- Zero impacto em schema ou migrations

