import { Logger } from "../utils/logger"
/**
 * Type definitions for the strategy engine
 */

// Core trading types
export interface TradingSignal {
  type: "entry" | "exit" | "hold"
  direction: "long_btc_short_xrp" | "short_btc_long_xrp" | "neutral"
  strength: number // 0-1 scale
  regime: string
  zscore: number
  confidence: number
  timestamp: Date
  entryThreshold: number
  exitThreshold: number
}

export interface RegimeState {
  current: "high-correlation" | "low-correlation" | "transition"
  confidence: number
  duration: number
  correlation: number
  volatility: number
  transitionProbability: { [key: string]: number }
  volatilityRegime: "low" | "medium" | "high"
}

export interface StrategyParameters {
  correlationWindow: number
  highCorrelationThreshold: number
  lowCorrelationThreshold: number
  zscoreEntryThreshold: number
  zscoreExitThreshold: number
  stopLossZscore: number
  basePositionSize: number
  maxPositionSize: number
  kellyMultiplier: number
  meanReversionLeverage: number
  momentumLeverage: number
  transitionLeverage: number
  maxDrawdown: number
  correlationBreakdownThreshold: number
  volatilityScaling: boolean
}

export interface RiskParameters {
  maxPositionSize: number
  maxLeverage: number
  stopLossThreshold: number
  maxDrawdown: number
  correlationThreshold: number
  volatilityThreshold: number
}

// Cointegration types
export interface CointegrationResult {
  isCointegrated: boolean
  pValue: number
  testStatistic: number
  criticalValues: { [key: string]: number }
  hedgeRatio: number
  residuals: number[]
  halfLife: number
  rSquared: number
}

// Z-Score types
export interface ZScoreResult {
  zscore: number
  mean: number
  stdDev: number
  spread: number
  isSignificant: boolean
  percentile: number
}

// Position sizing types
export interface PositionSize {
  btcAmount: number
  xrpAmount: number
  leverage: number
  capitalAllocated: number
  riskPercentage: number
  expectedReturn: number
  kellyFraction: number
}

export interface Portfolio {
  totalCapital: number
  availableCapital: number
  positions: any[]
  equity: number[]
  returns: number[]
}
