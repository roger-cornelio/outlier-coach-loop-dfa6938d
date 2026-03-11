

## Problema

Quando o atleta seleciona uma prova oficial HYROX da busca (ex: "HYROX São Paulo"), o modal abre uma tela de confirmação com campos editáveis (nome, estado, cidade, categoria, data). Isso não faz sentido porque:

1. **Dados já completos** — provas oficiais HYROX já têm nome, cidade, país e data preenchidos no banco
2. **Permite o atleta alterar dados oficiais** — ele pode mudar o nome ou cidade de uma prova oficial, o que é incorreto
3. **Bug de duplicação** — o nome "HYROX São Paulo" + cidade "São Paulo" gera "HYROX SÃO PAULO SÃO PAULO 2026"

## Solução

Quando o evento selecionado é uma prova oficial completa (tem nome, data e cidade), pular a tela de detalhes e ir direto para o salvamento, pedindo apenas a **categoria** (que é do atleta, não da prova).

### Mudanças em `ProvaFormModal.tsx`

1. **`handleSelectEvent`**: Se o evento tem todos os dados (nome, data, cidade), ir para um novo modo `'confirm'` em vez de `'details'`
2. **Novo modo `'confirm'`**: Tela simplificada mostrando resumo da prova (nome, data, local) como informação read-only, com apenas o select de **Categoria HYROX** e o botão **Salvar**
3. **Fix do nome duplicado**: No modo confirm, usar `event.nome` diretamente + cidade + ano, aplicando a lógica anti-burro corretamente (o problema atual é que `nomeBase` recebe "HYROX São Paulo" que já contém a cidade)
4. **Manter modo `'details'` para eventos incompletos** ou provas manuais que precisam de edição

### Fluxo final

```text
[Buscar prova] → clica "HYROX São Paulo" →
  Tela simples:
    ┌─────────────────────────────┐
    │ HYROX SÃO PAULO 2026       │
    │ 📍 São Paulo, BR            │
    │ 📅 25 de abril de 2026      │
    │                             │
    │ Categoria HYROX *           │
    │ [Select ▾]                  │
    │                             │
    │ [Voltar]  [Salvar Prova]    │
    └─────────────────────────────┘
```

