import { CointegrationTester } from "../strategy-engine/cointegration"
import { ZScoreCalculator } from "../strategy-engine/zscore-calculator"
import { SignalGenerator } from "../strategy-engine/signal-generator"
import { PositionSizer } from "../strategy-engine/position-sizer"
import { StatisticalUtils } from "../utils/statistics"
import type {
  BacktestConfiguration,
  BacktestResult,
  Trade,
  TradeExecution,
  EquityPoint,
  MarketData,
  StrategyParameters,
  RiskParameters,
  TradingSignal,
  RegimeState,
} from "./types"

/**
 * Comprehensive backtesting engine for regime-adaptive pairs trading
 */
export class BacktestingEngine {
  private config: BacktestConfiguration
  private strategyParams: StrategyParameters
  private riskParams: RiskParameters
  private signalGenerator: SignalGenerator
  private positionSizer: PositionSizer

  // State tracking
  private currentEquity: number
  private currentCash: number
  private activeTrades: Map<string, Trade> = new Map()
  private completedTrades: Trade[] = []
  private equityCurve: EquityPoint[] = []
  private tradeCounter = 0

  constructor(config: BacktestConfiguration, strategyParams: StrategyParameters, riskParams: RiskParameters) {
    this.config = config
    this.strategyParams = strategyParams
    this.riskParams = riskParams
    this.currentEquity = config.initialCapital
    this.currentCash = config.initialCapital

    this.signalGenerator = new SignalGenerator(strategyParams)
    this.positionSizer = new PositionSizer(riskParams, strategyParams)
  }

