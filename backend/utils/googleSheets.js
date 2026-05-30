// Integracao com Google Sheets via OAuth do usuario.
//
// Cada organizacao tem 1 conta Google conectada (refresh_token salvo na
// tabela organizacoes). O sistema usa essa autorizacao pra criar
// planilhas no Drive do proprio usuario (usando a cota gratuita de 15GB
// do Gmail) e pra ler/escrever na aba "EventHub Dados" delas.
//
// Por que OAuth em vez de Service Account:
//   Service Accounts tem 0GB de quota no Drive em contas gratuitas
//   (sem Google Workspace), entao falham ao copiar/criar arquivos com
//   erro "Drive storage quota has been exceeded".
//
// Fluxo:
//   1. User clica "Conectar Google" no UI -> /api/auth/google/start
//   2. Google redireciona pra /api/auth/google/callback com auth code
//   3. Backend troca code por refresh_token, salva em organizacoes
//   4. Esta lib usa refresh_token pra obter access_token quando precisa
//
// O refresh_token nao expira enquanto o app estiver em modo Production
// no Google Cloud Console (escopo drive.file e non-sensitive, nao
// requer verificacao Google).

const { google } = require('googleapis');

const ABA_DADOS = 'EventHub Dados';

const SCOPES = [
  'https://www.googleapis.com/auth/drive',              // full Drive (necessario pra duplicar template existente do user)
  'https://www.googleapis.com/auth/spreadsheets',       // sheets RW
  'https://www.googleapis.com/auth/userinfo.email',     // pegar email do user pra UI
];
// Nota: drive.file (escopo restrito) so ve arquivos criados pelo app,
// nao serve pra duplicar templates pre-existentes do user. drive (escopo
// amplo) e classificado como "sensitive" pelo Google — requer verificacao
// formal pra publicar em Production. Sem verificacao, app fica em modo
// Testing e refresh_tokens expiram a cada 7 dias.

function buildOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

// Retorna um cliente OAuth2 autenticado com o refresh_token da org.
// Lib googleapis renova access_token automaticamente quando vence.
async function getOAuthClient(pool, orgId) {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return { client: null, reason: 'sem-oauth-config' };
  }
  const r = await pool.query(
    'SELECT google_oauth_refresh_token FROM organizacoes WHERE id=$1',
    [orgId]
  );
  if (!r.rows.length || !r.rows[0].google_oauth_refresh_token) {
    return { client: null, reason: 'sem-conexao-google' };
  }
  const client = buildOAuth2Client();
  client.setCredentials({ refresh_token: r.rows[0].google_oauth_refresh_token });
  return { client };
}

// Duplica a planilha-template definida em GOOGLE_SHEETS_TEMPLATE_ID,
// renomeia para o nome do evento, mantem na mesma pasta do template,
// e grava o novo ID em eventos.google_sheet_id.
async function criarPlanilhaParaEvento(pool, eventoId) {
  const TEMPLATE_ID = process.env.GOOGLE_SHEETS_TEMPLATE_ID;
  if (!TEMPLATE_ID) return { skipped: true, reason: 'sem-template-id' };

  const ev = await pool.query(
    'SELECT id, nome, google_sheet_id, org_id FROM eventos WHERE id=$1',
    [eventoId]
  );
  if (!ev.rows.length) return { skipped: true, reason: 'evento-inexistente' };
  if (ev.rows[0].google_sheet_id && String(ev.rows[0].google_sheet_id).trim()) {
    return { skipped: true, reason: 'ja-tem-planilha', google_sheet_id: ev.rows[0].google_sheet_id };
  }

  const { client, reason } = await getOAuthClient(pool, ev.rows[0].org_id);
  if (!client) return { skipped: true, reason: reason || 'sem-oauth' };

  const drive = google.drive({ version: 'v3', auth: client });
  const nomeEvento = String(ev.rows[0].nome || `Evento ${eventoId}`).trim();

  // Pega parents (pasta) do template pra preservar localizacao da copia
  let parents = [];
  try {
    const tmpl = await drive.files.get({
      fileId: TEMPLATE_ID,
      fields: 'parents, name',
      supportsAllDrives: true,
    });
    parents = tmpl.data.parents || [];
  } catch (e) {
    console.error('[sheets] erro ao ler template:', e.message);
    return { skipped: true, reason: 'template-inacessivel', detalhe: e.message };
  }

  // Duplica template
  let copy;
  try {
    copy = await drive.files.copy({
      fileId: TEMPLATE_ID,
      supportsAllDrives: true,
      requestBody: {
        name: nomeEvento,
        parents: parents.length > 0 ? parents : undefined,
      },
    });
  } catch (e) {
    console.error('[sheets] erro ao copiar template:', e.message);
    return { skipped: true, reason: 'copia-falhou', detalhe: e.message };
  }

  const newSheetId = copy.data.id;
  await pool.query('UPDATE eventos SET google_sheet_id=$1 WHERE id=$2', [newSheetId, eventoId]);

  console.log(`[sheets] planilha criada do template evento=${eventoId} sheet=${newSheetId} nome="${nomeEvento}"`);
  return { ok: true, google_sheet_id: newSheetId, nome: nomeEvento };
}

