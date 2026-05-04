const { enviarGrupoComMencoes, telefoneParaJid } = require('../utils/whatsapp');

const TICK_MS = 5 * 60 * 1000; // 5 minutos
const ANTECEDENCIA_MS = 60 * 60 * 1000; // 1 hora antes (deadline do designer)
const TOLERANCIA_ATRASO_MS = 15 * 60 * 1000; // 15 min de tolerancia para SM e Designer
const PRIMEIRO_TICK_MS = 30 * 1000; // 30s apos boot

// Combina "2026-05-12" + "09:00" em Date local (TZ do servidor)
function combinarDataHora(dataStr, horaStr) {
  if (!dataStr || !horaStr) return null;
  const m = String(dataStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const h = String(horaStr).match(/^(\d{1,2}):(\d{2})/);
  if (!m || !h) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(h[1]), Number(h[2]), 0, 0);
}

// Tolerancia de 15 min apos o "ponto de atraso" para nao disparar no minuto exato.
// Social media: ponto = hora_publicacao -> dispara em (hora_publicacao + 15min)
// Designer:    ponto = hora_entrega    -> dispara em (hora_entrega + 15min)
function calcularAlerta(referencia, agora) {
  if (!referencia) return null;
  const limite = new Date(referencia.getTime() + TOLERANCIA_ATRASO_MS);
  return agora >= limite ? 'atraso' : null;
}

async function processarLinha(pool, EVO, KEY, INST, l, tipoFluxo) {
  const agora = new Date();
  // Para designer, usa hora_entrega (definida pelo SM); para SM, usa hora_publicacao.
  const horaRef = tipoFluxo === 'designer' ? l.hora_entrega : l.hora_publicacao;
  if (!horaRef) return false;
  const referencia = combinarDataHora(l.data_publicacao, horaRef);
  const alerta = calcularAlerta(referencia, agora);
  if (!alerta) return false;

  const refTipo = `cronograma_marketing_${tipoFluxo}`;

  // Dedup atomico: se ja existe (refTipo, refId, alerta), nao reenvia
  const ins = await pool.query(
    `INSERT INTO notificacoes_whatsapp_enviadas (org_id, referencia_tipo, referencia_id, tipo_alerta)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (referencia_tipo, referencia_id, tipo_alerta) DO NOTHING
     RETURNING id`,
    [l.org_id, refTipo, l.id, alerta]
  );
  if (ins.rowCount === 0) return false;

  // Prioriza jid_whatsapp resolvido (formato real do WhatsApp, sem "9 fantasma");
  // se nao tiver, cai para o fallback derivado do telefone (pode falhar mention).
  const responsavelJid = l.responsavel_jid || telefoneParaJid(l.responsavel_telefone);
  const responsavelLabel = responsavelJid
    ? `@${responsavelJid.split('@')[0]}`
    : (l.responsavel_nome || 'sem responsável');
  const eventoLabel = l.evento_nome ? ` _(${l.evento_nome})_` : '';
  const fluxoLabel = tipoFluxo === 'designer' ? 'Designer' : 'Social Media';

  let texto;
  if (tipoFluxo === 'designer') {
    texto =
      `🔴 *Entrega atrasada* — Designer\n` +
      `*${l.titulo}*${eventoLabel}\n` +
      `Entrega era pra estar pronta às ${l.hora_entrega}.\n` +
      `Marque a demanda como *recebido* assim que entregar.\n` +
      `Responsável: ${responsavelLabel}`;
  } else {
    texto =
      `🔴 *Demanda atrasada* — Social Media\n` +
      `*${l.titulo}*${eventoLabel}\n` +
      `Deveria ter sido publicada às ${l.hora_publicacao}.\n` +
      `Marque como *publicado* assim que postar.\n` +
      `Responsável: ${responsavelLabel}`;
  }

  const mentions = responsavelJid ? [responsavelJid] : [];
  const ok = await enviarGrupoComMencoes(EVO, KEY, INST, l.jid_grupo_equipe, texto, mentions);

  if (!ok) {
    // Envio falhou: remove dedup para retry no proximo tick
    await pool.query(
      `DELETE FROM notificacoes_whatsapp_enviadas WHERE referencia_tipo=$1 AND referencia_id=$2 AND tipo_alerta=$3`,
      [refTipo, l.id, alerta]
    );
    return false;
  }
  console.log(`[wa-demandas] enviado ${refTipo} #${l.id} (${alerta}) -> ${l.jid_grupo_equipe}`);
  return true;
}

