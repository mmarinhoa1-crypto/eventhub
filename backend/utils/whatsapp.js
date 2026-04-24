const axios = require('axios');

// Converte numero limpo (5511987654321) para JID de mencao do WhatsApp.
// FALLBACK: usado quando nao temos jid_whatsapp resolvido via Evolution API.
// Pode falhar com mention se o WhatsApp interno usar formato diferente
// (ex: "9 fantasma" do BR ou LID em multi-device).
function telefoneParaJid(tel) {
  if (!tel) return null;
  const d = String(tel).replace(/\D/g, '');
  if (!/^55\d{10,11}$/.test(d)) return null;
  return `${d}@s.whatsapp.net`;
}

// Resolve o JID interno do WhatsApp para um numero via Evolution API.
// Necessario porque o WhatsApp BR remove o "9 fantasma" no JID interno
// (5537998667778 -> 553798667778) e essa info so a Evolution sabe.
// Retorna null se nao encontrou ou deu erro.
async function resolverJidWhatsapp(EVO, KEY, INST, numero) {
  if (!numero) return null;
  const limpo = String(numero).replace(/\D/g, '');
  if (!/^55\d{10,11}$/.test(limpo)) return null;
  try {
    const r = await axios.post(
      `${EVO}/chat/whatsappNumbers/${INST}`,
      { numbers: [limpo] },
      { headers: { apikey: KEY, 'Content-Type': 'application/json' } }
    );
    const item = Array.isArray(r.data) ? r.data[0] : null;
    if (item && item.exists && item.jid) return item.jid;
    return null;
  } catch (e) {
    console.error('[wa] resolverJidWhatsapp falhou:', e.response?.data || e.message);
    return null;
  }
}

// Envia texto a um grupo, opcionalmente mencionando JIDs (push notification).
// Mentions usam o campo options.mentions.mentioned na Evolution API v1.x.
async function enviarGrupoComMencoes(EVO, KEY, INST, gid, texto, mentionedJids = []) {
  try {
    const payload = {
      number: gid,
      textMessage: { text: texto },
    };
    if (Array.isArray(mentionedJids) && mentionedJids.length) {
      payload.options = { mentions: { mentioned: mentionedJids } };
    }
    await axios.post(
      `${EVO}/message/sendText/${INST}`,
      payload,
      { headers: { apikey: KEY, 'Content-Type': 'application/json' } }
    );
    return true;
  } catch (e) {
    console.error('[wa] erro envio:', e.response?.data || e.message);
    return false;
  }
}

module.exports = { enviarGrupoComMencoes, telefoneParaJid, resolverJidWhatsapp };
