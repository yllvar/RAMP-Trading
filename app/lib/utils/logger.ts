import { Logger } from "../utils/logger"
/**
 * Structured Logging System
 * Replaces console.log with proper logging levels and formatting
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
  module?: string
  userId?: string
  requestId?: string
}

export class Logger {
  private static level = process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO
  private static readonly LOG_LEVEL_NAMES = {
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.DEBUG]: 'DEBUG',
  }

  private static shouldLog(level: LogLevel): boolean {
    return Logger.level >= level
  }

  private static formatMessage(level: LogLevel, message: string, data?: any, module?: string): string {
    const timestamp = new Date().toISOString()
    const levelName = Logger.LOG_LEVEL_NAMES[level]
    const moduleStr = module ? `[${module}]` : ''
    const dataStr = data ? ` ${JSON.stringify(data)}` : ''
    
    return `[${timestamp}] ${levelName}${moduleStr} ${message}${dataStr}`
  }

  static error(message: string, data?: any, module?: string): void {
    if (!Logger.shouldLog(LogLevel.ERROR)) return
    
    const formattedMessage = Logger.formatMessage(LogLevel.ERROR, message, data, module)
    console.error(formattedMessage)
    
    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production') {
      Logger.sendToLogService({
        level: LogLevel.ERROR,
        message,
        data,
        module,
        timestamp: new Date().toISOString(),
      })
    }
  }

  static warn(message: string, data?: any, module?: string): void {
    if (!Logger.shouldLog(LogLevel.WARN)) return
    
    const formattedMessage = Logger.formatMessage(LogLevel.WARN, message, data, module)
    console.warn(formattedMessage)
  }

  static info(message: string, data?: any, module?: string): void {
    if (!Logger.shouldLog(LogLevel.INFO)) return
    
    const formattedMessage = Logger.formatMessage(LogLevel.INFO, message, data, module)
    console.log(formattedMessage)
  }

  static debug(message: string, data?: any, module?: string): void {
    if (!Logger.shouldLog(LogLevel.DEBUG)) return
    
    const formattedMessage = Logger.formatMessage(LogLevel.DEBUG, message, data, module)
    console.log(formattedMessage)
  }

  /**
   * Trading-specific logging methods
   */
  static trade(message: string, data?: any): void {
    Logger.info(message, data, 'TRADING')
  }

  static strategy(message: string, data?: any): void {
    Logger.info(message, data, 'STRATEGY')
  }

  static risk(message: string, data?: any): void {
    Logger.warn(message, data, 'RISK')
  }

  static performance(message: string, data?: any): void {
    Logger.debug(message, data, 'PERFORMANCE')
  }

  /**
   * Send logs to external service (placeholder for production)
   */
  private static sendToLogService(entry: LogEntry): void {
    // Integration with services like:
    // - Datadog
    // - Loggly
    // - ELK Stack
    // - CloudWatch
    
    // Example implementation:
    // fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(entry)
    // })
  }

  /**
   * Create module-specific logger
   */
  static create(module: string) {
    return {
      error: (message: string, data?: any) => Logger.error(message, data, module),
      warn: (message: string, data?: any) => Logger.warn(message, data, module),
      info: (message: string, data?: any) => Logger.info(message, data, module),
      debug: (message: string, data?: any) => Logger.debug(message, data, module),
    }
  }
}

/**
 * Default export for backward compatibility
 */
export default Logger
