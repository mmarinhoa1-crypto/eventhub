// Integracao com Google Sheets via Service Account.
// Cada evento pode ter um google_sheet_id associado. Quando uma despesa
// ou receita eh criada/editada/removida, sistema reescreve a aba
// "EventHub Dados" da planilha com TODO o estado atual do evento.
// Idempotente: sempre limpa a aba e regrava do zero.
//
// A planilha "bonita" do usuario fica em outra aba e puxa dados da
// "EventHub Dados" via formulas (QUERY/FILTER/IMPORTRANGE).
//
// Pre-requisitos:
//  - googleapis instalado
//  - Variavel de ambiente GOOGLE_SHEETS_CREDENTIALS_PATH apontando para o
//    arquivo JSON da Service Account
//  - Cada planilha alvo deve estar compartilhada com o email da
//    Service Account (Editor)
//  - Google Sheets API ativada no projeto GCP da Service Account

const fs = require('fs');
const { google } = require('googleapis');

const ABA_DADOS = 'EventHub Dados';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let cachedSheets = null;

function getSheetsClient() {
  if (cachedSheets) return cachedSheets;
  const path = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
  if (!path) {
    console.warn('[sheets] GOOGLE_SHEETS_CREDENTIALS_PATH nao configurado - integracao desabilitada');
    return null;
  }
  try {
    const credentials = JSON.parse(fs.readFileSync(path, 'utf8'));
    const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    cachedSheets = google.sheets({ version: 'v4', auth });
    return cachedSheets;
  } catch (e) {
    console.error('[sheets] erro ao carregar credenciais:', e.message);
    return null;
  }
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
// e regrava com o estado atual do banco.
// Nao bloqueia o caller (usar em background com .catch).
async function sincronizarEvento(pool, eventoId) {
  const sheets = getSheetsClient();
  if (!sheets) return { skipped: true, reason: 'sem-credenciais' };

  const ev = await pool.query('SELECT id, nome, google_sheet_id FROM eventos WHERE id=$1', [eventoId]);
  if (!ev.rows.length) return { skipped: true, reason: 'evento-inexistente' };
  const evento = ev.rows[0];
  if (!evento.google_sheet_id || !String(evento.google_sheet_id).trim()) {
    return { skipped: true, reason: 'sem-google_sheet_id' };
  }

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

  // Limpa aba inteira
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
// Usa setImmediate pra rodar fora do ciclo atual do event loop.
function sincronizarEventoBackground(pool, eventoId) {
  if (!eventoId) return;
  setImmediate(() => {
    sincronizarEvento(pool, eventoId)
      .then(r => {
        if (r && r.ok) console.log(`[sheets] sync ok evento=${eventoId} despesas=${r.despesas} receitas=${r.receitas}`);
        else if (r && r.skipped) console.log(`[sheets] sync skip evento=${eventoId} (${r.reason})`);
      })
      .catch(e => console.error(`[sheets] sync ERRO evento=${eventoId}:`, e.message));
  });
}

module.exports = { sincronizarEvento, sincronizarEventoBackground };
