export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export interface JsonLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  requestId?: string;
}

export interface JsonLoggerOptions {
  service?: string;
  requestId?: string;
  defaultContext?: LogContext;
}

export interface JsonLogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): JsonLogger;
}