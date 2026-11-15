import { createServer, type Server } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../core/logger.js';
import { prisma } from './database.js';
import { statisticsService } from '../modules/statistics/statistics-service.js';

const dashboardHtml = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BOOM QUEUE SYSTEM · Painel</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#0b1020;color:#e8ecf7}
body{max-width:1000px;margin:40px auto;padding:0 20px}h1{letter-spacing:.04em}
.card{background:#151d32;border:1px solid #293653;border-radius:14px;padding:18px;margin:16px 0}
input,button{padding:12px;border-radius:8px;border:1px solid #405071;background:#0d1528;color:#fff}
button{cursor:pointer;background:#315ee8;border:0;font-weight:700}pre{white-space:pre-wrap;overflow-wrap:anywhere}
small{color:#9eacc8}
</style></head><body>
<h1>BOOM QUEUE SYSTEM</h1><p><small>Painel operacional somente leitura · os comandos administrativos continuam no Discord</small></p>
<section class="card"><label for="token">Token de acesso do painel</label><br><input id="token" type="password" autocomplete="off" placeholder="Cole o token configurado no servidor"><button id="load">Carregar painel</button><p id="status"></p></section>
<section class="card"><h2>Resumo do servidor</h2><pre id="data">Aguardando autenticação…</pre></section>
<script>
document.getElementById('load').addEventListener('click',async()=>{
 const status=document.getElementById('status'),output=document.getElementById('data');
 status.textContent='Carregando…';output.textContent='';
 try{
  const response=await fetch('/api/dashboard',{headers:{Authorization:'Bearer '+document.getElementById('token').value}});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Falha ao carregar');
  output.textContent=JSON.stringify(data,null,2);status.textContent='Dados atualizados.';
 }catch(error){status.textContent=error.message;output.textContent='';}
});
</script></body></html>`;

function authorized(header: string | undefined): boolean {
  if (!env.PANEL_TOKEN || !header?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(env.PANEL_TOKEN);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function startHttpServer(isDiscordReady: () => boolean): Server {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');

    if (request.method === 'GET' && url.pathname === '/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ status: 'alive', service: env.APP_NAME }));
      return;
    }
    if (request.method === 'GET' && url.pathname === '/health/ready') {
      try {
        await prisma.$queryRaw`SELECT 1`;
        const ready = isDiscordReady();
        response.writeHead(ready ? 200 : 503, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ status: ready ? 'ready' : 'discord_not_ready', database: 'connected', discord: ready }));
      } catch {
        response.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ status: 'not_ready', database: 'disconnected', discord: isDiscordReady() }));
      }
      return;
    }
    if (request.method === 'GET' && url.pathname === '/' && env.PANEL_TOKEN && env.PANEL_GUILD_ID) {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'" });
      response.end(dashboardHtml);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/dashboard') {
      if (!authorized(request.headers.authorization)) {
        response.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'Acesso não autorizado.' }));
        return;
      }
      if (!env.PANEL_GUILD_ID) {
        response.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'PANEL_GUILD_ID não foi configurado.' }));
        return;
      }
      try {
        const guildId = env.PANEL_GUILD_ID;
        const [statistics, queues, teams, tickets, audit] = await Promise.all([
          statisticsService.getGuildStatistics(guildId),
          prisma.queue.findMany({ where: { guildId, status: { not: 'FINISHED' } }, include: { players: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
          prisma.team.findMany({ where: { guildId }, include: { members: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
          prisma.supportTicket.findMany({ where: { guildId, status: 'OPEN' }, orderBy: { createdAt: 'desc' }, take: 30 }),
          prisma.auditLog.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, take: 20 }),
        ]);
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ statistics, queues, teams, openTickets: tickets, recentAudit: audit }));
      } catch (error) {
        logger.error({ err: error }, 'Falha ao montar dados do painel');
        response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'Não foi possível carregar os dados do painel.' }));
      }
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Não encontrado.' }));
  });
  server.listen(env.HTTP_PORT, '0.0.0.0', () => logger.info({ port: env.HTTP_PORT }, 'Servidor HTTP de saúde/painel iniciado'));
  server.on('error', (error) => logger.error({ err: error }, 'Erro no servidor HTTP'));
  return server;
}
