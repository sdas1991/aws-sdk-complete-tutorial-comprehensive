/**
 * Logging Utility
 *
 * Provides structured logging for all examples
 * Supports different log levels and formatted output
 */

import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export class Logger {
  private logger: WinstonLogger;
  private context: string;

  constructor(context: string) {
    this.context = context;

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      defaultMeta: { service: 'aws-sdk-tutorial', context },
      transports: [
        // Console output with colors
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ level, message, timestamp, context, ...metadata }) => {
              let msg = `${timestamp} [${context}] ${level}: ${message}`;

              if (Object.keys(metadata).length > 0) {
                msg += ` ${JSON.stringify(metadata)}`;
              }

              return msg;
            })
          ),
        }),
        // File output
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: format.json(),
        }),
        new transports.File({
          filename: 'logs/combined.log',
          format: format.json(),
        }),
      ],
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, { context: this.context, ...meta });
  }

  error(message: string, error?: Error | any, meta?: any): void {
    this.logger.error(message, {
      context: this.context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      ...meta,
    });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  // Convenience methods for common operations
  apiCall(service: string, operation: string, params?: any): void {
    this.debug(`AWS API Call: ${service}.${operation}`, params);
  }

  apiSuccess(service: string, operation: string, result?: any): void {
    this.info(`AWS API Success: ${service}.${operation}`, result);
  }

  apiError(service: string, operation: string, error: Error): void {
    this.error(`AWS API Error: ${service}.${operation}`, error);
  }
}

// Create a default logger
export const logger = new Logger('default');

// Helper to create a context-specific logger
export function createContextLogger(context: string): Logger {
  return new Logger(context);
}
