/**
 * Types for the backtesting framework
 */

export interface BacktestConfiguration {
  startDate: Date
  endDate: Date
  initialCapital: number
  commission: number
  slippage: number
  lookbackWindow: number
  rebalanceFrequency: number // days
  maxPositions: number
  enableWalkForward: boolean
  walkForwardWindow?: number
  walkForwardStep?: number
}

export interface TradeExecution {
  id: string
  timestamp: Date
  type: "entry" | "exit"
  direction: "long_btc_short_xrp" | "short_btc_long_xrp"
  btcPrice: number
  xrpPrice: number
  btcAmount: number
  xrpAmount: number
  leverage: number
  commission: number
  slippage: number
  reason: string
  signalStrength: number
  regime: string
}

export interface Trade {
  id: string
  entryExecution: TradeExecution
  exitExecution?: TradeExecution
  status: "open" | "closed"
  regime: string
  strategy: "mean_reversion" | "momentum" | "transition"

  // Entry details
  entryDate: Date
  entryBtcPrice: number
  entryXrpPrice: number
  entryZscore: number
  entrySignalStrength: number
  entryReason: string

  // Exit details
  exitDate?: Date
  exitBtcPrice?: number
  exitXrpPrice?: number
  exitZscore?: number
  exitReason?: string

  // Position details
  btcAmount: number
  xrpAmount: number
  leverage: number
  capitalAllocated: number

  // Performance
  pnlDollar: number
  pnlPercent: number
  holdingPeriod: number // days
  maxFavorableExcursion: number
  maxAdverseExcursion: number

  // Costs
  totalCommission: number
  totalSlippage: number
}

export interface EquityPoint {
  date: Date
  equity: number
  cash: number
  unrealizedPnl: number
  realizedPnl: number
  drawdown: number
  regime: string
  activePositions: number
}

export interface PerformanceMetrics {
  // Return metrics
  totalReturn: number
  annualizedReturn: number
  cagr: number

  // Risk metrics
  volatility: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  maxDrawdown: number
  maxDrawdownDuration: number

  // Trade metrics
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  expectancy: number

  // Timing metrics
  avgHoldingPeriod: number
  avgTimeBetweenTrades: number

  // Risk-adjusted metrics
  var95: number
  var99: number
  expectedShortfall: number
  ulcerIndex: number

  // Regime-specific metrics
  regimePerformance: { [regime: string]: RegimeMetrics }
}

export interface RegimeMetrics {
  trades: number
  winRate: number
  avgReturn: number
  totalReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  profitFactor: number
  avgHoldingPeriod: number
  timeInRegime: number // percentage
}

export interface BacktestResult {
  configuration: BacktestConfiguration
  performance: PerformanceMetrics
  trades: Trade[]
  equityCurve: EquityPoint[]
  monthlyReturns: Array<{ month: string; return: number; regime: string }>
  yearlyReturns: Array<{ year: number; return: number }>
  drawdownPeriods: Array<{ start: Date; end: Date; depth: number; duration: number }>
  benchmarkComparison?: {
    benchmarkReturn: number
    alpha: number
    beta: number
    informationRatio: number
  }
}

export interface WalkForwardResult {
  inSamplePeriod: { start: Date; end: Date }
  outOfSamplePeriod: { start: Date; end: Date }
  inSampleMetrics: PerformanceMetrics
  outOfSampleMetrics: PerformanceMetrics
  optimalParameters: any
  degradation: number // performance degradation from in-sample to out-of-sample
}

export interface WalkForwardAnalysis {
  results: WalkForwardResult[]
  aggregateMetrics: {
    avgInSampleReturn: number
    avgOutOfSampleReturn: number
    avgDegradation: number
    consistency: number
    robustness: number
  }
  parameterStability: { [param: string]: { mean: number; std: number; stability: number } }
}
