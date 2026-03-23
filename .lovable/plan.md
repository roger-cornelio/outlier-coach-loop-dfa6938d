

## Plano: Adicionar link "Já sou Coach" no header da Landing Page

### Problema

O header fixo da Landing só tem "Já sou atleta →" apontando para `/login`. Falta o equivalente para coaches acessarem `/login/coach`.

### Alteração

| Arquivo | O que muda |
|---|---|
| `src/pages/Landing.tsx` | Adicionar link "Já sou Coach →" no header, ao lado de "Já sou atleta", apontando para `/login/coach` |

### Detalhes

- Dois links no header: "Já sou Coach" e "Já sou Atleta", ambos com mesmo estilo (`font-display text-xs tracking-widest text-muted-foreground`)
- Separados por um divider sutil (`border-r border-border/40`)
- Mantém layout compacto no mobile

