# BOOM QUEUE SYSTEM

Sistema modular de gerenciamento de filas e comunidades para Discord, com TypeScript, Discord.js e PostgreSQL.

> **Status:** evolução funcional em branch de desenvolvimento. Não considere produção pronta até o CI ficar verde, o deploy ser testado e as credenciais/IDs do seu servidor serem configurados.

## Funcionalidades implementadas nesta etapa

- Bot Discord conectado pelo Gateway e comandos slash.
- Filas persistentes: criar, entrar, sair, listar, iniciar e encerrar.
- Equipes persistentes: criar, entrar, sair e listar.
- Matchmaking: sorteio aleatório de duas equipes equilibradas a partir de fila iniciada, com quantidade par de jogadores.
- Tickets privados: abertura de canal, permissões para autor/equipe de suporte e fechamento com histórico preservado.
- Estatísticas do servidor e registros administrativos (audit log).
- Notificações opcionais no canal configurado.
- Painel web operacional somente leitura, protegido por token.
- Endpoints de saúde `/health` e prontidão `/health/ready`.
- PostgreSQL, migrações Prisma, Docker Compose e script de backup com retenção.
- Testes unitários e de integração no CI.

## Stack

- Node.js 24, TypeScript strict e Discord.js v14
- PostgreSQL 17 e Prisma 6
- Zod, Pino, Vitest, ESLint e Docker

## Configuração manual (necessária)

1. Copie `.env.example` para `.env`.
2. Preencha `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL` e `POSTGRES_PASSWORD`.
3. Depois de criar o servidor, configure manualmente os IDs opcionais:
   - `DISCORD_GUILD_ID`: servidor para registro rápido dos comandos de teste.
   - `TICKET_CATEGORY_ID`: categoria onde os canais privados de ticket serão criados.
   - `STAFF_ROLE_ID`: cargo que terá acesso aos tickets.
   - `ANNOUNCEMENT_CHANNEL_ID`: canal que recebe avisos de fila.
   - `AUDIT_LOG_CHANNEL_ID`: canal que recebe avisos de ticket.
   - `PANEL_GUILD_ID`: servidor que o painel vai consultar.
   - `PANEL_TOKEN`: token longo e aleatório para acessar o painel.
4. Os IDs são opcionais conforme o recurso. Sem categoria, os tickets são criados na raiz do servidor; sem canal de avisos, os avisos externos ficam desativados. O painel só é habilitado quando `PANEL_TOKEN` e `PANEL_GUILD_ID` estiverem definidos.
5. No Discord Developer Portal, convide o bot com os escopos `bot` e `applications.commands`. Conceda apenas permissões necessárias, incluindo Manage Channels para criação de tickets.

**Nunca coloque tokens, senhas ou URLs privadas no GitHub.** Não envie credenciais pelo chat.

## Executar com Docker

```bash
cp .env.example .env
# edite .env e preencha credenciais/IDs
docker compose up -d --build
docker compose logs -f boom-queue-system
```

O painel fica acessível localmente em `http://localhost:3000` quando habilitado. O Compose vincula a porta a `127.0.0.1`, não expondo o painel diretamente à internet. Para acesso remoto, use VPN ou proxy reverso com TLS e controles adicionais.

## Executar localmente

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run register-commands
npm run dev
```

## Comandos

| Comando | Acesso | Função |
| --- | --- | --- |
| `/ping` | Todos | Verifica resposta |
| `/fila-criar` | Gerenciar servidor | Cria fila (2–100 vagas) |
| `/fila-entrar`, `/fila-sair` | Todos | Participar ou sair |
| `/fila-listar` | Todos | Lista filas ativas |
| `/fila-iniciar`, `/fila-encerrar` | Gerenciar servidor | Controla a fila |
| `/fila-stats` | Todos | Estatísticas do servidor |
| `/equipe-criar` | Todos | Cria equipe e define líder |
| `/equipe-entrar`, `/equipe-sair` | Todos | Gerencia participação |
| `/equipe-listar` | Todos | Lista equipes |
| `/match-gerar` | Gerenciar servidor | Sorteia dois times equilibrados |
| `/ticket-abrir` | Todos | Abre canal privado de suporte |
| `/ticket-fechar` | Autor do ticket ou administrador | Fecha e preserva histórico |
| `/audit-recentes` | Gerenciar servidor | Mostra eventos recentes |

## Backup e recuperação

O script `scripts/backup-db.sh` cria dump PostgreSQL em formato custom e remove arquivos mais antigos que a retenção configurada (7 dias por padrão):

```bash
DATABASE_URL='postgresql://...' BACKUP_DIR='./backups' bash scripts/backup-db.sh
```

Agende a execução com cron ou o agendador do seu servidor. Guarde cópias fora da máquina e teste a restauração periodicamente. O script exige `pg_dump` instalado; ele não configura sozinho um agendador nem armazenamento remoto.

## Verificações

```bash
npm run db:generate
npm run db:migrate:deploy
npm run typecheck
npm test
npm run lint
npm run build
```

## O que ainda exige validação antes de produção

- Executar CI verde no commit final e revisar dependências/vulnerabilidades.
- Configurar e testar permissões, cargos, categoria e canais no seu Discord.
- Testar fluxo real de tickets, permissões e painel em servidor de homologação.
- Configurar cron e destino externo para backups; testar restauração.
- Configurar proxy reverso/TLS se o painel precisar ser acessado remotamente.
- Testes de carga, métricas externas e alertas de operação.
- O painel desta entrega é somente leitura; não é um painel de administração completo para alterar filas, equipes ou tickets.
- Matchmaking atual sorteia duas equipes por distribuição aleatória; não considera MMR, elo ou habilidade.

O PR permanece em desenvolvimento até as verificações serem concluídas. Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e [docs/QUEUE-MVP.md](docs/QUEUE-MVP.md).
