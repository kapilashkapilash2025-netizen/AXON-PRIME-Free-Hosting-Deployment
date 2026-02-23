import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { env } from './config/env.js';
import { requestLogger } from './middlewares/requestLogger.js';

const app = express();

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS policy blocked this origin'));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(requestLogger);

app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(apiLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use(errorHandler);

export default app;
