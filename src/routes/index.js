const express = require('express');
const router = express.Router();

const { criarUsuario, buscarUsuario, listarUsuarios } = require('../controllers/usuariosController');
const { criarChamado, listarChamados, buscarChamado, aceitarChamado, recusarChamado, concluirChamado } = require('../controllers/chamadosController');
const { enviarOrcamento, buscarOrcamento, responderOrcamento } = require('../controllers/orcamentosController');
const { listarEventos } = require('../models/eventoModel');

// ── Usuários ──────────────────────────────────────────────
router.post('/usuarios', criarUsuario);
router.get('/usuarios', listarUsuarios);
router.get('/usuarios/:id', buscarUsuario);

// ── Chamados ──────────────────────────────────────────────
router.post('/chamados', criarChamado);
router.get('/chamados', listarChamados);
router.get('/chamados/:id', buscarChamado);
router.patch('/chamados/:id/aceitar', aceitarChamado);
router.patch('/chamados/:id/recusar', recusarChamado);
router.patch('/chamados/:id/concluir', concluirChamado);

// ── Orçamentos ────────────────────────────────────────────
router.post('/chamados/:id/orcamento', enviarOrcamento);
router.get('/chamados/:id/orcamento', buscarOrcamento);
router.patch('/chamados/:id/orcamento/responder', responderOrcamento);

// ── Eventos (log interno) ─────────────────────────────────
router.get('/eventos', listarEventos);

module.exports = router;
