

## Plano: Substituir "gargalo(s)" por "pontos fracos" em todo o projeto

Trocar todas as ocorrências visíveis ao usuário da palavra "gargalo/gargalos" por "pontos fracos". Variáveis internas (nomes de variáveis JS) ficam inalteradas pois não são visíveis.

### Arquivos e alterações

**1. `src/pages/Landing.tsx`**
- Linha 90: `"...nos seus gargalos reais"` → `"...nos seus pontos fracos reais"`
- Linha 117: `"...descubra seus gargalos em segundos"` → `"...descubra seus pontos fracos em segundos"`

**2. `src/pages/DiagnosticoGratuito.tsx`**
- Linha 223: `"...pontos fortes e gargalos"` → `"...pontos fortes e pontos fracos"`
- Linha 362: `"SEUS GARGALOS"` → `"SEUS PONTOS FRACOS"`
- Linha 449: `"...revelou gargalos reais"` → `"...revelou pontos fracos reais"`

**3. `src/components/WelcomeScreen.tsx`**
- Linha 6 (comentário): `"gargalos"` → `"pontos fracos"`
- Linha 677: `"...para seus gargalos"` → `"...para seus pontos fracos"`

**4. `src/pages/ImportarProva.tsx`**
- Linha 550: `"...seus gargalos de prova"` → `"...seus pontos fracos de prova"`

**5. `src/components/DiagnosticRadarBlock.tsx`**
- Linha 1137 (comentário): `"GARGALOS"` → `"PONTOS FRACOS"`
- Linha 1158: `"Gargalos de performance"` → `"Pontos fracos de performance"`
- Linha 1160: `"...ver seus gargalos"` → `"...ver seus pontos fracos"`
- Linha 1178: `"Gargalos de performance"` → `"Pontos fracos de performance"`

**6. `src/components/diagnostico/ParecerPremium.tsx`**
- Linha 120: `"O seu maior gargalo atual"` → `"O seu maior ponto fraco atual"`

**7. Edge functions (prompts de IA)** — manter como está, pois são instruções internas para o modelo e não copy visível ao usuário.

Total: ~12 substituições em 6 arquivos de frontend.