// Garante que a aba "EventHub Dados" existe na planilha; cria se nao existir.
async function garantirAbaDados(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existe = (meta.data.sheets || []).some(s => s.properties && s.properties.title === ABA_DADOS);
  if (existe) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: ABA_DADOS, gridProperties: { rowCount: 500, columnCount: 12 } } } }],
    },
  });
}

// Monta as linhas a serem escritas na aba, organizadas em 3 blocos:
// header global, despesas (com header), receitas (com header).
function montarLinhas({ evento, despesas, receitas }) {
  const linhas = [];
  linhas.push([`EventHub - sync ${new Date().toISOString()}  |  Evento: ${evento.nome || ''}`]);
  linhas.push([]);
  // Despesas
  linhas.push(['== DESPESAS ==']);
  linhas.push(['ID', 'Descricao', 'Categoria', 'Quantidade', 'Valor Unit.', 'Valor Total', 'Fornecedor', 'Fonte Pagamento', 'Data', 'Vencimento', 'Falta Pagar', 'Situacao']);
  for (const d of despesas) {
    linhas.push([
      d.id, d.descricao || '', d.centro_custo || '',
      Number(d.quantidade || 0), Number(d.valor_unitario || 0), Number(d.valor || 0),
      d.fornecedor || '', d.fonte_pagamento || '',
      d.data || '', d.data_vencimento ? String(d.data_vencimento).slice(0, 10) : '',
      Number(d.falta_pagar || 0), d.situacao || '',
    ]);
  }
  linhas.push([]);
  // Receitas
  linhas.push(['== RECEITAS ==']);
  linhas.push(['ID', 'Descricao', 'Categoria', 'Valor', 'Conta', 'Data Pagamento', 'Situacao']);
  for (const r of receitas) {
    linhas.push([
      r.id, r.descricao || '', r.centro_custo || '',
      Number(r.valor || 0), r.conta || '',
      r.data_pagamento ? String(r.data_pagamento).slice(0, 10) : '',
      r.situacao || '',
    ]);
  }
  return linhas;
}

// Sincroniza o evento na planilha. Idempotente: limpa a aba "EventHub Dados"
// e regrava com o estado atual do banco. Cria planilha do template se evento
// ainda nao tem uma vinculada.
async function sincronizarEvento(pool, eventoId) {
  const ev = await pool.query(
    'SELECT id, nome, google_sheet_id, org_id FROM eventos WHERE id=$1',
    [eventoId]
  );
  if (!ev.rows.length) return { skipped: true, reason: 'evento-inexistente' };
  const evento = ev.rows[0];

  // Se evento nao tem planilha e existe template configurado, cria automaticamente
  if (!evento.google_sheet_id || !String(evento.google_sheet_id).trim()) {
    if (process.env.GOOGLE_SHEETS_TEMPLATE_ID) {
      const criou = await criarPlanilhaParaEvento(pool, eventoId);
      if (criou.ok) {
        evento.google_sheet_id = criou.google_sheet_id;
      } else {
        return { skipped: true, reason: 'auto-criar-falhou', detalhe: criou.reason };
      }
    } else {
      return { skipped: true, reason: 'sem-google_sheet_id' };
    }
  }

  const { client, reason } = await getOAuthClient(pool, evento.org_id);
  if (!client) return { skipped: true, reason: reason || 'sem-oauth' };
  const sheets = google.sheets({ version: 'v4', auth: client });

  const despesas = (await pool.query(
    `SELECT id, descricao, centro_custo, quantidade, valor_unitario, valor,
            fornecedor, fonte_pagamento, data, data_vencimento, falta_pagar, situacao
     FROM despesas WHERE id_evento=$1 ORDER BY id`,
    [eventoId]
  )).rows;
  const receitas = (await pool.query(
    `SELECT id, descricao, centro_custo, valor, conta, data_pagamento, situacao
     FROM receitas WHERE id_evento=$1 ORDER BY id`,
    [eventoId]
  )).rows;

  const spreadsheetId = String(evento.google_sheet_id).trim();
  await garantirAbaDados(sheets, spreadsheetId);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${ABA_DADOS}!A:Z`,
  });

  const linhas = montarLinhas({ evento, despesas, receitas });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${ABA_DADOS}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: linhas },
  });

  return { ok: true, despesas: despesas.length, receitas: receitas.length };
}

// Wrapper que dispara sync em background sem bloquear o caller.
function sincronizarEventoBackground(pool, eventoId) {
  if (!eventoId) return;
  setImmediate(() => {
    sincronizarEvento(pool, eventoId)
      .then(r => {
        if (r && r.ok) console.log(`[sheets] sync ok evento=${eventoId} despesas=${r.despesas} receitas=${r.receitas}`);
        else if (r && r.skipped) console.log(`[sheets] sync skip evento=${eventoId} (${r.reason}${r.detalhe ? ': ' + r.detalhe : ''})`);
      })
      .catch(e => console.error(`[sheets] sync ERRO evento=${eventoId}:`, e.message));
  });
}

module.exports = {
  sincronizarEvento,
  sincronizarEventoBackground,
  criarPlanilhaParaEvento,
  buildOAuth2Client,
  getOAuthClient,
  SCOPES,
};
