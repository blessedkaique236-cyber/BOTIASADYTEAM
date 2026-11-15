# Configuração e operação do BOOM QUEUE SYSTEM

## Requisitos

- Node.js 24 ou Docker com Docker Compose.
- Aplicação e bot criados no [Discord Developer Portal](https://discord.com/developers/applications).
- PostgreSQL 17 (o Compose inicia um serviço e volume persistente).

## Configuração

1. Copie `.env.example` para `.env`.
2. Preencha `DISCORD_TOKEN` com o token do bot e `DISCORD_CLIENT_ID` com o Application ID. Nunca publique o token.
3. Defina `POSTGRES_PASSWORD` como uma senha forte e atualize o mesmo valor na `DATABASE_URL` local. No Docker Compose, a aplicação usa o host `database` automaticamente.
4. Para registrar comandos imediatamente em um servidor de desenvolvimento, preencha `DISCORD_GUILD_ID`. Sem isso, o script registra comandos globalmente.
5. No OAuth2 URL Generator, selecione `bot` e `applications.commands`. Convide o bot ao servidor.

## Executar com Docker

```bash
docker compose up -d --build
docker compose logs -f boom-queue-system
```

O container aguarda o PostgreSQL, aplica migrações e inicia o gateway. O volume `boom_queue_data` mantém os dados entre reinicializações.

## Executar localmente

Inicie um PostgreSQL 17 e configure `DATABASE_URL` apontando para ele:

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run register-commands
npm run dev
```

Para produção, use `npm run build && npm start` depois de aplicar migrações.

## Comandos disponíveis

| Comando | Permissão | Descrição |
| --- | --- | --- |
| `/ping` | Todos | Verifica resposta e latência |
| `/fila-criar nome limite` | Gerenciar servidor | Cria fila com 2–100 vagas (padrão 10) |
| `/fila-entrar nome` | Todos | Entra em fila aberta |
| `/fila-sair nome` | Todos | Sai de fila em espera |
| `/fila-listar` | Todos | Lista filas abertas/em andamento |
| `/fila-iniciar nome` | Gerenciar servidor | Inicia com ao menos 2 jogadores |
| `/fila-encerrar nome` | Gerenciar servidor | Encerra a fila |

As permissões administrativas são verificadas tanto na definição do comando quanto no handler. Filas são isoladas por ID do servidor; a chave única composta evita nomes duplicados dentro de uma guild. Participantes não podem entrar duas vezes ou exceder o limite.

## Testes e CI

O workflow Foundation CI inicia PostgreSQL, aplica migrações, executa testes de integração, typecheck, lint e build. Localmente, configure um banco de teste em `DATABASE_URL` antes de executar `npm test`.

## Limitações restantes antes de produção ampla

Este é o primeiro MVP persistente. Ainda não inclui painel web, matchmaking/equipes, notificações e automações avançadas, tickets, analytics, moderação, sistema de auditoria administrativa, backups automatizados, métricas/alertas operacionais ou teste de carga. A operação real também exige que o proprietário configure as credenciais e valide permissões/intenções no próprio servidor Discord. Não compartilhe tokens no chat ou no repositório.
