

## Plano: Botao de Login Rapido na Landing Page

### Problema
A landing e otimizada para novos usuarios (funil diagnostico), mas atletas que ja tem conta precisam de um acesso rapido visivel — hoje nao ha nenhum link de login na pagina.

### Solucao
Adicionar um link discreto mas visivel no topo direito da landing (header fixo) com texto tipo "Ja sou atleta" ou "Entrar", sem competir com o CTA principal de diagnostico.

### Implementacao

**Arquivo: `src/pages/Landing.tsx`**

- Adicionar um header fixo/sticky no topo com:
  - Logo Outlier (esquerda)
  - Link "Ja sou atleta → Entrar" (direita) apontando para `/login`
  - Estilo discreto: texto `text-muted-foreground hover:text-primary`, sem background pesado, apenas um underline ou seta
- O header fica `fixed top-0` com `z-50` e background semi-transparente (`bg-background/80 backdrop-blur`)

### Visual esperado

```text
┌──────────────────────────────────────────────┐
│  ◆ OUTLIER                   Já sou atleta → │  ← header fixo, discreto
├──────────────────────────────────────────────┤
│                                              │
│           Performance que separa             │
│               ◆ OUTLIER ◆                    │
│                do comum                      │
│                                              │
│          [ RECEBER DIAGNÓSTICO ]             │  ← CTA principal intocado
│                                              │
└──────────────────────────────────────────────┘
```

### Detalhes
- 1 arquivo editado: `src/pages/Landing.tsx`
- Zero mudanca de logica, apenas UI
- O CTA de diagnostico continua sendo o protagonista

