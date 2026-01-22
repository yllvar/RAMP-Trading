import { Logger } from "../utils/logger"
/**
 * Application Configuration
 * Centralized environment variable management with validation
 */

export interface AppConfig {
  exchange: {
    apiKey: string
    apiSecret: string
    testMode: boolean
  }
  server: {
    port: number
    nodeEnv: string
    logLevel: string
  }
  alternativeData: {
    alphaVantage?: string
    finnhub?: string
    polygon?: string
  }
  websocket: {
    reconnectDelay: number
    maxReconnectAttempts: number
  }
  riskManagement: {
    maxPositionSizePercent: number
    stopLossPercent: number
    takeProfitPercent: number
  }
  database?: {
    url: string
  }
  monitoring: {
    slackWebhookUrl?: string
    discordWebhookUrl?: string
  }
  features: {
    enableLiveTrading: boolean
    enableBacktesting: boolean
    enablePaperTrading: boolean
  }
}

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue
  return value.toLowerCase() === 'true'
}

/**
 * Parse number from environment variable
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Load and validate configuration from environment variables
 */
export const config: AppConfig = {
  exchange: {
    apiKey: process.env.EXCHANGE_API_KEY || '',
    apiSecret: process.env.EXCHANGE_API_SECRET || '',
    testMode: parseBoolean(process.env.EXCHANGE_TEST_MODE, true),
  },
  server: {
    port: parseNumber(process.env.PORT, 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  alternativeData: {
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY,
    finnhub: process.env.FINNHUB_API_KEY,
    polygon: process.env.POLYGON_API_KEY,
  },
  websocket: {
    reconnectDelay: parseNumber(process.env.WS_RECONNECT_DELAY, 5000),
    maxReconnectAttempts: parseNumber(process.env.WS_MAX_RECONNECT_ATTEMPTS, 10),
  },
  riskManagement: {
    maxPositionSizePercent: parseNumber(process.env.MAX_POSITION_SIZE_PERCENT, 10),
    stopLossPercent: parseNumber(process.env.STOP_LOSS_PERCENT, 2),
    takeProfitPercent: parseNumber(process.env.TAKE_PROFIT_PERCENT, 3),
  },
  database: process.env.DATABASE_URL ? {
    url: process.env.DATABASE_URL,
  } : undefined,
  monitoring: {
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  },
  features: {
    enableLiveTrading: parseBoolean(process.env.ENABLE_LIVE_TRADING, false),
    enableBacktesting: parseBoolean(process.env.ENABLE_BACKTESTING, true),
    enablePaperTrading: parseBoolean(process.env.ENABLE_PAPER_TRADING, true),
  },
}

/**
 * Validate critical configuration
 */
export function validateConfig(): void {
  const errors: string[] = []

  // Exchange API keys are required for live trading
  if (config.features.enableLiveTrading) {
    if (!config.exchange.apiKey) {
      errors.push('EXCHANGE_API_KEY is required when live trading is enabled')
    }
    if (!config.exchange.apiSecret) {
      errors.push('EXCHANGE_API_SECRET is required when live trading is enabled')
    }
  }

  // Database URL is required if database features are used
  if (config.database && !config.database.url) {
    errors.push('DATABASE_URL is required for database features')
  }

  // Log level validation
  const validLogLevels = ['error', 'warn', 'info', 'debug']
  if (!validLogLevels.includes(config.server.logLevel)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`)
  }

  // Risk management validation
  if (config.riskManagement.maxPositionSizePercent < 1 || config.riskManagement.maxPositionSizePercent > 100) {
    errors.push('MAX_POSITION_SIZE_PERCENT must be between 1 and 100')
  }

  if (errors.length > 0) {
    Logger.info('Configuration validation errors:')
    errors.forEach(error => console.error(`  - ${error}`))
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
  }
}

/**
 * Get environment-specific configuration
 */
export function isDevelopment(): boolean {
  return config.server.nodeEnv === 'development'
}

export function isProduction(): boolean {
  return config.server.nodeEnv === 'production'
}

export function isTest(): boolean {
  return config.server.nodeEnv === 'test'
}

// Validate configuration on import
try {
  validateConfig()
} catch (error) {
  if (isDevelopment()) {
    console.warn('Configuration warning:', error)
  } else {
    throw error
  }
}
