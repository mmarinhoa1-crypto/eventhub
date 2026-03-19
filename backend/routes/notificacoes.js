const express = require('express');
module.exports = function({ pool, auth }) {
  const router = express.Router();

// Listar notificacoes do usuario logado
router.get('/api/notificacoes', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM notificacoes WHERE usuario_id=$1 ORDER BY criado_em DESC LIMIT 50',
      [req.user.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// Marcar todas como lidas
router.patch('/api/notificacoes/todas/lida', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notificacoes SET lida=TRUE WHERE usuario_id=$1',
      [req.user.id]
    );
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// Marcar uma notificacao como lida
router.patch('/api/notificacoes/:id/lida', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notificacoes SET lida=TRUE WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// Deletar uma notificacao
router.delete('/api/notificacoes/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM notificacoes WHERE id=$1 AND usuario_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

  return router;
};
