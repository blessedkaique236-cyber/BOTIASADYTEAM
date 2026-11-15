# Configuração e operação do BOOM QUEUE SYSTEM

## Requisitos

- Node.js 24 ou Docker com Docker Compose.
- Aplicação de bot criada no [Discord Developer Portal](https://discord.com/developers/applications).
- PostgreSQL 17.

## Configuração de credenciais e IDs (manual)

1. Copie `.env.example` para `.env`.
2. Preencha `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL` e `POSTGRES_PASSWORD`.
3. Após convidar o bot ao seu servidor, copie os IDs no modo desenvolvedor do Discord e preencha conforme necessário:
   - `DISCORD_GUILD_ID`: registro de comandos em servidor de teste.
   - `TICKET_CATEGORY_ID`: categoria de tickets.
   - `STAFF_ROLE_ID`: cargo de suporte.
   - `ANNOUNCEMENT_CHANNEL_ID`: canal de anúncios de filas.
   - `AUDIT_LOG_CHANNEL_ID`: canal de avisos de tickets.
   - `PANEL_GUILD_ID`: servidor exibido no painel.
   - `PANEL_TOKEN`: segredo longo e aleatório para autenticação do painel.
4. Se não preencher `TICKET_CATEGORY_ID`, o canal do ticket será criado na raiz do servidor. Sem `STAFF_ROLE_ID`, apenas o autor e o bot terão acesso explícito ao ticket (administradores podem ter acesso pelas permissões do servidor).
5. Convide com os escopos `bot` e `applications.commands`. O bot precisa de permissões para enviar mensagens, visualizar canais e gerenciar canais para tickets.

Nunca compartilhe tokens no chat ou no repositório.

## Docker

```bash
docker compose up -d --build
docker compose logs -f boom-queue-system
```

O banco aplica migrações antes da inicialização. O volume `boom_queue_data` mantém os dados. O painel é habilitado somente com `PANEL_TOKEN` e `PANEL_GUILD_ID`; localmente, abra `http://localhost:3000`. A porta do host é vinculada a localhost por padrão.

## Execução local

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run register-commands
npm run dev
```

## Comandos disponíveis

| Comando | Permissão | Descrição |
| --- | --- | --- |
| `/ping` | Todos | Verifica latência |
| `/fila-criar nome limite` | Gerenciar servidor | Cria fila (2–100 vagas) |
| `/fila-entrar nome`, `/fila-sair nome` | Todos | Entrar/sair |
| `/fila-listar` | Todos | Lista filas |
| `/fila-iniciar nome`, `/fila-encerrar nome` | Gerenciar servidor | Controla fila |
| `/fila-stats` | Todos | Estatísticas agregadas |
| `/equipe-criar nome limite` | Todos | Cria equipe (2–20 membros) |
| `/equipe-entrar nome`, `/equipe-sair nome` | Todos | Participação em equipe |
| `/equipe-listar` | Todos | Lista equipes |
| `/match-gerar fila` | Gerenciar servidor | Sorteia duas equipes com o mesmo número de jogadores; exige fila iniciada, mínimo de 4 e quantidade par |
| `/ticket-abrir assunto` | Todos | Cria canal privado e registra ticket |
| `/ticket-fechar` | Autor ou administrador | Fecha o ticket e preserva o canal/histórico |
| `/audit-recentes` | Gerenciar servidor | Últimos eventos administrativos |

## Painel e saúde

- `GET /health`: processo ativo.
- `GET /health/ready`: banco conectado e Gateway Discord pronto.
- `GET /`: painel web, somente leitura, se token e guild ID estiverem configurados.
- `GET /api/dashboard`: dados do painel, exige `Authorization: Bearer <PANEL_TOKEN>`.

Não exponha a porta diretamente à internet. Use VPN ou proxy reverso com TLS e autenticação adicional se precisar de acesso remoto. O painel não executa operações administrativas.

## Backup

O script exige cliente PostgreSQL com `pg_dump`:

```bash
DATABASE_URL='postgresql://...' BACKUP_DIR='./backups' BACKUP_RETENTION_DAYS=7 bash scripts/backup-db.sh
```

Agende pelo cron do host. Armazene cópias em outro local e teste restauração. O script cria arquivos protegidos localmente e aplica retenção; armazenamento remoto e agendamento devem ser configurados por você.

## Testes e CI

```bash
npm run db:generate
npm run db:migrate:deploy
npm run typecheck
npm test
npm run lint
npm run build
```

O workflow CI inicia PostgreSQL e executa migrações e validações. Testes de integração exigem `DATABASE_URL` apontando para banco de teste isolado.

## Limitações conhecidas

- Painel é somente leitura, não substitui console administrativo completo.
- Matchmaking ainda não possui MMR, ranking ou distribuição por habilidade.
- Backups não são agendados nem enviados automaticamente para armazenamento externo.
- Métricas/alertas externos e testes de carga ainda precisam ser adicionados.
- Credenciais, IDs e validação real das permissões no seu servidor ficam com o proprietário do bot.
