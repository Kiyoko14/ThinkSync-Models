import app from "./app";
import { logger } from "./lib/logger";
import { pool, healthCheck } from "./db";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// =============================================================================
// STARTUP VALIDATION (Phase 5C.7)
// =============================================================================

interface ValidationResult {
  name: string;
  valid: boolean;
  error?: string;
}

function validateEnvironment(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Required environment variables
  const required = [
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'SILICONFLOW_API_KEY',
  ];
  
  for (const key of required) {
    const value = process.env[key];
    if (!value) {
      results.push({
        name: key,
        valid: false,
        error: `${key} is required but not set`,
      });
    } else {
      results.push({ name: key, valid: true });
    }
  }
  
  // Optional but recommended
  const recommended = [
    'TELEGRAM_ADMIN_BOT_TOKEN',
    'TELEGRAM_USER_BOT_TOKEN',
  ];
  
  for (const key of recommended) {
    if (process.env[key]) {
      results.push({ name: key, valid: true });
    } else {
      results.push({
        name: key,
        valid: true,
        error: `${key} not set (optional)`,
      });
    }
  }
  
  return results;
}

function logValidationResults(results: ValidationResult[]): void {
  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.filter(r => !r.valid).length;
  
  logger.info(
    { valid: validCount, invalid: invalidCount },
    'Environment validation complete'
  );
  
  for (const result of results) {
    if (result.error?.includes('optional')) {
      logger.debug({ key: result.name }, result.error);
    } else if (!result.valid) {
      logger.error({ key: result.name }, result.error);
    }
  }
}

// Run startup validation
const validations = validateEnvironment();
logValidationResults(validations);

// Check for critical failures
const criticalFailures = validations.filter(r => !r.valid);
if (criticalFailures.length > 0) {
  console.error('\n❌ STARTUP FAILED - Missing required environment variables:');
  for (const f of criticalFailures) {
    console.error(`   - ${f.name}: ${f.error}`);
  }
  console.error('\nPlease set all required environment variables and restart.\n');
  process.exit(1);
}

// =============================================================================
// PROCESS CRASH HANDLERS (Phase 5C.7)
// =============================================================================

let isShuttingDown = false;

function gracefulShutdown(signal: string): void {
  if (isShuttingDown) {
    logger.warn({ signal }, 'Already shutting down, ignoring signal');
    return;
  }
  
  isShuttingDown = true;
  
  logger.info({ signal }, 'Starting graceful shutdown...');
  
  // Stop accepting new connections
  
  // Close database pool
  pool.end()
    .then(() => {
      logger.info('Database pool closed');
      
      // Flush logs
      logger.info({ signal }, 'Graceful shutdown complete');
      
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Error closing database pool');
      process.exit(1);
    });
  
  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Graceful shutdown timeout - forcing exit');
    process.exit(1);
  }, 10000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(
    { err, stack: err.stack },
    'Uncaught exception - initiating graceful shutdown'
  );
  
  // Log to file before shutdown
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    { reason, promise },
    'Unhandled promise rejection'
  );
  
  // Don't exit for unhandled rejections - just log
  // They may be recoverable
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// SERVER STARTUP
// =============================================================================

const rawPort = process.env["PORT"];

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port, env: process.env.NODE_ENV || 'development' }, "Server listening");
  
  // Print startup banner
  console.log('\n🚀 ThinkSync Models API');
  console.log(`   Port: ${port}`);
  console.log(`   Health: http://localhost:${port}/health`);
  console.log(`   Ready:  http://localhost:${port}/health/ready\n`);
});

// Graceful shutdown on server
server.on('close', () => {
  logger.info('HTTP server closed');
});

export default server;