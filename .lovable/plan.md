

## Busca automatica de resultados HYROX pelo nome do atleta

### Visao Geral

Criar um fluxo onde o app busca automaticamente os resultados do atleta no site results.hyrox.com usando o nome cadastrado no perfil, exibindo uma lista de resultados encontrados para o atleta selecionar e importar.

### Como funciona o site HYROX

O site results.hyrox.com usa um formulario POST para buscar resultados por nome (Last Name + First Name). O formulario envia dados para:
- URL: `https://results.hyrox.com/season-{N}/?pid=list&pidp=ranking_nav`
- Campos: `search[name]`, `search[firstname]`, `search[sex]`, `event_main_group`, etc.

Cada temporada tem um endpoint diferente (season-1 a season-8). Precisamos buscar nas temporadas mais recentes.

### Plano de Implementacao

#### 1. Nova Edge Function: `search-hyrox-athlete`

- Recebe `firstName`, `lastName` e `gender` (M/W)
- Faz POST no site HYROX simulando o formulario de busca (seasons 8 e 7, ou seja, 25/26 e 24/25)
- Usa o modelo AI (gemini-2.5-flash) para parsear o HTML da tabela de resultados e extrair:
  - Nome do atleta
  - Evento (ex: "2025 Sao Paulo")
  - Division (HYROX / HYROX PRO)
  - Tempo final
  - Link do resultado individual (com o parametro `idp`)
- Retorna um array de resultados encontrados

#### 2. Atualizar `ImportarProva.tsx` - Novo fluxo em 3 etapas

**Etapa 1 - Busca automatica (nova)**
- Ao abrir a pagina, se o atleta tem nome cadastrado, mostra: "Buscando seus resultados HYROX..."
- Exibe lista de resultados encontrados com: evento, tempo, categoria
- Cada resultado tem um botao "Importar este resultado"
- Opcao "Nao encontrou? Cole o link manualmente" para manter o fluxo atual

**Etapa 2 - Importacao (existente)**
- Quando o atleta seleciona um resultado (ou cola um link), procede com o fluxo atual:
  - Chama `scrape-hyrox-result` para extrair splits detalhados
  - Salva em `benchmark_results`
  - Calcula percentis
  - Mostra tela de sucesso

**Etapa 3 - Sucesso (existente)**
- Mesma tela de sucesso atual

#### 3. Detalhes Tecnicos

**Edge Function `search-hyrox-athlete`:**
```text
POST /season-8/?pid=list&pidp=ranking_nav
Content-Type: application/x-www-form-urlencoded

event_main_group=%25 (todas as provas)
event=%25 (todas as divisoes)
search[name]=Sobrenome
search[firstname]=Nome
search[sex]=M
num_results=25
```

- Busca em 2 temporadas (season-8 e season-7) em paralelo
- Usa AI para parsear tabela HTML de resultados
- Retorna array com: `event_name`, `time_formatted`, `division`, `result_url`

**Split do nome do atleta:**
- Pega o `name` do perfil (ex: "Roger Machado")
- Primeiro token = firstName, restante = lastName
- Se nome tem apenas 1 token, usa como lastName e firstName vazio

**UI da lista de resultados:**
- Cards com icone de medalha, nome do evento, tempo e categoria
- Checkbox de autorizacao antes de importar
- Loading state com spinner durante a busca
- Estado vazio: "Nenhum resultado encontrado" + campo manual de link

