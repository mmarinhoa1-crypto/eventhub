const { enviarGrupoComMencoes } = require('../utils/whatsapp');

const TICK_MS = 60 * 60 * 1000; // 1 hora
const PRIMEIRO_TICK_MS = 60 * 1000; // 1 minuto apos boot
const HORA_DISPARO = 20; // Dispara as 20h do ultimo dia do mes (Brasilia)

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function ultimoDiaDoMes(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function pad2(n) { return String(n).padStart(2, '0'); }

// Retorna 'YYYY-MM-DD HH:MM:SS' do limite do mes (inicio ou fim) em hora local.
function inicioDoMes(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01 00:00:00`;
}
function inicioDoProximoMes(d) {
  const m = d.getMonth();
  const y = d.getFullYear();
  const proxM = m === 11 ? 0 : m + 1;
  const proxY = m === 11 ? y + 1 : y;
  return `${proxY}-${pad2(proxM + 1)}-01 00:00:00`;
}

async function montarRelatorio(pool, orgId) {
  const agora = new Date();
  const inicio = inicioDoMes(agora);
  const fim = inicioDoProximoMes(agora);

  // Conta atrasos por SM
  const sm = await pool.query(`
    SELECT u.id, u.nome,
      COUNT(n.id) FILTER (WHERE n.tipo_alerta = 'atraso') AS atrasos
    FROM usuarios u
    LEFT JOIN eventos e ON e.social_media_id = u.id AND e.org_id = u.org_id
    LEFT JOIN cronograma_marketing c ON c.id_evento = e.id AND c.org_id = u.org_id
    LEFT JOIN notificacoes_whatsapp_enviadas n
      ON n.referencia_tipo = 'cronograma_marketing_social_media'
      AND n.referencia_id = c.id
      AND n.org_id = u.org_id
      AND n.enviado_em >= $2
      AND n.enviado_em < $3
    WHERE u.org_id = $1 AND u.funcao = 'social_media'
    GROUP BY u.id, u.nome
    ORDER BY atrasos DESC, u.nome
  `, [orgId, inicio, fim]);

  // Conta atrasos por Designer
  const ds = await pool.query(`
    SELECT u.id, u.nome,
      COUNT(n.id) FILTER (WHERE n.tipo_alerta = 'atraso') AS atrasos
    FROM usuarios u
    LEFT JOIN eventos e ON e.designer_id = u.id AND e.org_id = u.org_id
    LEFT JOIN cronograma_marketing c ON c.id_evento = e.id AND c.org_id = u.org_id
    LEFT JOIN notificacoes_whatsapp_enviadas n
      ON n.referencia_tipo = 'cronograma_marketing_designer'
      AND n.referencia_id = c.id
      AND n.org_id = u.org_id
      AND n.enviado_em >= $2
      AND n.enviado_em < $3
    WHERE u.org_id = $1 AND u.funcao = 'designer'
    GROUP BY u.id, u.nome
    ORDER BY atrasos DESC, u.nome
  `, [orgId, inicio, fim]);

  const totalSM = sm.rows.reduce((acc, r) => acc + Number(r.atrasos || 0), 0);
  const totalDS = ds.rows.reduce((acc, r) => acc + Number(r.atrasos || 0), 0);

  let texto = `📊 *Relatório de atrasos — ${MESES[agora.getMonth()]}/${agora.getFullYear()}*\n\n`;
  texto += `*Social Media* (${totalSM} no total)\n`;
  if (sm.rows.length === 0) {
    texto += `_Nenhum SM cadastrado_\n`;
  } else {
    for (const r of sm.rows) {
      const n = Number(r.atrasos || 0);
      texto += `• ${r.nome}: ${n} ${n === 1 ? 'atraso' : 'atrasos'}\n`;
    }
  }
  texto += `\n*Designer* (${totalDS} no total)\n`;
  if (ds.rows.length === 0) {
    texto += `_Nenhum designer cadastrado_\n`;
  } else {
    for (const r of ds.rows) {
      const n = Number(r.atrasos || 0);
      texto += `• ${r.nome}: ${n} ${n === 1 ? 'atraso' : 'atrasos'}\n`;
    }
  }
  return texto;
}

async function tick(pool, EVO, KEY, INST) {
  try {
    const agora = new Date();
    const ehUltimoDia = agora.getDate() === ultimoDiaDoMes(agora);
    const horaCerta = agora.getHours() === HORA_DISPARO;
    if (!ehUltimoDia || !horaCerta) return;

    const orgs = await pool.query(`
      SELECT id, jid_grupo_equipe FROM organizacoes
      WHERE jid_grupo_equipe IS NOT NULL AND jid_grupo_equipe <> ''
    `);

    for (const o of orgs.rows) {
      // Dedup: 1 envio por (org, mes/ano)
      const referenciaId = agora.getFullYear() * 100 + (agora.getMonth() + 1);
      const ins = await pool.query(`
        INSERT INTO notificacoes_whatsapp_enviadas (org_id, referencia_tipo, referencia_id, tipo_alerta)
        VALUES ($1, 'relatorio_mensal', $2, 'enviado')
        ON CONFLICT (referencia_tipo, referencia_id, tipo_alerta) DO NOTHING
        RETURNING id
      `, [o.id, referenciaId]);
      if (ins.rowCount === 0) continue;

      const texto = await montarRelatorio(pool, o.id);
      const ok = await enviarGrupoComMencoes(EVO, KEY, INST, o.jid_grupo_equipe, texto, []);

      if (!ok) {
        // Falhou: remove dedup pra retry no proximo tick
        await pool.query(`
          DELETE FROM notificacoes_whatsapp_enviadas
          WHERE referencia_tipo='relatorio_mensal' AND referencia_id=$1 AND tipo_alerta='enviado' AND org_id=$2
        `, [referenciaId, o.id]);
        continue;
      }
      console.log(`[relatorio-mensal] enviado para org ${o.id} (ref ${referenciaId}) -> ${o.jid_grupo_equipe}`);
    }
  } catch (e) {
    console.error('[relatorio-mensal] erro no tick:', e.message);
  }
}

let started = false;
function start({ pool, EVO, KEY, INST, intervalMs = TICK_MS }) {
  if (started) return;
  started = true;
  console.log(`[relatorio-mensal] worker iniciado (tick=${Math.round(intervalMs / 1000)}s, dispara as ${HORA_DISPARO}h do ultimo dia do mes)`);
  setTimeout(() => tick(pool, EVO, KEY, INST), PRIMEIRO_TICK_MS);
  setInterval(() => tick(pool, EVO, KEY, INST), intervalMs);
}

module.exports = { start, tick, montarRelatorio };
