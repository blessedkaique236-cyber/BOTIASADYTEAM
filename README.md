# BOOM QUEUE SYSTEM

Sistema modular de gerenciamento de filas para Discord, com TypeScript, Discord.js e PostgreSQL.

> **Status:** MVP persistente em desenvolvimento na branch `feat/discord-queue-mvp`. Ainda requer validação do CI e evolução dos módulos antes de produção.

## Funcionalidades deste MVP

- Conexão ao Discord Gateway e comandos slash.
- Criação, entrada, saída, listagem, início e encerramento de filas.
- Persistência PostgreSQL via Prisma e migrações versionadas.
- Isolamento de filas por servidor Discord.
- Verificação de permissão administrativa no comando e no backend.
- Docker Compose com PostgreSQL e volume persistente.
- Testes de integração de persistência e isolamento.

## Stack

- Node.js 24, TypeScript strict e Discord.js v14
- PostgreSQL 17 e Prisma 6
- Zod para configuração e Pino para logs estruturados
- Vitest, ESLint, Docker e GitHub Actions

## Configuração rápida com Docker

1. Copie `.env.example` para `.env`.
2. Configure `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` e uma senha forte em `POSTGRES_PASSWORD`.
3. Ajuste a senha da `DATABASE_URL` local conforme descrito em [docs/QUEUE-MVP.md](docs/QUEUE-MVP.md).
4. Opcionalmente configure `DISCORD_GUILD_ID` para registrar os comandos em um servidor de teste.
5. Execute:

```bash
docker compose up -d --build
docker compose logs -f boom-queue-system
```

O container aplica migrações do Prisma antes de iniciar. O volume `boom_queue_data` mantém o banco entre reinicializações.

## Configuração local

Consulte [docs/QUEUE-MVP.md](docs/QUEUE-MVP.md) para preparar PostgreSQL, instalar dependências, aplicar migrações, registrar os comandos e iniciar o bot.

## Comandos

| Comando | Acesso | Descrição |
| --- | --- | --- |
| `/ping` | Todos | Latência e disponibilidade |
| `/fila-criar` | Gerenciar servidor | Cria fila (2–100 vagas) |
| `/fila-entrar` | Todos | Entra em fila |
| `/fila-sair` | Todos | Sai de fila em espera |
| `/fila-listar` | Todos | Lista filas ativas |
| `/fila-iniciar` | Gerenciar servidor | Inicia com pelo menos 2 participantes |
| `/fila-encerrar` | Gerenciar servidor | Encerra fila |

## Qualidade

```bash
npm run db:generate
npm run db:migrate:deploy
npm run typecheck
npm test
npm run lint
npm run build
```

O workflow Foundation CI executa migrações e validações com PostgreSQL no GitHub Actions.

## Escopo ainda não entregue

Painel web, equipes/matchmaking, notificações avançadas, automações, tickets, analytics, auditoria administrativa completa, backups automáticos, métricas/alertas e testes de carga ainda não fazem parte deste MVP. A configuração do token Discord e a validação no servidor real dependem do proprietário da aplicação. Não publique o arquivo `.env` nem compartilhe o token.

Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/FOUNDATION.md](docs/FOUNDATION.md) e [docs/QUEUE-MVP.md](docs/QUEUE-MVP.md).
