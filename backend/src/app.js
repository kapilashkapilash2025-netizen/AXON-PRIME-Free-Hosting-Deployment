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

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS policy blocked this origin'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));
app.use(requestLogger);
app.options('*', cors(corsOptions));

app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(apiLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use(errorHandler);

export default app;
