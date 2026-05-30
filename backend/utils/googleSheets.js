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

const ABA_DESPESAS = 'EventHub Despesas';
const ABA_RECEITAS = 'EventHub Receitas';
const ABA_FINANCEIRO = 'Financeiro';
const ABAS_ANTIGAS = ['EventHub Dados']; // limpar se existirem (migracao)

// Categorias do EventHub em ordem visual da planilha
const CATEGORIAS_ORDEM = [
  'Artistico',
  'Logistica/Camarim',
  'Estrutura do Evento',
  'Divulgacao e Midia',
  'Operacional',
  'Bar',
  'Alimentacao',
  'Documentacao e Taxas',
  'Outros',
];

// Socios fixos que viram colunas em todas as planilhas. Outros sócios
// (Desc, Barry, etc.) podem ser preenchidos manualmente pelo usuario.
const SOCIOS_FIXOS = ['314', 'Alma', 'Balada'];

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

  // Decide pasta destino:
  // 1) Se GOOGLE_DRIVE_FOLDER_ID estiver setado, usa ele (forca pasta destino).
  // 2) Senao, tenta usar a mesma pasta do template.
  let parents = [];
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
  } else {
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

  console.log(`[sheets] planilha criada do template evento=${eventoId} sheet=${newSheetId} nome="${nomeEvento}" pasta=${parents[0] || 'raiz'}`);
  return { ok: true, google_sheet_id: newSheetId, nome: nomeEvento };
}

// Garante que uma aba especifica existe na planilha; cria se nao existir.
async function garantirAba(sheets, spreadsheetId, titulo, cols = 12) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existe = (meta.data.sheets || []).some(s => s.properties && s.properties.title === titulo);
  if (existe) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: titulo, gridProperties: { rowCount: 500, columnCount: cols } } } }],
    },
  });
}

// Remove abas antigas (migracao) se existirem
async function removerAbasAntigas(sheets, spreadsheetId) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const toDelete = (meta.data.sheets || [])
      .filter(s => ABAS_ANTIGAS.includes(s.properties?.title))
      .map(s => ({ deleteSheet: { sheetId: s.properties.sheetId } }));
    if (toDelete.length === 0) return;
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: toDelete } });
    console.log(`[sheets] removidas abas antigas: ${toDelete.length}`);
  } catch (e) { /* ignora */ }
}

function linhasDespesas(despesas) {
  const linhas = [['ID', 'Descricao', 'Categoria', 'Quantidade', 'Valor Unit.', 'Valor Total', 'Fornecedor', 'Fonte Pagamento', 'Data', 'Vencimento', 'Falta Pagar', 'Situacao']];
  for (const d of despesas) {
    linhas.push([
      d.id, d.descricao || '', d.centro_custo || '',
      Number(d.quantidade || 0), Number(d.valor_unitario || 0), Number(d.valor || 0),
      d.fornecedor || '', d.fonte_pagamento || '',
      d.data || '', d.data_vencimento ? String(d.data_vencimento).slice(0, 10) : '',
      Number(d.falta_pagar || 0), d.situacao || '',
    ]);
  }
  return linhas;
}

function linhasReceitas(receitas) {
  const linhas = [['ID', 'Descricao', 'Categoria', 'Valor', 'Conta', 'Data Pagamento', 'Situacao']];
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

// Cores reutilizadas no layout
const COR_HEADER = { red: 0.13, green: 0.27, blue: 0.48 };       // azul escuro
const COR_HEADER_TX = { red: 1, green: 1, blue: 1 };              // branco
const COR_CATEGORIA = { red: 0.99, green: 0.91, blue: 0.62 };     // amarelo claro
const COR_SUBTOTAL = { red: 0.87, green: 0.87, blue: 0.87 };      // cinza claro
const COR_TOTAL = { red: 0.20, green: 0.40, blue: 0.20 };         // verde escuro
const COR_RECEITA = { red: 0.78, green: 0.91, blue: 0.78 };       // verde claro

// Helper para converter indice 0-based em letra de coluna (0->A, 1->B, ...)
function colLetter(idx) {
  let s = '', n = idx;
  while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; }
  return s;
}

