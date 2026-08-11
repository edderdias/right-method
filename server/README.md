# Método Certo — Auth API

Backend de autenticação do Método Certo (NestJS + PostgreSQL/Prisma + Redis + JWT). Este serviço é independente do frontend (`../src`) e não deve ser confundido com ele — nenhum arquivo do frontend foi alterado para criar este backend.

## Stack

Node 22, NestJS 10, TypeScript, PostgreSQL (Prisma ORM), Redis (ioredis), JWT (`@nestjs/jwt` + `passport-jwt`), Argon2id para senhas, `class-validator`/`class-transformer`, `@nestjs/throttler` (com storage Redis), Nodemailer, Swagger.

## Como rodar localmente

```bash
cd server
cp .env.example .env        # ajuste os secrets se quiser
docker compose up -d postgres redis mailhog
npm install
npm run prisma:migrate      # cria o schema no Postgres
npm run start:dev           # http://localhost:3333/api — docs em http://localhost:3333/docs
```

Mailhog (SMTP fake para dev) expõe sua UI em **http://localhost:8025** — é lá que você vê os e-mails de verificação/recuperação de senha enviados localmente.

## Testes

```bash
npm test                    # unitários (mocks; não precisa de infra)
npm run test:cov            # unitários com cobertura

# e2e (precisa dos containers rodando e de um banco de testes dedicado):
docker compose exec postgres psql -U right_method -d postgres -c "CREATE DATABASE right_method_auth_test"
DATABASE_URL="postgresql://right_method:right_method@localhost:5432/right_method_auth_test?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://right_method:right_method@localhost:5432/right_method_auth_test?schema=public" npm run test:e2e
```

O e2e roda o fluxo completo register → verify-email (lendo o token do Mailhog) → login → me → refresh (com rotação) → logout, batendo em endpoints HTTP reais via supertest.

```bash
npm run lint
npm run typecheck
```

## Endpoints (`/api/auth/...`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/register` | pública | Cria o usuário (status `PENDING`) e envia e-mail de verificação |
| POST | `/auth/login` | pública | Autentica; retorna `accessToken`, `refreshToken`, `expiresIn`, `user` |
| POST | `/auth/logout` | Bearer | Revoga a sessão do refresh token informado no corpo |
| POST | `/auth/logout-all` | Bearer | Revoga todas as sessões do usuário |
| POST | `/auth/refresh` | pública* | Troca um refresh token válido por um novo par (rotação) |
| POST | `/auth/forgot-password` | pública | Sempre responde genérico; dispara e-mail se o usuário existir |
| POST | `/auth/reset-password` | pública | Consome o token de reset, troca a senha, revoga todas as sessões |
| POST | `/auth/verify-email` | pública | Confirma o e-mail e ativa a conta (`PENDING` → `ACTIVE`) |
| POST | `/auth/resend-verification` | pública | Reenvia o e-mail de verificação (resposta sempre genérica) |
| GET | `/auth/me` | Bearer | Retorna o usuário autenticado |
| GET | `/auth/sessions` | Bearer | Lista sessões ativas (ip, user-agent, criada em, expira em) |
| DELETE | `/auth/sessions/:id` | Bearer | Revoga uma sessão específica do próprio usuário |

\* `/auth/refresh` não exige Bearer token (o próprio refresh token no corpo já autentica a chamada).

Todas as rotas fora dessa lista (os futuros módulos financeiros) já nascem **protegidas por padrão** — o `JwtAuthGuard` é global; use `@Public()` explicitamente para abrir uma rota nova.

### Formato de resposta

Sucesso:
```json
{ "success": true, "message": "...", "data": { } }
```
Erro:
```json
{ "success": false, "message": "...", "code": "INVALID_CREDENTIALS" }
```

Códigos de erro usados: `INVALID_CREDENTIALS`, `EMAIL_ALREADY_EXISTS`, `ACCOUNT_BLOCKED`, `ACCOUNT_INACTIVE`, `EMAIL_NOT_VERIFIED`, `TOO_MANY_ATTEMPTS`, `INVALID_TOKEN`, `SESSION_REVOKED`, `SESSION_NOT_FOUND`, `WEAK_PASSWORD` (via `422` do `class-validator`), além dos genéricos `BAD_REQUEST`/`UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`/`UNPROCESSABLE_ENTITY`/`TOO_MANY_REQUESTS`/`INTERNAL_ERROR`.

## Como o frontend deve consumir

1. Guarde `accessToken` em memória (não em `localStorage`, para reduzir exposição a XSS) e `refreshToken` em storage persistente (ex. `localStorage`/cookie) — ele é opaco e só serve para `/auth/refresh`.
2. Envie `Authorization: Bearer <accessToken>` em toda chamada autenticada.
3. Ao receber `401` de uma chamada autenticada, tente `/auth/refresh` uma vez com o `refreshToken` guardado; se também falhar, redirecione para o login.
4. `/auth/refresh` **rotaciona** o refresh token — sempre substitua o valor guardado pelo novo `refreshToken` da resposta; o antigo deixa de funcionar.
5. Restaure sessão no boot do app chamando `GET /auth/me` com o access token guardado (se ainda válido) ou via refresh.
6. CORS está restrito a `FRONTEND_URL` (ver `.env`) — aponte para a URL real do dev server do TanStack Start (ex. `http://localhost:5173` conforme `vite.config.ts`).

## Variáveis de ambiente

Veja `.env.example`. Resumo do que preencher para produção:
- `DATABASE_URL`, `REDIS_URL`: instâncias reais (não os containers de dev).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: strings aleatórias fortes (≥32 chars), diferentes uma da outra, nunca reaproveitadas do `.env.example`.
- `SMTP_*`: um provedor real (SendGrid, SES, Postmark, Resend...) em vez do Mailhog local.
- `FRONTEND_URL`: origem exata do frontend em produção (usada tanto no CORS quanto nos links dos e-mails).

## Checklist para produção

- [ ] Trocar todos os secrets (`JWT_*`) por valores gerados aleatoriamente e mantidos fora do repositório.
- [ ] Configurar um provedor SMTP real.
- [ ] Rodar `prisma migrate deploy` (não `migrate dev`) no deploy.
- [ ] Restringir ou desabilitar `/docs` (Swagger) em produção, ou protegê-lo com auth básica.
- [ ] Servir atrás de HTTPS/TLS (reverse proxy ou load balancer).
- [ ] Redis e Postgres gerenciados, com backup configurado.
- [ ] Revisar os limites do `@nestjs/throttler` (`ThrottlerModule`) e do `LoginLockoutService` para o volume de tráfego esperado.
