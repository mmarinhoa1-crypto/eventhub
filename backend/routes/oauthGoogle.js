// Rotas de autorizacao OAuth do Google por organizacao.
//
// Fluxo:
//   1. User logado no EventHub clica "Conectar Google"
//   2. Frontend chama POST /api/auth/google/start -> recebe { url }
//   3. Frontend redireciona pra essa URL (consent screen do Google)
//   4. User autoriza no Google
//   5. Google redireciona pra GET /api/auth/google/callback?code&state
//   6. Backend troca code por tokens, salva refresh_token na org, redireciona
//      pra /configuracoes?google=connected
//
// Seguranca: state contem JWT assinado com SECRET do EventHub e org_id +
// timestamp. Callback verifica state pra evitar CSRF.

const express = require('express');
const { google } = require('googleapis');
const { buildOAuth2Client, SCOPES } = require('../utils/googleSheets');

module.exports = function({ pool, auth, jwt, SECRET }) {
  const router = express.Router();

  // GET /api/auth/google/status — frontend usa pra mostrar estado do botao
  router.get('/api/auth/google/status', auth, async (req, res) => {
    try {
      const r = await pool.query(
        'SELECT google_oauth_email, google_oauth_connected_at, google_oauth_refresh_token IS NOT NULL AS connected FROM organizacoes WHERE id=$1',
        [req.user.org_id]
      );
      const row = r.rows[0] || {};
      res.json({
        connected: !!row.connected,
        email: row.google_oauth_email || null,
        connected_at: row.google_oauth_connected_at || null,
        oauth_configured: !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET),
        template_configured: !!process.env.GOOGLE_SHEETS_TEMPLATE_ID,
      });
    } catch (e) {
      res.status(500).json({ erro: e.message });
    }
  });

  // POST /api/auth/google/start — gera URL OAuth com state assinado
  router.post('/api/auth/google/start', auth, (req, res) => {
    if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
      return res.status(400).json({ erro: 'OAuth Google nao configurado no servidor' });
    }
    if (req.user.funcao !== 'admin' && req.user.funcao !== 'diretor') {
      return res.status(403).json({ erro: 'Apenas admin/diretor pode conectar conta Google' });
    }
    try {
      const state = jwt.sign(
        { org_id: req.user.org_id, user_id: req.user.id },
        SECRET,
        { expiresIn: '15m' }
      );
      const client = buildOAuth2Client();
      const url = client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',  // forca consent pra sempre retornar refresh_token
        scope: SCOPES,
        state,
      });
      res.json({ url });
    } catch (e) {
      console.error('[oauth-google] erro start:', e);
      res.status(500).json({ erro: e.message });
    }
  });

  // GET /api/auth/google/callback — Google redireciona pra ca
  router.get('/api/auth/google/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`/configuracoes?google=erro&motivo=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      return res.redirect('/configuracoes?google=erro&motivo=parametros-ausentes');
    }
    try {
      const decoded = jwt.verify(state, SECRET);
      const orgId = decoded.org_id;

      const client = buildOAuth2Client();
      const { tokens } = await client.getToken(code);
      if (!tokens.refresh_token) {
        // Se o user ja autorizou antes e Google nao mandou refresh_token,
        // revogamos a autorizacao via revoke + redirecionamos pra reautorizar.
        // Isso nao deveria acontecer porque pedimos prompt=consent.
        return res.redirect('/configuracoes?google=erro&motivo=sem-refresh-token');
      }
      client.setCredentials(tokens);

      // Pega email do user conectado
      let emailConectado = '';
      try {
        const ui = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
        emailConectado = ui.data.email || '';
      } catch (e) {
        console.warn('[oauth-google] nao pegou email do user:', e.message);
      }

      await pool.query(
        `UPDATE organizacoes
            SET google_oauth_refresh_token=$1,
                google_oauth_email=$2,
                google_oauth_connected_at=NOW()
          WHERE id=$3`,
        [tokens.refresh_token, emailConectado, orgId]
      );

      console.log(`[oauth-google] conexao salva org=${orgId} email=${emailConectado}`);
      res.redirect('/configuracoes?google=connected');
    } catch (e) {
      console.error('[oauth-google] erro callback:', e);
      res.redirect(`/configuracoes?google=erro&motivo=${encodeURIComponent(e.message)}`);
    }
  });

  // POST /api/auth/google/disconnect — limpa refresh_token da org
  router.post('/api/auth/google/disconnect', auth, async (req, res) => {
    try {
      if (req.user.funcao !== 'admin' && req.user.funcao !== 'diretor') {
        return res.status(403).json({ erro: 'Sem permissao' });
      }
      // Tenta revogar o token no Google (best effort)
      try {
        const r = await pool.query(
          'SELECT google_oauth_refresh_token FROM organizacoes WHERE id=$1',
          [req.user.org_id]
        );
        const rt = r.rows[0]?.google_oauth_refresh_token;
        if (rt) {
          const client = buildOAuth2Client();
          client.setCredentials({ refresh_token: rt });
          await client.revokeToken(rt).catch(() => {});
        }
      } catch (_) { /* segue mesmo se falhar */ }

      await pool.query(
        `UPDATE organizacoes
            SET google_oauth_refresh_token=NULL,
                google_oauth_email=NULL,
                google_oauth_connected_at=NULL
          WHERE id=$1`,
        [req.user.org_id]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ erro: e.message });
    }
  });

  return router;
};
