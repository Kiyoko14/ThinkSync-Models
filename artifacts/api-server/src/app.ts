import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { serializeError } from "./lib/errors";
import { healthCheck } from "./db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// HEALTH CHECK ENDPOINTS (Phase 5C.7)
// =============================================================================

// Basic health check
app.get('/health', async (req, res) => {
  const dbOk = await healthCheck();
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe - is process running?
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness probe - can serve traffic?
app.get('/health/ready', async (req, res) => {
  try {
    const dbOk = await healthCheck();
    const providerOk = !!process.env.SILICONFLOW_API_KEY;
    const jwtOk = !!process.env.JWT_SECRET;
    
    const allReady = dbOk && providerOk && jwtOk;
    
    res.status(allReady ? 200 : 503).json({
      status: allReady ? 'ready' : 'not_ready',
      database: dbOk ? 'ok' : 'error',
      provider: providerOk ? 'configured' : 'missing',
      jwt: jwtOk ? 'configured' : 'missing',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: 'health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================================================
// GLOBAL ERROR HANDLER (Phase 5C.7)
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error with structured logging
  logger.error({
    err,
    method: req.method,
    url: req.url,
    body: req.body,
  }, 'Unhandled error');
  
  // Serialize error for response - never expose stack traces
  const serialized = serializeError(err);
  
  res.status(500).json(serialized);
});

// =============================================================================
// ROUTES
// =============================================================================

app.use("/api", router);

export default app;
