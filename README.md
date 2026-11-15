# BOOM QUEUE SYSTEM

Sistema profissional, modular e multi-servidor de gerenciamento de filas para Discord.

> **Status:** Em desenvolvimento — Módulo 01/16 (Fundação e Arquitetura).

## Objetivos

- Gerenciamento confiável de filas por servidor (guild).
- Arquitetura modular com TypeScript em modo strict.
- Persistência e concorrência segura (módulos posteriores).
- Permissões verificadas no backend.
- Observabilidade, auditoria e testes desde a fundação.

## Stack

- Node.js 24 LTS
- TypeScript (strict)
- Discord.js v14
- Zod para validação de configuração
- Pino para logs estruturados
- Vitest para testes
- Docker / Docker Compose

PostgreSQL, Prisma e Redis serão integrados nos módulos de banco de dados e infraestrutura.

## Requisitos

- Node.js 24 LTS
- npm 10+
- Docker Engine + Docker Compose (opcional nesta etapa)

## Configuração

```bash
cp .env.example .env
npm install
npm run dev
```

Preencha as variáveis obrigatórias no arquivo `.env`. Nunca compartilhe tokens ou credenciais.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Execução em desenvolvimento |
| `npm run build` | Compilação TypeScript |
| `npm start` | Executa a versão compilada |
| `npm run typecheck` | Verificação de tipos |
| `npm test` | Testes automatizados |
| `npm run lint` | Análise estática |
| `npm run format` | Formatação |

## Estrutura inicial

```text
src/
  config/       # Configuração e validação de ambiente
  core/         # Componentes fundamentais da aplicação
  shared/       # Erros e utilitários compartilhados
  index.ts      # Ponto de entrada
tests/          # Testes automatizados
```

## Segurança

- Não versione o arquivo `.env`.
- Não registre tokens, senhas ou dados sensíveis.
- Valide entradas externas antes de utilizá-las.
- Nunca confie apenas na interface do Discord para autorizar operações.

## Desenvolvimento

O projeto será construído módulo por módulo. Um módulo só será considerado concluído após implementação, revisão, compilação e testes correspondentes.

Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para as decisões arquiteturais.
