# Password Reset (for server admins)

Se o e-mail de reset de senha não estiver chegando, provavelmente o SMTP não está configurado corretamente no servidor remoto. Abaixo estão as opções para resolver.

## 1. Verificar configuração de e-mail no servidor

As variáveis de ambiente que controlam o envio de e-mail:

| Variável | Descrição |
|---|---|
| `NEXT_PRIVATE_SMTP_HOST` | Host do servidor SMTP |
| `NEXT_PRIVATE_SMTP_PORT` | Porta do SMTP |
| `NEXT_PRIVATE_SMTP_USERNAME` | Usuário SMTP |
| `NEXT_PRIVATE_SMTP_PASSWORD` | Senha SMTP |
| `NEXT_PRIVATE_SMTP_APIKEY` | API key (transporte smtp-api) |
| `NEXT_PRIVATE_RESEND_API_KEY` | API key do Resend |
| `NEXT_PRIVATE_MAILCHANNELS_API_KEY` | API key do MailChannels |
| `NEXT_PRIVATE_SMTP_FROM_NAME` | Nome do remetente (padrão: "BchatSign") |
| `NEXT_PRIVATE_SMTP_FROM_ADDRESS` | E-mail do remetente (padrão: "noreply@bchatsign.com") |

Verifique se essas variáveis estão definidas corretamente no `.env` do servidor remoto.

## 2. Resetar senha direto no banco de dados

Caso precise resetar a senha sem depender de e-mail, é possível alterar diretamente no PostgreSQL.

O sistema usa **`@node-rs/bcrypt`** com **12 salt rounds**. O hash gerado começa com `$2b$12$...`.

### Via Node.js no servidor

```bash
# Na pasta do projeto, execute:
node -e "
const { hash } = require('@node-rs/bcrypt');
const pass = 'NovaSenha@123';
hash(pass, 12).then(h => console.log(h));
"
```

Copie o hash gerado e conecte no banco:

```bash
psql "$NEXT_PRIVATE_DATABASE_URL"
```

```sql
UPDATE "User" SET password = '<hash-gerado>' WHERE email = 'seu-email@exemplo.com';
```

### Via Docker (alternativa)

Se não quiser instalar dependências localmente:

```bash
docker run --rm -it node:20 bash -c "
npm install @node-rs/bcrypt -g && node -e \"
const { hash } = require('@node-rs/bcrypt');
hash('NovaSenha@123', 12).then(h => console.log(h));
\"
"
```

### Via npx (alternativa mais simples)

```bash
npx -p @node-rs/bcrypt node -e "
const { hash } = require('@node-rs/bcrypt');
hash('NovaSenha@123', 12).then(h => console.log(h));
"
```

Depois de atualizar o banco, faça login com a nova senha normalmente.

## 3. Debug do envio de e-mail

Para diagnosticar problemas de SMTP, veja os logs do servidor ao clicar em "Forgot Password" — o erro de SMTP deve aparecer nos logs do servidor.
