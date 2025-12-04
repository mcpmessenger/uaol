import { config } from '../config/index.js';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  [key: string]: any;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'uaol') {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      ...meta,
    };

    if (config.logging.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${this.serviceName}]`;
      console.log(`${prefix} ${message}`, meta || '');
    }
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log(LogLevel.INFO, message, meta);
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log(LogLevel.WARN, message, meta);
    }
  }

  error(message: string, error?: Error | any, meta?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMeta = {
        ...meta,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      };
      this.log(LogLevel.ERROR, message, errorMeta);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configLevel = config.logging.level.toLowerCase() as LogLevel;
    const configIndex = levels.indexOf(configLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= configIndex;
  }
}

export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

