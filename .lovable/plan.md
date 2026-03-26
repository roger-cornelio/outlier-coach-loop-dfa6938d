

## Plano: Definir nome do perfil admin

### Problema
O perfil de `roger.bm2016@gmail.com` tem o campo `name` como `null` no banco de dados. O código já está correto — ele exibe `· {nome}` quando o nome existe.

### Solução
Executar uma migração para atualizar o nome do perfil:

```sql
UPDATE profiles SET name = 'Roger' WHERE email = 'roger.bm2016@gmail.com';
```

Após isso, o header da sidebar mostrará **ADMIN · Roger** automaticamente.

