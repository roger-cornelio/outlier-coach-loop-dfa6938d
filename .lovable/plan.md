

## Plano: Cronômetro por Bloco + Simplificação de Registros

### O que muda

**1. Cada bloco ganha seu próprio cronômetro**
- Em vez de clicar no botão de "concluído" e preencher tempo manualmente, o atleta clica em **"INICIAR"** no bloco
- Um cronômetro começa a contar dentro do bloco (formato MM:SS), visualmente integrado
- Quando termina, clica em **"FINALIZAR"** — o tempo é capturado automaticamente
- Após finalizar, o atleta pode editar o tempo manualmente caso queira corrigir (ex: esqueceu de parar)

**2. Blocos que NÃO pedem métricas**
- Blocos de tipo `aquecimento`, `core`, `notas` continuam como hoje: auto-complete sem pedir nada
- Blocos de `EMOM` e `força` agora também ganham cronômetro próprio em vez de só pedir confirmação — o tempo registrado vem do cronômetro

**3. Blocos de AMRAP**
- Ganham cronômetro próprio igual aos outros
- **Além disso**, continuam pedindo o número de rounds/repetições após finalizar o cronômetro

**4. Blocos FOR TIME**
- Ganham cronômetro próprio — o tempo vem do cronômetro automaticamente
- Removido o input manual de min:seg como método primário (mas o atleta pode editar depois de parar)

### Fluxo visual do bloco

```text
[Estado inicial]
  Título do bloco + exercícios
  [ ▶ INICIAR ]

[Cronômetro rodando]
  Título do bloco + exercícios
  ⏱ 03:45 (contando)
  [ ⏹ FINALIZAR ]

[Finalizado]
  Título do bloco + exercícios
  Tempo: 04:12  [✏️ editar]
  (Se AMRAP: input de rounds aparece aqui)
  [ ✓ REGISTRAR ]
```

### O que NÃO muda
- Cronômetro geral da sessão (continua no topo)
- Blocos auto-complete (aquecimento, core, notas)
- Dados salvos no store (`SessionBlockResult`)
- Feedback de performance

### Arquivos modificados
- `src/components/WorkoutExecution.tsx` — cronômetro por bloco, novo fluxo de início/fim, input de edição manual, remoção do input de tempo FOR TIME

