

## Plano: Corrigir projeção negativa para atletas Elite

### O que está acontecendo?
O sistema tem um "piso" fixo de 1 hora (3600 segundos) programado internamente. Quando um atleta Elite já tem um tempo **abaixo de 1 hora** (ex: 59:15), o sistema calcula que o "tempo projetado" seria 1:00:00 — que é **pior** do que o tempo atual. Isso gera aquele número negativo na tela (-7:-45).

### O que vamos fazer?

**1. Remover o piso artificial de 1 hora**
O sistema não vai mais travar em 1:00:00. Se o atleta já faz 59 minutos, a projeção vai continuar calculando normalmente para baixo (58min, 57min, etc).

**2. Proteger contra números negativos**
Mesmo que algum cálculo dê resultado estranho, o sistema nunca vai mostrar valores negativos. O mínimo será sempre zero.

**3. Mensagem especial para atletas de Elite**
Quando o ganho projetado for muito pequeno (menos de 1 minuto em 12 meses — o que é normal para quem já está no topo), ao invés de mostrar "ganho de 4 segundos", vamos exibir uma mensagem tipo:

> **"Performance de Elite"** — Seu tempo já é referência. A evolução agora está nos detalhes: consistência, transições e execução sob fadiga.

### Onde mexemos?
- No cálculo de projeção (remover o piso de 1h)
- Na tela de diagnóstico gratuito (proteger contra negativos)
- No card de projeção de evolução (mesma proteção + mensagem Elite)

### Resultado esperado
Atletas sub-1h não verão mais números negativos. Verão uma mensagem que reconhece seu nível e orienta sobre o que realmente importa nessa fase.