// Gera/regrava a aba "Financeiro" com layout formatado fiel ao template
// Hungria Varginha (categorias agrupadas, sub-totais, socios em colunas,
// bordero de receitas, resultado). Itens vem das despesas/receitas do
// evento. Aplica cores, bold, formato moeda BRL e borders via batchUpdate.
async function gerarAbaFinanceiroFormatada(sheets, spreadsheetId, evento, despesas, receitas) {
  const NCOLS = 4 + SOCIOS_FIXOS.length + 1; // Descricao, Qtd, Vlr Uni, Vlr Total, [socios], Falta Pagar
  const colTotal = 3; // D
  const colsSocio = SOCIOS_FIXOS.map((_, i) => 4 + i); // E, F, G
  const colFalta = NCOLS - 1; // ultima

  // Garante aba e pega sheetId
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  let sheetInfo = (meta.data.sheets || []).find(s => s.properties?.title === ABA_FINANCEIRO);
  if (!sheetInfo) {
    const r = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: ABA_FINANCEIRO, gridProperties: { rowCount: 300, columnCount: NCOLS + 2 } } } }] }
    });
    sheetInfo = { properties: r.data.replies[0].addSheet.properties };
  }
  const sheetId = sheetInfo.properties.sheetId;

  // Agrupa despesas por categoria (na ordem definida)
  const grupos = {};
  for (const cat of CATEGORIAS_ORDEM) grupos[cat] = [];
  const semCategoria = [];
  for (const d of despesas) {
    if (grupos[d.centro_custo]) grupos[d.centro_custo].push(d);
    else semCategoria.push(d);
  }
  if (semCategoria.length) grupos['Outros'] = grupos['Outros'].concat(semCategoria);

  // Monta as linhas e rastreia ranges pra formatacao
  const rows = [];
  const fmt = []; // requests de formatacao
  const subtotaisD = []; // refs pra somar no VALOR TOTAL (col D)
  const subtotaisSocios = {}; // {colIdx: [refs]}
  for (const c of colsSocio) subtotaisSocios[c] = [];
  const subtotaisFalta = [];

  // Helper pra registrar formatRequest
  function repeatCell(r0, r1, c0, c1, format) {
    fmt.push({
      repeatCell: {
        range: { sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 },
        cell: { userEnteredFormat: format },
        fields: 'userEnteredFormat(' + Object.keys(format).join(',') + ')'
      }
    });
  }

  // ===== LINHA 1: titulo do evento =====
  const titulo = String(evento.nome || `Evento ${evento.id}`).toUpperCase();
  rows.push([titulo]);
  // merge das colunas 0..NCOLS
  fmt.push({
    mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: NCOLS }, mergeType: 'MERGE_ALL' }
  });
  repeatCell(0, 1, 0, NCOLS, {
    backgroundColor: COR_HEADER,
    textFormat: { foregroundColor: COR_HEADER_TX, bold: true, fontSize: 14 },
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'MIDDLE'
  });

  // ===== LINHA 2: vazio =====
  rows.push([]);

  // ===== LINHA 3: header geral =====
  const headerGeral = ['Descrição', 'Quantidade', 'Valor Uni', 'Valor Total'];
  for (const s of SOCIOS_FIXOS) headerGeral.push(s);
  headerGeral.push('FALTA PAGAR');
  rows.push(headerGeral);
  repeatCell(2, 3, 0, NCOLS, {
    backgroundColor: COR_HEADER,
    textFormat: { foregroundColor: COR_HEADER_TX, bold: true },
    horizontalAlignment: 'CENTER'
  });

  let cursor = 3; // proxima linha (0-based: rows[3] sera a 4a linha visual)

  // ===== POR CATEGORIA =====
  for (const cat of CATEGORIAS_ORDEM) {
    const itens = grupos[cat];

    // Linha da categoria (cabecalho colorido)
    const catRow = new Array(NCOLS).fill('');
    catRow[0] = cat;
    rows.push(catRow);
    repeatCell(cursor, cursor + 1, 0, NCOLS, {
      backgroundColor: COR_CATEGORIA,
      textFormat: { bold: true, fontSize: 11 }
    });
    cursor++;

    const startItens = cursor;

    // Itens
    for (const d of itens) {
      const qtd = Number(d.quantidade || 0);
      const vu = Number(d.valor_unitario || 0);
      const vt = Number(d.valor || 0);
      const falta = Number(d.falta_pagar || 0);
      const fonte = d.fonte_pagamento || '';
      const linha = [d.descricao || '', qtd, vu, vt];
      for (const s of SOCIOS_FIXOS) linha.push(fonte === s ? vt : '');
      linha.push(falta);
      rows.push(linha);
      cursor++;
    }

    // Linha em branco interna se categoria sem itens (mantém layout consistente)
    if (itens.length === 0) {
      rows.push(new Array(NCOLS).fill(''));
      cursor++;
    }

    const endItens = cursor; // exclusivo

    // SUB TOTAL com formula SUM
    const subRow = new Array(NCOLS).fill('');
    subRow[0] = 'SUB TOTAL';
    if (itens.length > 0) {
      const c = colLetter(colTotal); // D
      subRow[colTotal] = `=SUM(${c}${startItens + 1}:${c}${endItens})`;
      for (const cs of colsSocio) {
        const cl = colLetter(cs);
        subRow[cs] = `=SUM(${cl}${startItens + 1}:${cl}${endItens})`;
      }
      const cf = colLetter(colFalta);
      subRow[colFalta] = `=SUM(${cf}${startItens + 1}:${cf}${endItens})`;
    }
    rows.push(subRow);
    repeatCell(cursor, cursor + 1, 0, NCOLS, {
      backgroundColor: COR_SUBTOTAL,
      textFormat: { bold: true }
    });
    // Rastreia subtotal pra somar no VALOR TOTAL
    subtotaisD.push(`${colLetter(colTotal)}${cursor + 1}`);
    for (const cs of colsSocio) subtotaisSocios[cs].push(`${colLetter(cs)}${cursor + 1}`);
    subtotaisFalta.push(`${colLetter(colFalta)}${cursor + 1}`);
    cursor++;
  }

  // ===== VALOR TOTAL geral =====
  const totRow = new Array(NCOLS).fill('');
  totRow[0] = 'VALOR TOTAL';
  totRow[colTotal] = `=${subtotaisD.join('+')}`;
  for (const cs of colsSocio) totRow[cs] = `=${subtotaisSocios[cs].join('+')}`;
  totRow[colFalta] = `=${subtotaisFalta.join('+')}`;
  rows.push(totRow);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_TOTAL,
    textFormat: { foregroundColor: COR_HEADER_TX, bold: true, fontSize: 12 }
  });
  const linhaValorTotal = cursor + 1;
  cursor++;

  // ===== Linhas em branco =====
  rows.push([]); rows.push([]); cursor += 2;

  // ===== BORDERO DE RECEITAS =====
  rows.push(['BORDERO DE RECEITAS']);
  fmt.push({
    mergeCells: { range: { sheetId, startRowIndex: cursor, endRowIndex: cursor + 1, startColumnIndex: 0, endColumnIndex: NCOLS }, mergeType: 'MERGE_ALL' }
  });
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_HEADER,
    textFormat: { foregroundColor: COR_HEADER_TX, bold: true, fontSize: 12 },
    horizontalAlignment: 'CENTER'
  });
  cursor++;

  // Header receitas
  rows.push(['Descrição', '', '', 'Valor Total', 'Conta', '', '', '']);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_RECEITA,
    textFormat: { bold: true }
  });
  cursor++;
  const startReceitas = cursor;

  // Itens receitas
  for (const r of receitas) {
    const linha = new Array(NCOLS).fill('');
    linha[0] = r.descricao || '';
    linha[colTotal] = Number(r.valor || 0);
    linha[4] = r.conta || '';
    rows.push(linha);
    cursor++;
  }
  const endReceitas = cursor;

  // TOTAL DE RECEITA
  const totRecRow = new Array(NCOLS).fill('');
  totRecRow[0] = 'TOTAL DE RECEITA';
  if (receitas.length > 0) {
    const c = colLetter(colTotal);
    totRecRow[colTotal] = `=SUM(${c}${startReceitas + 1}:${c}${endReceitas})`;
  }
  rows.push(totRecRow);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_SUBTOTAL,
    textFormat: { bold: true }
  });
  const linhaTotalReceita = cursor + 1;
  cursor++;

  // Espaco
  rows.push([]); cursor++;

  // ===== RESULTADO DO EVENTO =====
  rows.push(['RESULTADO DO EVENTO']);
  fmt.push({
    mergeCells: { range: { sheetId, startRowIndex: cursor, endRowIndex: cursor + 1, startColumnIndex: 0, endColumnIndex: NCOLS }, mergeType: 'MERGE_ALL' }
  });
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_HEADER,
    textFormat: { foregroundColor: COR_HEADER_TX, bold: true, fontSize: 12 },
    horizontalAlignment: 'CENTER'
  });
  cursor++;

  rows.push(['Total de Receitas', '', '', `=${colLetter(colTotal)}${linhaTotalReceita}`]);
  cursor++;
  rows.push(['Total de Despesas', '', '', `=${colLetter(colTotal)}${linhaValorTotal}`]);
  cursor++;
  rows.push(['LUCRO / PREJUÍZO', '', '', `=${colLetter(colTotal)}${cursor - 1}-${colLetter(colTotal)}${cursor}`]);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_TOTAL,
    textFormat: { foregroundColor: COR_HEADER_TX, bold: true, fontSize: 12 }
  });
  cursor++;

  // Limpa tudo e escreve
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${ABA_FINANCEIRO}!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${ABA_FINANCEIRO}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows }
  });

  // Limpa formatacao anterior antes de aplicar nova (evita acumulo de merges)
  // Aplica formatacao
  // Adiciona tambem: formato moeda BRL nas colunas de valor (Total + sócios + Falta)
  const colsMoeda = [colTotal, ...colsSocio, colFalta];
  for (const c of colsMoeda) {
    fmt.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: cursor, startColumnIndex: c, endColumnIndex: c + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'R$ #,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    });
  }
  // Auto-resize colunas
  fmt.push({
    autoResizeDimensions: {
      dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: NCOLS }
    }
  });

  if (fmt.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: fmt } });
  }
}

// Sincroniza o evento na planilha. Idempotente: limpa as abas EventHub
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

  // Garante 2 abas separadas e remove abas antigas (migracao)
  await garantirAba(sheets, spreadsheetId, ABA_DESPESAS, 12);
  await garantirAba(sheets, spreadsheetId, ABA_RECEITAS, 7);
  await removerAbasAntigas(sheets, spreadsheetId);

  // Limpa e regrava DESPESAS
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${ABA_DESPESAS}!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${ABA_DESPESAS}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: linhasDespesas(despesas) },
  });

  // Limpa e regrava RECEITAS
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${ABA_RECEITAS}!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${ABA_RECEITAS}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: linhasReceitas(receitas) },
  });

  // Aba bonita formatada (layout fiel ao template)
  try {
    await gerarAbaFinanceiroFormatada(sheets, spreadsheetId, evento, despesas, receitas);
  } catch (e) {
    // Nao bloqueia o sync se a parte visual falhar
    console.error(`[sheets] erro ao gerar aba ${ABA_FINANCEIRO} evento=${eventoId}:`, e.message);
  }

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
