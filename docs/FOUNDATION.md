# Módulo 01 — Fundação e Arquitetura

## Escopo entregue nesta etapa

- Projeto Node.js 24 LTS com TypeScript em modo strict.
- Validação centralizada das variáveis de ambiente com Zod.
- Logs estruturados com Pino e redação de campos sensíveis.
- Erro de aplicação padronizado com código, status, causa e classificação operacional.
- Scripts de desenvolvimento, build, typecheck, lint, formatação e testes.
- Testes unitários da validação de ambiente e da classe de erro.
- Imagem Docker multi-stage e configuração inicial do Compose.

## Configuração local

1. Instale Node.js 24 LTS.
2. Copie `.env.example` para `.env`.
3. Preencha `DISCORD_TOKEN` e `DISCORD_CLIENT_ID`.
4. Execute `npm install`.
5. Execute `npm run typecheck`, `npm test` e `npm run build`.
6. Inicie com `npm run dev`.

## Docker

Com Docker instalado e um arquivo `.env` válido:

```bash
docker compose up --build -d
docker compose logs -f
docker compose down
```

## Decisões e limites

- O token do Discord nunca deve ser commitado. O arquivo `.env` é ignorado pelo Git.
- O bot ainda não conecta ao Gateway nesta etapa; a integração será implementada no módulo Discord Gateway.
- PostgreSQL, Prisma e Redis não são iniciados aqui. Eles pertencem aos módulos Database Engine e Infrastructure.
- Não existe endpoint HTTP de health check nesta etapa; o health check de aplicação será definido junto ao Core System.
- A configuração exige credenciais Discord para iniciar o processo, mas os testes usam a função de parsing isoladamente e não precisam de credenciais reais.
