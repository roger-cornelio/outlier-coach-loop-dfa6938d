

## Plano: Alerta automático para vendedor quando lead completa diagnóstico

### Problema
Hoje o lead completa o diagnóstico e os dados são salvos silenciosamente na tabela `diagnostic_leads`. O vendedor só descobre quando abre manualmente o CRM. Isso atrasa o follow-up e reduz a conversão.

### Solução
Criar um sistema de notificação automática via WhatsApp (ou webhook genérico) que dispara em tempo real quando um novo lead é inserido na tabela `diagnostic_leads`, enviando os dados relevantes para o vendedor agir em menos de 2 horas.

### Arquitetura

```text
Lead completa diagnóstico
        │
        ▼
INSERT diagnostic_leads  ──►  DB Trigger  ──►  Edge Function
                                                    │
                                                    ▼
                                            Webhook (WhatsApp/
                                            Slack/URL genérica)
                                                    │
                                                    ▼
                                            Vendedor recebe alerta
                                            com dados do lead
```

### Passos

**1. Adicionar colunas úteis à tabela `diagnostic_leads`**
- `telefone` (text) — salvar telefone do lead direto na tabela para o vendedor ter na mão
- `total_time_seconds` (integer) — tempo total da prova para contexto
- `notified` (boolean, default false) — controle de envio

**2. Atualizar `DiagnosticoGratuito.tsx`**
- Incluir `telefone` e `total_time_seconds` no INSERT da `diagnostic_leads`
- Dados já estão disponíveis no momento do insert (variáveis `telefone` e `scrapeData.time_in_seconds`)

**3. Criar Edge Function `notify-new-diagnostic-lead`**
- Recebe os dados do lead (nome, evento, divisão, telefone, tempo)
- Envia para um webhook configurável (URL armazenada como secret `DIAGNOSTIC_WEBHOOK_URL`)
- Formato: POST JSON com dados formatados para fácil leitura
- Inclui link direto para WhatsApp do lead (`https://wa.me/55{telefone}`)

**4. Criar DB Trigger na tabela `diagnostic_leads`**
- `AFTER INSERT` dispara a edge function via `pg_net`
- Passa os dados do novo lead como payload
- Trigger marca `notified = true` após envio

**5. Melhorar a tab "Leads Diagnóstico" no CRM**
- Adicionar coluna de telefone com botão de WhatsApp direto
- Adicionar coluna de tempo total da prova
- Badge visual "Novo" para leads das últimas 2h (não notificados/não vistos)
- Ordenação padrão: mais recentes primeiro (já existe)

**6. Secret de configuração**
- Pedir ao usuário a URL do webhook (`DIAGNOSTIC_WEBHOOK_URL`) — pode ser:
  - Webhook do n8n que envia WhatsApp
  - URL de um bot no Telegram
  - Webhook do Slack
  - Qualquer endpoint HTTP POST

### Payload do webhook
```json
{
  "lead_name": "João Silva",
  "event": "HYROX São Paulo 2026",
  "division": "Men Pro",
  "total_time": "1:12:34",
  "telefone": "(11) 99999-0000",
  "whatsapp_link": "https://wa.me/5511999990000",
  "diagnostic_url": "https://results.hyrox.com/...",
  "created_at": "2026-04-04T14:30:00Z"
}
```

### Resultado
- Vendedor recebe alerta instantâneo com todos os dados do lead
- Link de WhatsApp pronto para ligar/enviar mensagem
- CRM mostra visualmente quais leads são novos e precisam de ação
- Webhook genérico permite conectar com qualquer ferramenta de automação

