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

// Socios FIXOS que aparecem em TODA planilha de evento (sempre essas 2 colunas).
// Outros pagadores cadastrados no link do comprovante ("+ criar nova conta")
// viram colunas EXTRAS por evento, adicionadas dinamicamente entre Alma e
// FALTA PAGAR conforme aparecerem em despesas/receitas daquele evento.
const SOCIOS_FIXOS = ['314', 'Alma'];

// Layout FIXO do template Hungria Varginha. Cada categoria ocupa um bloco
// de tamanho fixo (linha do titulo, N linhas de itens, linha de subtotal).
// Se evento tiver mais despesas que o bloco comporta, as extras sao
// dropadas com log. Categorias do template sem mapeamento ficam visuais
// mas vazias.
const TEMPLATE_CATEGORIAS = [
  { titulo: 'Artistas',                       linhaTitulo: 5,   itens: 5,  eventHubCats: ['Artistico'] },
  { titulo: 'Hotel, logística',               linhaTitulo: 12,  itens: 8,  eventHubCats: ['Logistica/Camarim'] },
  { titulo: 'Estrutura do evento',            linhaTitulo: 22,  itens: 13, eventHubCats: ['Estrutura do Evento'] },
  { titulo: 'Divulgação e Mídias',            linhaTitulo: 37,  itens: 15, eventHubCats: ['Divulgacao e Midia'] },
  { titulo: 'Operacional',                    linhaTitulo: 54,  itens: 9,  eventHubCats: ['Operacional'] },
  { titulo: 'Logística de Bar e Alimentação', linhaTitulo: 65,  itens: 23, eventHubCats: ['Bar', 'Alimentacao'] },
  { titulo: 'Taxas Operacionais e Sistema',   linhaTitulo: 90,  itens: 6,  eventHubCats: [] },
  { titulo: 'Camarim',                        linhaTitulo: 98,  itens: 5,  eventHubCats: [] },
  { titulo: 'Documentações Necessárias',      linhaTitulo: 105, itens: 8,  eventHubCats: ['Documentacao e Taxas'] },
  { titulo: 'Outros',                         linhaTitulo: 115, itens: 15, eventHubCats: ['Outros'] },
];

const LINHA_VALOR_TOTAL = 132;
const LINHA_BORDERO = 136;
const LINHA_HEADER_REC = 137;
const LINHA_REC_INICIO = 138;
const LINHA_REC_FIM = 142; // 5 linhas: 138-142
const LINHA_TOTAL_REC = 143;
const LINHA_RESULTADO = 145;
const TOTAL_LINHAS = 145; // planilha termina no RESULTADO DO EVENTO

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

