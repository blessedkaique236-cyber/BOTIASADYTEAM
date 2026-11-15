# Arquitetura — BOOM QUEUE SYSTEM

## Princípios

1. Modularidade por domínio e responsabilidades explícitas.
2. TypeScript strict e validação de configuração em runtime.
3. Segurança por padrão: segredos externos e autorização no backend.
4. Observabilidade com logs estruturados e redação de credenciais.
5. Testabilidade com testes unitários e de integração.
6. Multi-tenancy: toda consulta de fila exige o ID do servidor Discord.

## Arquitetura implementada nesta branch

- **Gateway Discord:** cliente Discord.js v14, eventos de interação, registro de comandos slash e encerramento gracioso.
- **Configuração:** Zod valida Discord credentials, ambiente, nível de log e DATABASE_URL.
- **Domínio de filas:** regras de criação, capacidade, entrada/saída, início, encerramento e listagem.
- **Persistência:** PostgreSQL via Prisma, migrações versionadas, chaves únicas compostas por guild e fila, cascade para participantes.
- **Operação:** Docker Compose com volume persistente, healthcheck do banco e migração automática no startup.
- **Qualidade:** GitHub Actions com PostgreSQL de serviço, migração, typecheck, testes de integração, lint e build.

## Próximos domínios

O MVP ainda não implementa painel administrativo web, matchmaking e equipes, notificações avançadas, automações, tickets, analytics, auditoria administrativa completa, backups automatizados, métricas/alertas e testes de carga. Esses domínios devem ser entregues em módulos isolados, cada um com migrações, autorização, testes e documentação.

## Garantias e limites

O schema e os comandos atuais isolam dados por guild. Permissões de gerenciamento são aplicadas no registro dos comandos e verificadas novamente no handler. A persistência depende de um PostgreSQL disponível e de migrações aplicadas. O CI ainda precisa concluir com sucesso no commit candidato antes de qualquer merge. A configuração de token e teste com uma aplicação Discord real dependem do proprietário do bot.