async function tick(pool, EVO, KEY, INST) {
  try {
    // Fluxo Social Media: usa eventos.social_media_id como responsavel
    // Filtra apenas demandas com data_publicacao >= HOJE no fuso de Brasilia (sem retroativo).
    // SM so eh notificado quando a demanda nao precisa de designer (aparecer_designer=FALSE)
    // OU quando o designer ja entregou (status em_revisao ou aprovado). Se o designer ainda
    // nao entregou, o atraso eh dele, nao do SM.
    const sm = await pool.query(`
      SELECT
        c.id, c.titulo, c.data_publicacao, c.hora_publicacao, c.hora_entrega, c.org_id,
        e.nome AS evento_nome,
        u.nome AS responsavel_nome,
        u.telefone_whatsapp AS responsavel_telefone,
        u.jid_whatsapp AS responsavel_jid,
        o.jid_grupo_equipe
      FROM cronograma_marketing c
      JOIN eventos e ON e.id = c.id_evento AND e.org_id = c.org_id
      JOIN organizacoes o ON o.id = c.org_id
      LEFT JOIN usuarios u ON u.id = e.social_media_id AND u.org_id = c.org_id
      WHERE c.status NOT IN ('publicado','concluido','cancelado')
        AND o.jid_grupo_equipe IS NOT NULL AND o.jid_grupo_equipe <> ''
        AND c.data_publicacao IS NOT NULL
        AND c.hora_publicacao IS NOT NULL
        AND c.data_publicacao ~ '^\\d{4}-\\d{2}-\\d{2}$'
        AND c.data_publicacao::date >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        AND c.is_impresso IS NOT TRUE
        AND (c.aparecer_designer = FALSE OR c.status IN ('em_revisao','aprovado'))
    `);
    for (const row of sm.rows) {
      await processarLinha(pool, EVO, KEY, INST, row, 'social_media');
    }

    // Fluxo Designer: usa eventos.designer_id, considera 'em_revisao' (=tag 'recebido') como entregue
    // Filtra apenas demandas com data_publicacao >= HOJE no fuso de Brasilia (sem retroativo)
    const ds = await pool.query(`
      SELECT
        c.id, c.titulo, c.data_publicacao, c.hora_publicacao, c.hora_entrega, c.org_id,
        e.nome AS evento_nome,
        u.nome AS responsavel_nome,
        u.telefone_whatsapp AS responsavel_telefone,
        u.jid_whatsapp AS responsavel_jid,
        o.jid_grupo_equipe
      FROM cronograma_marketing c
      JOIN eventos e ON e.id = c.id_evento AND e.org_id = c.org_id
      JOIN organizacoes o ON o.id = c.org_id
      LEFT JOIN usuarios u ON u.id = e.designer_id AND u.org_id = c.org_id
      WHERE c.aparecer_designer = TRUE
        AND c.status NOT IN ('em_revisao','aprovado','publicado','concluido','cancelado')
        AND o.jid_grupo_equipe IS NOT NULL AND o.jid_grupo_equipe <> ''
        AND c.data_publicacao IS NOT NULL
        AND c.hora_entrega IS NOT NULL AND c.hora_entrega <> ''
        AND c.data_publicacao ~ '^\\d{4}-\\d{2}-\\d{2}$'
        AND c.data_publicacao::date >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        AND c.is_impresso IS NOT TRUE
    `);
    for (const row of ds.rows) {
      await processarLinha(pool, EVO, KEY, INST, row, 'designer');
    }
  } catch (e) {
    console.error('[wa-demandas] erro no tick:', e.message);
  }
}

let started = false;
function start({ pool, EVO, KEY, INST, intervalMs = TICK_MS }) {
  if (started) return;
  started = true;
  console.log(`[wa-demandas] worker iniciado (tick=${Math.round(intervalMs / 1000)}s, antecedencia=${ANTECEDENCIA_MS / 60000}min)`);
  setTimeout(() => tick(pool, EVO, KEY, INST), PRIMEIRO_TICK_MS);
  setInterval(() => tick(pool, EVO, KEY, INST), intervalMs);
}

module.exports = { start, tick };
