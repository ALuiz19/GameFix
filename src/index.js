require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', servico: 'GameFix API', versao: '1.0.0' }));
app.use('/api', routes);
app.use(errorHandler);

initDb().then(() => {
  app.listen(PORT, () => console.log(`[GameFix API] http://localhost:${PORT}`));
}).catch(err => { console.error('Erro ao inicializar DB:', err); process.exit(1); });
