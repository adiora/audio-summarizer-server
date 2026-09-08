import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/index.js';
import uploadRoutes from './routes/upload.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/uploads', uploadRoutes);
app.use('/api/webhooks', webhookRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
