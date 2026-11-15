# Primeiro MVP do Discord

## Estado desta entrega

Esta branch adiciona a primeira fatia executável do bot: conexão ao Discord Gateway, registro de comandos slash e gerenciamento de filas em memória. É um MVP de desenvolvimento, **não uma versão pronta para produção**.

## Comandos

| Comando | Permissão | Ação |
| --- | --- | --- |
| `/ping` | Todos | Verifica se o bot responde |
| `/fila-criar nome limite` | Gerenciar servidor | Cria fila (limite padrão: 10; faixa: 2–100) |
| `/fila-entrar nome` | Todos | Entra em uma fila aberta |
| `/fila-sair nome` | Todos | Sai de uma fila que ainda aguarda |
| `/fila-listar` | Todos | Lista as filas do servidor |
| `/fila-iniciar nome` | Gerenciar servidor | Inicia com pelo menos 2 participantes |
| `/fila-encerrar nome` | Gerenciar servidor | Encerra uma fila |

As filas são isoladas por servidor. O Discord valida a permissão de Gerenciar servidor para criação, início e encerramento.

## Configuração do Discord

1. Crie uma aplicação no [Discord Developer Portal](https://discord.com/developers/applications) e adicione um Bot.
2. Copie o token para `DISCORD_TOKEN` no arquivo `.env`; nunca o envie a terceiros nem o versione.
3. Copie o Application ID para `DISCORD_CLIENT_ID`.
4. Para desenvolvimento, informe o ID do servidor em `DISCORD_GUILD_ID`. Isso registra os comandos apenas nesse servidor e facilita a atualização. Sem essa variável, os comandos são registrados globalmente.
5. No OAuth2 URL Generator, selecione os escopos `bot` e `applications.commands`. Convide o bot ao servidor com as permissões mínimas necessárias para visualizar canais e enviar mensagens/respostas a interações.
6. Instale dependências e registre os comandos:

```bash
npm install
npm run register-commands
npm run dev
```

Para executar compilado:

```bash
npm run build
npm start
```

## Limitações conhecidas e próximos módulos

- **Sem persistência:** filas vivem apenas na memória do processo. Reiniciar o bot apaga as filas. Não use para campeonatos ou operações que exijam histórico confiável.
- **Sem coordenação entre instâncias:** execute apenas uma instância deste MVP.
- Ainda faltam PostgreSQL/Prisma, migrações, transações e concorrência segura; painel web; partidas/equipes; notificações; automações; tickets/suporte; analytics; auditoria persistente; rate limits e hardening operacional.
- Antes de produção, implementar banco persistente, testes de integração com Discord e banco, tratamento de falhas/reconexão, observabilidade e revisão de permissões.

Esta entrega não solicita nem contém credenciais reais. O teste de integração com a conta Discord só pode ser feito depois que o responsável configurar o próprio token e Application ID em ambiente seguro.
