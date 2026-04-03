

## O que vamos implementar — Resumo em Português

### P0 — Mudanças de Alto Impacto (fazem a maior diferença)

**1. Streak de Treinos 🔥**
Um contador que mostra quantos dias seguidos o atleta treinou. Aparece no Dashboard como um badge de fogo. Se o atleta treina 3 dias seguidos, vê "🔥 3". Se treina 7 dias, vê uma mensagem motivacional. Pular um dia de descanso não quebra a sequência. Isso é o mecanismo de retenção número 1 de apps fitness — cria o hábito de "não quero perder meu streak".

**2. Celebração ao Completar Treino 🎉**
Quando o atleta termina o último bloco do treino, antes de ir para o resumo, aparece uma tela de celebração por 2.5 segundos com partículas animadas, texto "TREINO COMPLETO!" e vibração no celular. Hoje o app simplesmente pula para o feedback — falta aquele momento de recompensa emocional.

**3. Barra de Navegação no Rodapé do Celular**
Substituir o menu hamburger (que exige 2 toques para navegar) por uma barra fixa no rodapé com 5 ícones: Dashboard, Treino, Evolução, Provas e Config. É o padrão de apps como Strava e Nike Training. O atleta navega com um toque só, usando o polegar naturalmente.

---

### P1 — Refinamentos de Polish

**4. Telas de Carregamento com Esqueleto**
Em vez do ícone girando genérico enquanto carrega, mostrar "fantasmas" dos cards reais — retângulos cinza pulsando no formato do conteúdo que vai aparecer. Dá sensação de que o app é mais rápido e mais profissional.

**5. Telas Vazias com Personalidade**
Quando não há dados (sem treino publicado, sem provas registradas), em vez de "Nenhum dado encontrado", mostrar um ícone grande, uma mensagem explicativa e um botão de ação. Exemplo: "Seu coach ainda não publicou o treino desta semana — Ver semana anterior".

**6. Transições Suaves entre Telas**
Adicionar uma animação sutil de deslizar para cima (slide-up) quando o atleta muda de tela. Hoje a troca é instantânea — com a transição, dá sensação de app nativo.

**7. Botão de Modo Escuro**
Na tela de Configurações do atleta, adicionar um toggle para ativar/desativar modo escuro. Atletas que treinam de manhã cedo ou à noite preferem tela escura.

---

### Impacto Esperado

- **Streak + Celebração** criam dopamina e hábito → atleta abre o app todo dia
- **Bottom nav** reduz fricção de navegação → atleta explora mais funcionalidades
- **Skeleton + Empty states** passam profissionalismo → confiança no produto
- **Dark mode** atende preferência pessoal → satisfação

Nenhuma dessas mudanças altera o banco de dados — tudo funciona no celular do usuário.

