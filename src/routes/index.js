const express = require('express');
const router = express.Router();

const { criarUsuario, buscarUsuario, listarUsuarios } = require('../controllers/usuariosController');
const { login, me } = require('../controllers/authController');
const { criarChamado, listarChamados, buscarChamado, aceitarChamado, recusarChamado, concluirChamado } = require('../controllers/chamadosController');
const { enviarOrcamento, buscarOrcamento, responderOrcamento } = require('../controllers/orcamentosController');
const { listarEventos } = require('../models/eventoModel');
const { requireAuth, requireRole } = require('../middlewares/auth');

// ── Autenticação ──────────────────────────────────────────
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);

// ── Usuários ──────────────────────────────────────────────
router.post('/usuarios', criarUsuario);
router.get('/usuarios', requireAuth, listarUsuarios);
router.get('/usuarios/:id', requireAuth, buscarUsuario);

// ── Chamados ──────────────────────────────────────────────
router.post('/chamados', requireAuth, requireRole('cliente'), criarChamado);
router.get('/chamados', requireAuth, listarChamados);
router.get('/chamados/:id', requireAuth, buscarChamado);
router.patch('/chamados/:id/aceitar', requireAuth, requireRole('tecnico'), aceitarChamado);
router.patch('/chamados/:id/recusar', requireAuth, requireRole('tecnico'), recusarChamado);
router.patch('/chamados/:id/concluir', requireAuth, requireRole('tecnico'), concluirChamado);

// ── Orçamentos ────────────────────────────────────────────
router.post('/chamados/:id/orcamento', requireAuth, requireRole('tecnico'), enviarOrcamento);
router.get('/chamados/:id/orcamento', requireAuth, buscarOrcamento);
router.patch('/chamados/:id/orcamento/responder', requireAuth, requireRole('cliente'), responderOrcamento);

// ── Eventos (log interno) ─────────────────────────────────
router.get('/eventos', requireAuth, requireRole('tecnico'), listarEventos);

module.exports = router;
