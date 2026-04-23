const axios = require('axios');

// Converte numero limpo (5511987654321) para JID de mencao do WhatsApp
function telefoneParaJid(tel) {
  if (!tel) return null;
  const d = String(tel).replace(/\D/g, '');
  if (!/^55\d{10,11}$/.test(d)) return null;
  return `${d}@s.whatsapp.net`;
}

// Envia texto a um grupo, opcionalmente mencionando JIDs (push notification)
// Mentions usam o campo options.mentions.mentioned na Evolution API v1.x
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

module.exports = { enviarGrupoComMencoes, telefoneParaJid };
