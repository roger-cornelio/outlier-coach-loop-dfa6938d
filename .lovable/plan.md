

## Plano: Atualizar mensagem verde com referência a relógios

### Mudança

**Arquivo: `src/components/TextModelImporter.tsx`**

Alterar o texto do popover para badges verdes (≥70%) de:

> "Cálculo feito pelo motor físico. Mantenha esse formato de escrita para manter a precisão. A margem restante é da própria IA, não do seu texto."

Para:

> "Cálculo feito pelo motor físico — com precisão superior à medição de relógios como Garmin, Apple Watch e Amazfit. Mantenha esse formato de escrita para manter essa precisão. A margem restante é da própria IA, não do seu texto."

Também será aplicado o fix do `<button>` no `PopoverTrigger` para que o clique funcione (conforme plano anterior aprovado).