// Gera/regrava a aba "Financeiro" com layout 100% FIXO replicando o template
// Hungria Varginha. Posicoes de linhas, mesclagens, cores e larguras de
// coluna sao constantes — apenas dados (descrições, qtd, valor, sócio) sao
// dinamicos. Categorias do template sem mapeamento no EventHub ficam visuais
// mas vazias.
async function gerarAbaFinanceiroFormatada(sheets, spreadsheetId, evento, despesas, receitas, socios) {
  // socios = [SOCIOS_FIXOS] + extras dinamicos do evento (passado por sincronizarEvento).
  // Layout tem largura variavel: 4 colunas fixas (Desc, Qtd, VU, VT) + N socios + 1 FALTA PAGAR.
  // === COLUNAS ===
  const COL_DESC = 0, COL_QTD = 1, COL_VU = 2, COL_VT = 3;
  const COL_SOCIO0 = 4;
  const NSOCIOS = socios.length;
  const COL_FALTA = COL_SOCIO0 + NSOCIOS;
  const NCOLS = COL_FALTA + 1;

  // Larguras: 4 colunas iniciais + N socios (~120px cada) + FALTA PAGAR
  const LARGURAS_PX = [255, 101, 104, 117];
  for (let i = 0; i < NSOCIOS; i++) LARGURAS_PX.push(120);
  LARGURAS_PX.push(104);

  // Garante aba e pega sheetId
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  let sheetInfo = (meta.data.sheets || []).find(s => s.properties?.title === ABA_FINANCEIRO);
  if (!sheetInfo) {
    const r = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: ABA_FINANCEIRO, gridProperties: { rowCount: TOTAL_LINHAS, columnCount: NCOLS } } } }] }
    });
    sheetInfo = { properties: r.data.replies[0].addSheet.properties };
  }
  const sheetId = sheetInfo.properties.sheetId;

  // === RESET ===
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${ABA_FINANCEIRO}!A:Z` });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Forca rowCount = TOTAL_LINHAS (encolhe se aba foi criada maior)
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { rowCount: TOTAL_LINHAS, columnCount: NCOLS } },
            fields: 'gridProperties.rowCount,gridProperties.columnCount'
          }
        },
        { unmergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: TOTAL_LINHAS, startColumnIndex: 0, endColumnIndex: NCOLS } } },
        { updateCells: { range: { sheetId, startRowIndex: 0, endRowIndex: TOTAL_LINHAS, startColumnIndex: 0, endColumnIndex: NCOLS }, fields: 'userEnteredFormat' } },
        // Larguras de coluna
        ...LARGURAS_PX.map((px, i) => ({
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px },
            fields: 'pixelSize'
          }
        })),
      ]
    }
  });

  // === AGRUPA DESPESAS POR CATEGORIA EVENTHUB ===
  const porCategoria = {};
  for (const d of despesas) {
    const k = d.centro_custo || 'Outros';
    if (!porCategoria[k]) porCategoria[k] = [];
    porCategoria[k].push(d);
  }

  // === MONTA VALORES (formato grid 2D, indexado por linha 1-based) ===
  const grid = [];
  for (let i = 0; i < TOTAL_LINHAS; i++) grid.push(new Array(NCOLS).fill(''));
  function set(linha1, col, val) { grid[linha1 - 1][col] = val; }
  function L(c) { return String.fromCharCode(65 + c); }

  // Linha 1: titulo do evento (merge A:J, cinza)
  set(1, COL_DESC, String(evento.nome || `Evento ${evento.id}`).toUpperCase());

  // Linha 3: header geral
  set(3, COL_DESC, 'Descrição');
  set(3, COL_QTD, 'Quantidade');
  set(3, COL_VU, 'Valor Uni');
  set(3, COL_VT, 'Valor Total');
  set(3, COL_SOCIO0, 'PAGAMENTOS'); // merge E:I na linha 3
  set(3, COL_FALTA, 'FALTA PAGAR');

  // Categorias e itens
  const subtotaisD = []; // refs pro VALOR TOTAL
  const subtotaisSocios = socios.map(() => []);
  const subtotaisFalta = [];

  for (const cat of TEMPLATE_CATEGORIAS) {
    const linhaCat = cat.linhaTitulo;
    const primeiraItem = linhaCat + 1;
    const ultimaItem = linhaCat + cat.itens;
    const linhaSub = ultimaItem + 1;

    // Linha do título (merge A:D)
    set(linhaCat, COL_DESC, cat.titulo);
    // Sócios e FALTA PAGAR repetidos na linha de categoria
    for (let i = 0; i < NSOCIOS; i++) set(linhaCat, COL_SOCIO0 + i, socios[i]);
    set(linhaCat, COL_FALTA, 'FALTA PAGAR');

    // Coleta despesas mapeadas pra essa categoria do template
    let despesasDaCat = [];
    for (const ev of cat.eventHubCats) {
      if (porCategoria[ev]) despesasDaCat = despesasDaCat.concat(porCategoria[ev]);
    }

    // Avisa se overflow
    if (despesasDaCat.length > cat.itens) {
      console.warn(`[sheets] categoria "${cat.titulo}" tem ${despesasDaCat.length} despesas mas só cabe ${cat.itens}. Drop das extras.`);
      despesasDaCat = despesasDaCat.slice(0, cat.itens);
    }

    // Preenche itens
    for (let i = 0; i < despesasDaCat.length; i++) {
      const linha = primeiraItem + i;
      const d = despesasDaCat[i];
      const qtd = Number(d.quantidade || 1);
      const vu = Number(d.valor_unitario || d.valor || 0);
      const fonte = d.fonte_pagamento || '';

      set(linha, COL_DESC, d.descricao || '');
      set(linha, COL_QTD, qtd);
      set(linha, COL_VU, vu);
      // D = B*C (fórmula)
      set(linha, COL_VT, `=B${linha}*C${linha}`);
      // Sócio: coloca valor total na coluna do sócio se fonte bater
      for (let s = 0; s < NSOCIOS; s++) {
        if (fonte === socios[s]) {
          set(linha, COL_SOCIO0 + s, `=D${linha}`);
        }
      }
      // J = D - soma(colunas de socios)
      const fontesSomadas = [];
      for (let s = 0; s < NSOCIOS; s++) fontesSomadas.push(`${L(COL_SOCIO0 + s)}${linha}`);
      set(linha, COL_FALTA, `=D${linha}-(${fontesSomadas.join('+')})`);
    }

    // Linha do subtotal
    set(linhaSub, COL_DESC, 'SUB TOTAL');
    set(linhaSub, COL_VT, `=SUM(D${primeiraItem}:D${ultimaItem})`);
    for (let s = 0; s < NSOCIOS; s++) {
      const cl = L(COL_SOCIO0 + s);
      set(linhaSub, COL_SOCIO0 + s, `=SUM(${cl}${primeiraItem}:${cl}${ultimaItem})`);
    }
    set(linhaSub, COL_FALTA, `=SUM(J${primeiraItem}:J${ultimaItem})`);

    subtotaisD.push(`D${linhaSub}`);
    for (let s = 0; s < NSOCIOS; s++) subtotaisSocios[s].push(`${L(COL_SOCIO0 + s)}${linhaSub}`);
    subtotaisFalta.push(`J${linhaSub}`);
  }

  // VALOR TOTAL linha 132
  set(LINHA_VALOR_TOTAL, COL_DESC, 'VALOR TOTAL');
  set(LINHA_VALOR_TOTAL, COL_VT, `=${subtotaisD.join('+')}`);
  for (let s = 0; s < NSOCIOS; s++) set(LINHA_VALOR_TOTAL, COL_SOCIO0 + s, `=${subtotaisSocios[s].join('+')}`);
  set(LINHA_VALOR_TOTAL, COL_FALTA, `=${subtotaisFalta.join('+')}`);

  // BORDERO DE RECEITAS linha 136 (merge A:I conforme spec)
  set(LINHA_BORDERO, COL_DESC, 'BORDERO DE RECEITAS');

  // Header receitas linha 137 (merge A:C, D = VALOR TOTAL, E-I = sócios)
  set(LINHA_HEADER_REC, COL_DESC, 'DESCRIÇÃO');
  set(LINHA_HEADER_REC, COL_VT, 'VALOR TOTAL');
  for (let i = 0; i < NSOCIOS; i++) set(LINHA_HEADER_REC, COL_SOCIO0 + i, socios[i]);

  // Receitas 138-142 (5 slots, com sócios igual despesas)
  const recsCabe = receitas.slice(0, LINHA_REC_FIM - LINHA_REC_INICIO + 1);
  if (receitas.length > recsCabe.length) {
    console.warn(`[sheets] ${receitas.length} receitas mas só cabe ${recsCabe.length}. Drop das extras.`);
  }
  for (let i = 0; i < recsCabe.length; i++) {
    const linha = LINHA_REC_INICIO + i;
    const r = recsCabe[i];
    const vt = Number(r.valor || 0);
    const conta = r.conta || '';
    set(linha, COL_DESC, r.descricao || '');
    set(linha, COL_VT, vt);
    // Se a conta bater com algum sócio, marca o valor na coluna dele
    for (let s = 0; s < NSOCIOS; s++) {
      if (conta === socios[s]) {
        set(linha, COL_SOCIO0 + s, `=D${linha}`);
      }
    }
  }

  // TOTAL DE RECEITA linha 143 (somatorio por coluna)
  set(LINHA_TOTAL_REC, COL_DESC, 'TOTAL DE RECEITA');
  set(LINHA_TOTAL_REC, COL_VT, `=SUM(D${LINHA_REC_INICIO}:D${LINHA_REC_FIM})`);
  for (let s = 0; s < NSOCIOS; s++) {
    const cl = L(COL_SOCIO0 + s);
    set(LINHA_TOTAL_REC, COL_SOCIO0 + s, `=SUM(${cl}${LINHA_REC_INICIO}:${cl}${LINHA_REC_FIM})`);
  }

  // RESULTADO DO EVENTO linha 145 (merge B:C)
  set(LINHA_RESULTADO, COL_QTD, 'RESULTADO DO EVENTO');
  set(LINHA_RESULTADO, COL_VT, `=D${LINHA_TOTAL_REC}-D${LINHA_VALOR_TOTAL}`);

  // Escreve valores
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${ABA_FINANCEIRO}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: grid }
  });

  // === FORMATAÇÃO ===
  const reqs = [];
  function repeatCell(r0, r1, c0, c1, format) {
    reqs.push({
      repeatCell: {
        range: { sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 },
        cell: { userEnteredFormat: format },
        fields: 'userEnteredFormat(' + Object.keys(format).join(',') + ')'
      }
    });
  }
  function merge(r0, r1, c0, c1) {
    reqs.push({ mergeCells: { range: { sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 }, mergeType: 'MERGE_ALL' } });
  }

  // Cinza topo A1:J2 + merge A1:J2 (2 linhas)
  merge(0, 2, 0, NCOLS);
  repeatCell(0, 2, 0, NCOLS, {
    backgroundColor: COR_CINZA,
    textFormat: { bold: true, fontSize: 14 },
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'MIDDLE',
  });

  // Header geral A3:J4 laranja claro + merge PAGAMENTOS E3:I3 + verticais A-D e J nas linhas 3-4
  repeatCell(2, 4, 0, NCOLS, {
    backgroundColor: COR_LARANJA_CLARO,
    textFormat: { bold: true },
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'MIDDLE',
  });
  // Merges verticais nas colunas singulares pra ocupar linhas 3-4
  merge(2, 4, COL_DESC, COL_DESC + 1);  // Descrição A3:A4
  merge(2, 4, COL_QTD, COL_QTD + 1);    // Quantidade B3:B4
  merge(2, 4, COL_VU, COL_VU + 1);      // Valor Uni C3:C4
  merge(2, 4, COL_VT, COL_VT + 1);      // Valor Total D3:D4
  merge(2, 3, COL_SOCIO0, COL_FALTA);   // PAGAMENTOS E3:I3 (só linha 3)
  merge(2, 4, COL_FALTA, COL_FALTA + 1);// FALTA PAGAR J3:J4

  // Por categoria
  for (const cat of TEMPLATE_CATEGORIAS) {
    const linhaCat0 = cat.linhaTitulo - 1; // 0-based
    const primeiraItem0 = linhaCat0 + 1;
    const linhaSub0 = linhaCat0 + cat.itens + 1;

    // Linha categoria laranja escuro + merge A:D
    merge(linhaCat0, linhaCat0 + 1, COL_DESC, COL_SOCIO0);
    repeatCell(linhaCat0, linhaCat0 + 1, 0, NCOLS, {
      backgroundColor: COR_LARANJA_ESCURO,
      textFormat: { bold: true },
      horizontalAlignment: 'CENTER',
    });

    // Coluna J itens: verde claro
    repeatCell(primeiraItem0, linhaSub0, COL_FALTA, COL_FALTA + 1, {
      backgroundColor: COR_VERDE_CLARO,
    });

    // Linha do subtotal: laranja claro + merge B:D (A fica isolado com "SUB TOTAL")
    merge(linhaSub0, linhaSub0 + 1, COL_QTD, COL_SOCIO0);
    repeatCell(linhaSub0, linhaSub0 + 1, 0, NCOLS, {
      backgroundColor: COR_LARANJA_CLARO,
      textFormat: { bold: true },
    });
  }

  // VALOR TOTAL linha 132: laranja escuro + merge B:D
  merge(LINHA_VALOR_TOTAL - 1, LINHA_VALOR_TOTAL, COL_QTD, COL_SOCIO0);
  repeatCell(LINHA_VALOR_TOTAL - 1, LINHA_VALOR_TOTAL, 0, NCOLS, {
    backgroundColor: COR_LARANJA_ESCURO,
    textFormat: { bold: true, fontSize: 12 },
    horizontalAlignment: 'CENTER',
  });

  // BORDERO DE RECEITAS linha 136: laranja escuro + merge A:I
  merge(LINHA_BORDERO - 1, LINHA_BORDERO, 0, COL_FALTA);
  repeatCell(LINHA_BORDERO - 1, LINHA_BORDERO, 0, NCOLS, {
    backgroundColor: COR_LARANJA_ESCURO,
    textFormat: { bold: true, fontSize: 12 },
    horizontalAlignment: 'CENTER',
  });

  // Header receitas linha 137: laranja claro + merge A:C (DESCRIÇÃO)
  merge(LINHA_HEADER_REC - 1, LINHA_HEADER_REC, COL_DESC, COL_VT);
  repeatCell(LINHA_HEADER_REC - 1, LINHA_HEADER_REC, 0, NCOLS, {
    backgroundColor: COR_LARANJA_CLARO,
    textFormat: { bold: true },
    horizontalAlignment: 'CENTER',
  });

  // Receitas (linhas 138-142): merge A:C nas descrições + coluna J verde claro
  for (let l = LINHA_REC_INICIO; l <= LINHA_REC_FIM; l++) {
    merge(l - 1, l, COL_DESC, COL_VT);
  }
  repeatCell(LINHA_REC_INICIO - 1, LINHA_REC_FIM, COL_FALTA, COL_FALTA + 1, {
    backgroundColor: COR_VERDE_CLARO,
  });

  // TOTAL DE RECEITA linha 143: laranja claro + merge A:C
  merge(LINHA_TOTAL_REC - 1, LINHA_TOTAL_REC, COL_DESC, COL_VT);
  repeatCell(LINHA_TOTAL_REC - 1, LINHA_TOTAL_REC, 0, NCOLS, {
    backgroundColor: COR_LARANJA_CLARO,
    textFormat: { bold: true },
  });

  // RESULTADO DO EVENTO linha 145: laranja escuro + merge B:C (A fica isolado)
  merge(LINHA_RESULTADO - 1, LINHA_RESULTADO, COL_QTD, COL_VT);
  repeatCell(LINHA_RESULTADO - 1, LINHA_RESULTADO, 0, NCOLS, {
    backgroundColor: COR_LARANJA_ESCURO,
    textFormat: { bold: true, fontSize: 12 },
    horizontalAlignment: 'CENTER',
  });

  // Formato moeda nas colunas D, E, F, G, H, I, J (linhas 5+ até 145)
  const colsMoeda = [COL_VT, ...socios.map((_, i) => COL_SOCIO0 + i), COL_FALTA];
  for (const c of colsMoeda) {
    reqs.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 4, endRowIndex: LINHA_RESULTADO, startColumnIndex: c, endColumnIndex: c + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: 'R$ #,##0.00' } } },
        fields: 'userEnteredFormat.numberFormat'
      }
    });
  }
  // Quantidade (B) sem moeda
  reqs.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 4, endRowIndex: LINHA_RESULTADO, startColumnIndex: COL_QTD, endColumnIndex: COL_QTD + 1 },
      cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '0' } } },
      fields: 'userEnteredFormat.numberFormat'
    }
  });

  // Bordas pretas finas em todo o range usado (linhas 1 até RESULTADO)
  reqs.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: LINHA_RESULTADO, startColumnIndex: 0, endColumnIndex: NCOLS },
      top:    { style: 'SOLID', width: 1, color: COR_PRETO },
      bottom: { style: 'SOLID', width: 1, color: COR_PRETO },
      left:   { style: 'SOLID', width: 1, color: COR_PRETO },
      right:  { style: 'SOLID', width: 1, color: COR_PRETO },
      innerHorizontal: { style: 'SOLID', width: 1, color: COR_PRETO },
      innerVertical:   { style: 'SOLID', width: 1, color: COR_PRETO },
    }
  });

  if (reqs.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: reqs } });
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

  // Calcula lista de socios: SOCIOS_FIXOS + extras unicos do evento (contas_evento
  // + fontes de pagamento das despesas + contas das receitas, sem duplicar)
  const contasEvtR = await pool.query('SELECT nome FROM contas_evento WHERE id_evento=$1', [eventoId]);
  const fontesPag = [
    ...contasEvtR.rows.map(c => (c.nome || '').trim()),
    ...despesas.map(d => (d.fonte_pagamento || '').trim()),
    ...receitas.map(r => (r.conta || '').trim()),
  ].filter(Boolean);
  const sociosExtras = [...new Set(fontesPag)].filter(s => !SOCIOS_FIXOS.includes(s));
  const sociosTodos = [...SOCIOS_FIXOS, ...sociosExtras];

  // Aba bonita formatada (layout fiel ao template, com socios dinamicos)
  try {
    await gerarAbaFinanceiroFormatada(sheets, spreadsheetId, evento, despesas, receitas, sociosTodos);
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
