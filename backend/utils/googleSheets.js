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
const SOCIOS_FIXOS = ['314', 'Alma', 'Balada', 'Gustavo', 'Bar'];

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

// Cores fieis ao template Hungria Varginha
const COR_CINZA = { red: 0.80, green: 0.80, blue: 0.80 };          // #cccccc
const COR_LARANJA_CLARO = { red: 0.976, green: 0.796, blue: 0.608 };// #f9cb9b
const COR_LARANJA_ESCURO = { red: 0.964, green: 0.694, blue: 0.416 };// #f6b16a
const COR_VERDE_CLARO = { red: 0.827, green: 0.945, blue: 0.859 };  // #d3f1db
const COR_BRANCO = { red: 1, green: 1, blue: 1 };
const COR_PRETO = { red: 0, green: 0, blue: 0 };

// Helper para converter indice 0-based em letra de coluna (0->A, 1->B, ...)
function colLetter(idx) {
  let s = '', n = idx;
  while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; }
  return s;
}

// Gera/regrava a aba "Financeiro" com layout fiel ao template Hungria
// Varginha. Constantes de layout:
//   colA = Descrição
//   colB = Quantidade
//   colC = Valor Uni
//   colD = Valor Total
//   colE..colI = sócios (314, Alma, Balada, Gustavo, Bar)
//   colJ = FALTA PAGAR
// Cores: cinza topo, laranja claro nos headers/subtotais, laranja escuro
// nas linhas de categoria, verde claro na coluna FALTA PAGAR dos itens.
async function gerarAbaFinanceiroFormatada(sheets, spreadsheetId, evento, despesas, receitas) {
  const NSOCIOS = SOCIOS_FIXOS.length;
  const COL_DESC = 0;
  const COL_QTD = 1;
  const COL_VU = 2;
  const COL_VT = 3;
  const COL_SOCIO0 = 4;
  const COL_FALTA = COL_SOCIO0 + NSOCIOS;
  const NCOLS = COL_FALTA + 1;

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

  // Limpa formatacao + merges anteriores (evita acumulo entre re-syncs)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { unmergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 300, startColumnIndex: 0, endColumnIndex: NCOLS + 2 } } },
        { updateCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 300, startColumnIndex: 0, endColumnIndex: NCOLS + 2 }, fields: 'userEnteredFormat' } },
      ]
    }
  });
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${ABA_FINANCEIRO}!A:Z` });

  // Agrupa despesas por categoria
  const grupos = {};
  for (const cat of CATEGORIAS_ORDEM) grupos[cat] = [];
  const semCategoria = [];
  for (const d of despesas) {
    if (grupos[d.centro_custo]) grupos[d.centro_custo].push(d);
    else semCategoria.push(d);
  }
  if (semCategoria.length) grupos['Outros'] = grupos['Outros'].concat(semCategoria);

  const rows = [];
  const fmt = [];
  let cursor = 0;

  function repeatCell(r0, r1, c0, c1, format) {
    fmt.push({
      repeatCell: {
        range: { sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 },
        cell: { userEnteredFormat: format },
        fields: 'userEnteredFormat(' + Object.keys(format).join(',') + ')'
      }
    });
  }
  function merge(r0, r1, c0, c1) {
    fmt.push({ mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 }, mergeType: 'MERGE_ALL' } });
  }

  // ===== Linha 1: TITULO (cinza) =====
  rows.push([String(evento.nome || `Evento ${evento.id}`).toUpperCase()]);
  merge(0, 1, 0, NCOLS);
  repeatCell(0, 1, 0, NCOLS, {
    backgroundColor: COR_CINZA,
    textFormat: { bold: true, fontSize: 14 },
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'MIDDLE'
  });
  cursor++;

  // ===== Linha 2: vazia cinza =====
  rows.push([]);
  repeatCell(1, 2, 0, NCOLS, { backgroundColor: COR_CINZA });
  cursor++;

  // ===== Linha 3: header geral (laranja claro) =====
  // Descrição | Quantidade | Valor Uni | Valor Total | PAGAMENTOS (merge E-I) | FALTA PAGAR
  const headerRow = new Array(NCOLS).fill('');
  headerRow[COL_DESC] = 'Descrição';
  headerRow[COL_QTD] = 'Quantidade';
  headerRow[COL_VU] = 'Valor Uni';
  headerRow[COL_VT] = 'Valor Total';
  headerRow[COL_SOCIO0] = 'PAGAMENTOS';
  headerRow[COL_FALTA] = 'FALTA PAGAR';
  rows.push(headerRow);
  merge(2, 3, COL_SOCIO0, COL_FALTA); // PAGAMENTOS ocupa E até I
  repeatCell(2, 3, 0, NCOLS, {
    backgroundColor: COR_LARANJA_CLARO,
    textFormat: { bold: true },
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'MIDDLE'
  });
  cursor++;

  // Rastreia subtotais pra somar no VALOR TOTAL geral
  const subRefs = { D: [], socios: SOCIOS_FIXOS.map(() => []), falta: [] };

  // ===== POR CATEGORIA =====
  for (const cat of CATEGORIAS_ORDEM) {
    const itens = grupos[cat];

    // Linha da categoria (merge A:D + socios em E-I + FALTA PAGAR em J) - laranja escuro
    const catRow = new Array(NCOLS).fill('');
    catRow[COL_DESC] = cat;
    for (let i = 0; i < NSOCIOS; i++) catRow[COL_SOCIO0 + i] = SOCIOS_FIXOS[i];
    catRow[COL_FALTA] = 'FALTA PAGAR';
    rows.push(catRow);
    merge(cursor, cursor + 1, COL_DESC, COL_SOCIO0); // merge A-D
    repeatCell(cursor, cursor + 1, 0, NCOLS, {
      backgroundColor: COR_LARANJA_ESCURO,
      textFormat: { bold: true },
      horizontalAlignment: 'CENTER'
    });
    cursor++;

    const startItens = cursor; // 0-based, linha que será a 1ª de itens

    // Itens
    for (const d of itens) {
      const qtd = Number(d.quantidade || 0);
      const vu = Number(d.valor_unitario || 0);
      const vt = Number(d.valor || 0);
      const falta = Number(d.falta_pagar || 0);
      const fonte = d.fonte_pagamento || '';
      const linha = new Array(NCOLS).fill('');
      linha[COL_DESC] = d.descricao || '';
      linha[COL_QTD] = qtd;
      linha[COL_VU] = vu;
      linha[COL_VT] = vt;
      for (let i = 0; i < NSOCIOS; i++) {
        linha[COL_SOCIO0 + i] = fonte === SOCIOS_FIXOS[i] ? vt : '';
      }
      linha[COL_FALTA] = falta;
      rows.push(linha);
      cursor++;
    }

    const endItens = cursor; // exclusivo

    // Coluna J (FALTA PAGAR) das linhas de itens: fundo verde claro
    if (itens.length > 0) {
      repeatCell(startItens, endItens, COL_FALTA, COL_FALTA + 1, { backgroundColor: COR_VERDE_CLARO });
    }

    // SUB TOTAL (laranja claro)
    const subRow = new Array(NCOLS).fill('');
    subRow[COL_DESC] = 'SUB TOTAL';
    if (itens.length > 0) {
      subRow[COL_VT] = `=SUM(${colLetter(COL_VT)}${startItens + 1}:${colLetter(COL_VT)}${endItens})`;
      for (let i = 0; i < NSOCIOS; i++) {
        const col = colLetter(COL_SOCIO0 + i);
        subRow[COL_SOCIO0 + i] = `=SUM(${col}${startItens + 1}:${col}${endItens})`;
      }
      subRow[COL_FALTA] = `=SUM(${colLetter(COL_FALTA)}${startItens + 1}:${colLetter(COL_FALTA)}${endItens})`;
    }
    rows.push(subRow);
    repeatCell(cursor, cursor + 1, 0, NCOLS, {
      backgroundColor: COR_LARANJA_CLARO,
      textFormat: { bold: true }
    });
    // Rastreia subtotal
    subRefs.D.push(`${colLetter(COL_VT)}${cursor + 1}`);
    for (let i = 0; i < NSOCIOS; i++) subRefs.socios[i].push(`${colLetter(COL_SOCIO0 + i)}${cursor + 1}`);
    subRefs.falta.push(`${colLetter(COL_FALTA)}${cursor + 1}`);
    cursor++;
  }

  // ===== VALOR TOTAL geral (laranja escuro) =====
  const totRow = new Array(NCOLS).fill('');
  totRow[COL_DESC] = 'VALOR TOTAL';
  totRow[COL_VT] = `=${subRefs.D.join('+')}`;
  for (let i = 0; i < NSOCIOS; i++) totRow[COL_SOCIO0 + i] = `=${subRefs.socios[i].join('+')}`;
  totRow[COL_FALTA] = `=${subRefs.falta.join('+')}`;
  rows.push(totRow);
  merge(cursor, cursor + 1, COL_DESC, COL_VT);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_LARANJA_ESCURO,
    textFormat: { bold: true, fontSize: 12 },
    horizontalAlignment: 'CENTER'
  });
  const linhaValorTotal = cursor + 1;
  cursor++;

  // ===== Linhas em branco =====
  rows.push([]); rows.push([]); cursor += 2;

  // ===== BORDERO DE RECEITAS (cinza) =====
  const bordRow = new Array(NCOLS).fill('');
  bordRow[COL_DESC] = 'BORDERO DE RECEITAS';
  rows.push(bordRow);
  merge(cursor, cursor + 1, 0, NCOLS);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_CINZA,
    textFormat: { bold: true, fontSize: 12 },
    horizontalAlignment: 'CENTER'
  });
  cursor++;

  // Header receitas (laranja claro)
  const hRec = new Array(NCOLS).fill('');
  hRec[COL_DESC] = 'Descrição';
  hRec[COL_VT] = 'Valor Total';
  hRec[COL_SOCIO0] = 'Conta';
  rows.push(hRec);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_LARANJA_CLARO,
    textFormat: { bold: true }
  });
  cursor++;
  const startRec = cursor;

  for (const r of receitas) {
    const linha = new Array(NCOLS).fill('');
    linha[COL_DESC] = r.descricao || '';
    linha[COL_VT] = Number(r.valor || 0);
    linha[COL_SOCIO0] = r.conta || '';
    rows.push(linha);
    cursor++;
  }
  const endRec = cursor;

  // TOTAL DE RECEITA
  const totRecRow = new Array(NCOLS).fill('');
  totRecRow[COL_DESC] = 'TOTAL DE RECEITA';
  if (receitas.length > 0) {
    totRecRow[COL_VT] = `=SUM(${colLetter(COL_VT)}${startRec + 1}:${colLetter(COL_VT)}${endRec})`;
  }
  rows.push(totRecRow);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_LARANJA_CLARO,
    textFormat: { bold: true }
  });
  const linhaTotalReceita = cursor + 1;
  cursor++;

  rows.push([]); cursor++;

  // ===== RESULTADO DO EVENTO (cinza) =====
  const resHeader = new Array(NCOLS).fill('');
  resHeader[COL_DESC] = 'RESULTADO DO EVENTO';
  rows.push(resHeader);
  merge(cursor, cursor + 1, 0, NCOLS);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_CINZA,
    textFormat: { bold: true, fontSize: 12 },
    horizontalAlignment: 'CENTER'
  });
  cursor++;

  const rowReceita = new Array(NCOLS).fill('');
  rowReceita[COL_DESC] = 'Total de Receitas';
  rowReceita[COL_VT] = `=${colLetter(COL_VT)}${linhaTotalReceita}`;
  rows.push(rowReceita);
  cursor++;
  const linhaRowReceita = cursor;

  const rowDespesa = new Array(NCOLS).fill('');
  rowDespesa[COL_DESC] = 'Total de Despesas';
  rowDespesa[COL_VT] = `=${colLetter(COL_VT)}${linhaValorTotal}`;
  rows.push(rowDespesa);
  cursor++;
  const linhaRowDespesa = cursor;

  const rowLucro = new Array(NCOLS).fill('');
  rowLucro[COL_DESC] = 'LUCRO / PREJUÍZO';
  rowLucro[COL_VT] = `=${colLetter(COL_VT)}${linhaRowReceita}-${colLetter(COL_VT)}${linhaRowDespesa}`;
  rows.push(rowLucro);
  repeatCell(cursor, cursor + 1, 0, NCOLS, {
    backgroundColor: COR_LARANJA_ESCURO,
    textFormat: { bold: true, fontSize: 12 }
  });
  cursor++;

  // Escreve valores
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${ABA_FINANCEIRO}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows }
  });

  // Formato moeda BRL nas colunas de valor — APENAS a partir da linha 4
  // (linha 3 é header geral, linhas 1-2 são titulo, e essa formatacao em
  // headers fazia o sócio "314" aparecer como "R$ 314,00").
  const colsMoeda = [COL_VT];
  for (let i = 0; i < NSOCIOS; i++) colsMoeda.push(COL_SOCIO0 + i);
  colsMoeda.push(COL_FALTA);
  for (const c of colsMoeda) {
    fmt.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 4, endRowIndex: cursor, startColumnIndex: c, endColumnIndex: c + 1 },
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