  /**
   * Run complete backtest
   */
  async runBacktest(marketData: MarketData): Promise<BacktestResult> {
    try {
      console.log("Starting comprehensive backtest...")

      // Validate data
      this.validateMarketData(marketData)

      // Initialize backtest state
      this.initializeBacktest()

      // Run cointegration analysis
      const cointegrationResult = CointegrationTester.performEngleGrangerTest(
        marketData.btcPrices,
        marketData.xrpPrices,
      )

      if (!cointegrationResult.isCointegrated) {
        console.warn("Warning: Pair is not cointegrated. Results may be unreliable.")
      }

      // Calculate spread and z-scores
      const spread = ZScoreCalculator.calculateSpread(
        marketData.btcPrices,
        marketData.xrpPrices,
        cointegrationResult.hedgeRatio,
        "log",
      )

      const zscoreResults = ZScoreCalculator.calculateRollingZScore(spread, this.strategyParams.correlationWindow)

      // Calculate rolling correlations for regime detection
      const rollingCorrelations = StatisticalUtils.rollingCorrelation(
        marketData.btcReturns,
        marketData.xrpReturns,
        this.strategyParams.correlationWindow,
      )

      // Run day-by-day simulation
      await this.runDailySimulation(marketData, zscoreResults, rollingCorrelations, cointegrationResult.hedgeRatio)

      // Close any remaining positions
      this.closeAllPositions(
        marketData.dates[marketData.dates.length - 1],
        marketData.btcPrices[marketData.btcPrices.length - 1],
        marketData.xrpPrices[marketData.xrpPrices.length - 1],
        "backtest_end",
      )

      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics()

      // Generate monthly and yearly returns
      const monthlyReturns = this.calculateMonthlyReturns()
      const yearlyReturns = this.calculateYearlyReturns()

      // Identify drawdown periods
      const drawdownPeriods = this.identifyDrawdownPeriods()

      console.log("Backtest completed successfully!")

      return {
        configuration: this.config,
        performance,
        trades: this.completedTrades,
        equityCurve: this.equityCurve,
        monthlyReturns,
        yearlyReturns,
        drawdownPeriods,
      }
    } catch (error) {
      console.error("Error in backtesting:", error)
      throw new Error(`Backtest failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  /**
   * Run daily simulation
   */
  private async runDailySimulation(
    marketData: MarketData,
    zscoreResults: any[],
    rollingCorrelations: number[],
    hedgeRatio: number,
  ): Promise<void> {
    const startIndex = this.strategyParams.correlationWindow

    for (let i = startIndex; i < marketData.dates.length; i++) {
      const currentDate = marketData.dates[i]
      const btcPrice = marketData.btcPrices[i]
      const xrpPrice = marketData.xrpPrices[i]

      // Get current market conditions
      const zscoreIndex = i - startIndex
      const zscore = zscoreResults[zscoreIndex]?.zscore || 0
      const correlation = rollingCorrelations[zscoreIndex] || 0

      // Detect current regime
      const regime = this.detectRegime(correlation)

      // Calculate volatility
      const recentReturns = marketData.btcReturns.slice(Math.max(0, i - 20), i)
      const volatility = recentReturns.length > 0 ? StatisticalUtils.calculateVolatility(recentReturns) : 0.2

      // Update existing positions
      await this.updatePositions(currentDate, btcPrice, xrpPrice, zscore)

      // Generate new signals
      const signal = this.signalGenerator.generateSignal(zscore, regime, correlation, volatility, currentDate)

      // Execute trades based on signals
      if (signal.type === "entry" && this.activeTrades.size < this.config.maxPositions) {
        await this.executeEntry(signal, currentDate, btcPrice, xrpPrice, hedgeRatio)
      }

      // Update equity curve
      this.updateEquityCurve(currentDate, btcPrice, xrpPrice, regime)

      // Rebalance if needed
      if (i % this.config.rebalanceFrequency === 0) {
        await this.rebalancePortfolio(currentDate, btcPrice, xrpPrice)
      }
    }
  }

  /**
   * Detect market regime
   */
  private detectRegime(correlation: number): RegimeState {
    let current: "high-correlation" | "low-correlation" | "transition"
    let confidence: number

    if (correlation > this.strategyParams.highCorrelationThreshold) {
      current = "high-correlation"
      confidence = Math.min(1.0, (correlation - this.strategyParams.highCorrelationThreshold) / 0.2 + 0.7)
    } else if (correlation < this.strategyParams.lowCorrelationThreshold) {
      current = "low-correlation"
      confidence = Math.min(1.0, (this.strategyParams.lowCorrelationThreshold - correlation) / 0.2 + 0.7)
    } else {
      current = "transition"
      confidence = 0.5
    }

    return {
      current,
      confidence,
      duration: 1,
      correlation,
      volatility: 0.2,
      transitionProbability: {},
      volatilityRegime: "medium",
    }
  }

  /**
   * Execute trade entry
   */
  private async executeEntry(
    signal: TradingSignal,
    date: Date,
    btcPrice: number,
    xrpPrice: number,
    hedgeRatio: number,
  ): Promise<void> {
    try {
      // Calculate position size
      const portfolio = this.getCurrentPortfolio()
      const positionSize = this.positionSizer.calculateOptimalSize(signal, portfolio)

      if (positionSize.capitalAllocated < 1000) return // Minimum position size

      // Apply slippage and commission
      const slippageAdjustment = this.config.slippage
      const adjustedBtcPrice =
        btcPrice * (1 + (signal.direction === "long_btc_short_xrp" ? slippageAdjustment : -slippageAdjustment))
      const adjustedXrpPrice =
        xrpPrice * (1 + (signal.direction === "short_btc_long_xrp" ? slippageAdjustment : -slippageAdjustment))

      const commission = positionSize.capitalAllocated * this.config.commission
      const slippageCost = positionSize.capitalAllocated * slippageAdjustment

      // Create trade execution
      const execution: TradeExecution = {
        id: `exec_${this.tradeCounter}_entry`,
        timestamp: date,
        type: "entry",
        direction: signal.direction,
        btcPrice: adjustedBtcPrice,
        xrpPrice: adjustedXrpPrice,
        btcAmount: positionSize.btcAmount,
        xrpAmount: positionSize.xrpAmount,
        leverage: positionSize.leverage,
        commission,
        slippage: slippageCost,
        reason: `${signal.regime} regime entry (z-score: ${signal.zscore.toFixed(2)})`,
        signalStrength: signal.strength,
        regime: signal.regime,
      }

      // Create trade record
      const trade: Trade = {
        id: `trade_${this.tradeCounter++}`,
        entryExecution: execution,
        status: "open",
        regime: signal.regime,
        strategy:
          signal.regime === "high-correlation"
            ? "mean_reversion"
            : signal.regime === "low-correlation"
              ? "momentum"
              : "transition",

        entryDate: date,
        entryBtcPrice: adjustedBtcPrice,
        entryXrpPrice: adjustedXrpPrice,
        entryZscore: signal.zscore,
        entrySignalStrength: signal.strength,
        entryReason: execution.reason,

        btcAmount: positionSize.btcAmount,
        xrpAmount: positionSize.xrpAmount,
        leverage: positionSize.leverage,
        capitalAllocated: positionSize.capitalAllocated,

        pnlDollar: 0,
        pnlPercent: 0,
        holdingPeriod: 0,
        maxFavorableExcursion: 0,
        maxAdverseExcursion: 0,

        totalCommission: commission,
        totalSlippage: slippageCost,
      }

      // Update portfolio state
      this.currentCash -= positionSize.capitalAllocated + commission + slippageCost
      this.activeTrades.set(trade.id, trade)

      console.log(`Opened ${trade.strategy} trade: ${trade.id} (${signal.direction})`)
    } catch (error) {
      console.error("Error executing entry:", error)
    }
  }

  /**
   * Update existing positions
   */
  private async updatePositions(date: Date, btcPrice: number, xrpPrice: number, zscore: number): Promise<void> {
    const positionsToClose: string[] = []

    for (const [tradeId, trade] of this.activeTrades) {
      // Update P&L and excursions
      this.updateTradeMetrics(trade, btcPrice, xrpPrice)

      // Check exit conditions
      const shouldExit = this.shouldExitPosition(trade, zscore, date)

      if (shouldExit.exit) {
        await this.executeExit(trade, date, btcPrice, xrpPrice, shouldExit.reason)
        positionsToClose.push(tradeId)
      }
    }

    // Remove closed positions
    positionsToClose.forEach((id) => {
      const trade = this.activeTrades.get(id)
      if (trade) {
        this.completedTrades.push(trade)
        this.activeTrades.delete(id)
      }
    })
  }

  /**
   * Check if position should be exited
   */
  private shouldExitPosition(trade: Trade, zscore: number, currentDate: Date): { exit: boolean; reason: string } {
    // Time-based exit (max holding period)
    const holdingDays = (currentDate.getTime() - trade.entryDate.getTime()) / (1000 * 60 * 60 * 24)
    if (holdingDays > 30) {
      return { exit: true, reason: "max_holding_period" }
    }

    // Stop loss
    if (trade.pnlPercent < -0.05) {
      // 5% stop loss
      return { exit: true, reason: "stop_loss" }
    }

    // Profit target
    if (trade.pnlPercent > 0.03) {
      // 3% profit target
      return { exit: true, reason: "profit_target" }
    }

    // Mean reversion exit
    if (trade.strategy === "mean_reversion" && Math.abs(zscore) < this.strategyParams.zscoreExitThreshold) {
      return { exit: true, reason: "mean_reversion_target" }
    }

    // Momentum exit (reversal)
    if (trade.strategy === "momentum") {
      if ((trade.entryZscore > 0 && zscore < 0) || (trade.entryZscore < 0 && zscore > 0)) {
        return { exit: true, reason: "momentum_reversal" }
      }
    }

    return { exit: false, reason: "" }
  }

  /**
   * Execute trade exit
   */
  private async executeExit(
    trade: Trade,
    date: Date,
    btcPrice: number,
    xrpPrice: number,
    reason: string,
  ): Promise<void> {
    try {
      // Apply slippage and commission
      const slippageAdjustment = this.config.slippage
      const adjustedBtcPrice = btcPrice * (1 + (trade.btcAmount > 0 ? -slippageAdjustment : slippageAdjustment))
      const adjustedXrpPrice = xrpPrice * (1 + (trade.xrpAmount > 0 ? -slippageAdjustment : slippageAdjustment))

      const commission = trade.capitalAllocated * this.config.commission
      const slippageCost = trade.capitalAllocated * slippageAdjustment

      // Create exit execution
      const exitExecution: TradeExecution = {
        id: `${trade.id}_exit`,
        timestamp: date,
        type: "exit",
        direction: trade.entryExecution.direction,
        btcPrice: adjustedBtcPrice,
        xrpPrice: adjustedXrpPrice,
        btcAmount: -trade.btcAmount,
        xrpAmount: -trade.xrpAmount,
        leverage: trade.leverage,
        commission,
        slippage: slippageCost,
        reason,
        signalStrength: 0,
        regime: trade.regime,
      }

      // Calculate final P&L
      const btcPnl = trade.btcAmount * (adjustedBtcPrice - trade.entryBtcPrice)
      const xrpPnl = trade.xrpAmount * (adjustedXrpPrice - trade.entryXrpPrice)
      const grossPnl = btcPnl + xrpPnl
      const netPnl = grossPnl - commission - slippageCost - trade.totalCommission - trade.totalSlippage

      // Update trade record
      trade.exitExecution = exitExecution
      trade.status = "closed"
      trade.exitDate = date
      trade.exitBtcPrice = adjustedBtcPrice
      trade.exitXrpPrice = adjustedXrpPrice
      trade.exitReason = reason
      trade.pnlDollar = netPnl
      trade.pnlPercent = netPnl / trade.capitalAllocated
      trade.holdingPeriod = (date.getTime() - trade.entryDate.getTime()) / (1000 * 60 * 60 * 24)
      trade.totalCommission += commission
      trade.totalSlippage += slippageCost

      // Update portfolio state
      this.currentCash += trade.capitalAllocated + netPnl

      console.log(
        `Closed trade: ${trade.id} | P&L: $${netPnl.toFixed(2)} (${(trade.pnlPercent * 100).toFixed(2)}%) | Reason: ${reason}`,
      )
    } catch (error) {
      console.error("Error executing exit:", error)
    }
  }

  /**
   * Update trade metrics (P&L, excursions)
   */
  private updateTradeMetrics(trade: Trade, btcPrice: number, xrpPrice: number): void {
    const btcPnl = trade.btcAmount * (btcPrice - trade.entryBtcPrice)
    const xrpPnl = trade.xrpAmount * (xrpPrice - trade.entryXrpPrice)
    const grossPnl = btcPnl + xrpPnl
    const netPnl = grossPnl - trade.totalCommission - trade.totalSlippage

    trade.pnlDollar = netPnl
    trade.pnlPercent = netPnl / trade.capitalAllocated

    // Update excursions
    if (trade.pnlPercent > trade.maxFavorableExcursion) {
      trade.maxFavorableExcursion = trade.pnlPercent
    }
    if (trade.pnlPercent < trade.maxAdverseExcursion) {
      trade.maxAdverseExcursion = trade.pnlPercent
    }
  }

  /**
   * Update equity curve
   */
  private updateEquityCurve(date: Date, btcPrice: number, xrpPrice: number, regime: RegimeState): void {
    let unrealizedPnl = 0

    // Calculate unrealized P&L from active positions
    for (const trade of this.activeTrades.values()) {
      this.updateTradeMetrics(trade, btcPrice, xrpPrice)
      unrealizedPnl += trade.pnlDollar
    }

    const totalEquity = this.currentCash + unrealizedPnl
    const drawdown = this.calculateCurrentDrawdown(totalEquity)

    this.equityCurve.push({
      date,
      equity: totalEquity,
      cash: this.currentCash,
      unrealizedPnl,
      realizedPnl: totalEquity - this.config.initialCapital - unrealizedPnl,
      drawdown,
      regime: regime.current,
      activePositions: this.activeTrades.size,
    })

    this.currentEquity = totalEquity
  }

  /**
   * Calculate current drawdown
   */
  private calculateCurrentDrawdown(currentEquity: number): number {
    if (this.equityCurve.length === 0) return 0

    const peak = Math.max(...this.equityCurve.map((point) => point.equity), currentEquity)
    return ((peak - currentEquity) / peak) * 100
  }

  /**
   * Get current portfolio state
   */
  private getCurrentPortfolio(): any {
    const positions = Array.from(this.activeTrades.values())
    const allocatedCapital = positions.reduce((sum, trade) => sum + trade.capitalAllocated, 0)

    return {
      totalCapital: this.currentEquity,
      availableCapital: this.currentCash,
      positions,
      equity: [this.currentEquity],
      returns: this.equityCurve.map((point) => point.equity / this.config.initialCapital - 1),
    }
  }

  /**
   * Close all positions
   */
  private closeAllPositions(date: Date, btcPrice: number, xrpPrice: number, reason: string): void {
    for (const trade of this.activeTrades.values()) {
      this.executeExit(trade, date, btcPrice, xrpPrice, reason)
      this.completedTrades.push(trade)
    }
    this.activeTrades.clear()
  }

  /**
   * Rebalance portfolio
   */
  private async rebalancePortfolio(date: Date, btcPrice: number, xrpPrice: number): Promise<void> {
    // Implementation for portfolio rebalancing
    // This could include position sizing adjustments, risk management, etc.
  }

  /**
   * Validate market data
   */
  private validateMarketData(marketData: MarketData): void {
    if (!marketData.dates || marketData.dates.length === 0) {
      throw new Error("No date data provided")
    }

    if (marketData.btcPrices.length !== marketData.xrpPrices.length) {
      throw new Error("BTC and XRP price series must have equal length")
    }

    if (marketData.dates.length !== marketData.btcPrices.length) {
      throw new Error("Date and price series must have equal length")
    }

    const minDataPoints = this.strategyParams.correlationWindow + 50
    if (marketData.dates.length < minDataPoints) {
      throw new Error(`Insufficient data. Need at least ${minDataPoints} data points`)
    }
  }

  /**
   * Initialize backtest state
   */
  private initializeBacktest(): void {
    this.currentEquity = this.config.initialCapital
    this.currentCash = this.config.initialCapital
    this.activeTrades.clear()
    this.completedTrades = []
    this.equityCurve = []
    this.tradeCounter = 0
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): any {
    // This will be implemented in the performance-metrics.ts file
    // For now, return basic metrics
    const totalReturn = ((this.currentEquity - this.config.initialCapital) / this.config.initialCapital) * 100
    const winningTrades = this.completedTrades.filter((t) => t.pnlDollar > 0).length
    const winRate = this.completedTrades.length > 0 ? (winningTrades / this.completedTrades.length) * 100 : 0

    return {
      totalReturn,
      winRate,
      totalTrades: this.completedTrades.length,
      // More metrics will be added by PerformanceCalculator
    }
  }

  /**
   * Calculate monthly returns
   */
  private calculateMonthlyReturns(): Array<{ month: string; return: number; regime: string }> {
    // Implementation for monthly returns calculation
    return []
  }

  /**
   * Calculate yearly returns
   */
  private calculateYearlyReturns(): Array<{ year: number; return: number }> {
    // Implementation for yearly returns calculation
    return []
  }

  /**
   * Identify drawdown periods
   */
  private identifyDrawdownPeriods(): Array<{ start: Date; end: Date; depth: number; duration: number }> {
    // Implementation for drawdown period identification
    return []
  }
}
