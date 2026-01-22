import { Logger } from "../utils/logger"
import { MathHelpers } from "../utils/math-helpers"
import { StatisticalUtils } from "../utils/statistics"
import type { PerformanceMetrics, RegimeMetrics, Trade, EquityPoint, BacktestConfiguration } from "./types"

/**
 * Comprehensive performance metrics calculator
 */
export class PerformanceCalculator {
  /**
   * Calculate complete performance metrics
   */
  static calculateMetrics(
    trades: Trade[],
    equityCurve: EquityPoint[],
    config: BacktestConfiguration,
  ): PerformanceMetrics {
    if (equityCurve.length === 0) {
      return this.createEmptyMetrics()
    }

    const returns = this.calculateReturns(equityCurve, config.initialCapital)
    const tradingDays = equityCurve.length
    const years = tradingDays / 252

    // Return metrics
    const totalReturn = this.calculateTotalReturn(equityCurve, config.initialCapital)
    const annualizedReturn = this.calculateAnnualizedReturn(totalReturn, years)
    const cagr = this.calculateCAGR(equityCurve, config.initialCapital, years)

    // Risk metrics
    const volatility = this.calculateVolatility(returns)
    const sharpeRatio = this.calculateSharpeRatio(returns)
    const sortinoRatio = this.calculateSortinoRatio(returns)
    const maxDrawdownInfo = this.calculateMaxDrawdown(equityCurve)
    const calmarRatio = annualizedReturn / Math.abs(maxDrawdownInfo.maxDrawdown)

    // Trade metrics
    const tradeMetrics = this.calculateTradeMetrics(trades)

    // Timing metrics
    const timingMetrics = this.calculateTimingMetrics(trades, equityCurve)

    // Risk-adjusted metrics
    const riskMetrics = this.calculateRiskMetrics(returns)

    // Regime-specific metrics
    const regimePerformance = this.calculateRegimePerformance(trades, equityCurve)

    return {
      // Return metrics
      totalReturn,
      annualizedReturn,
      cagr,

      // Risk metrics
      volatility,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown: maxDrawdownInfo.maxDrawdown,
      maxDrawdownDuration: maxDrawdownInfo.duration,

      // Trade metrics
      ...tradeMetrics,

      // Timing metrics
      ...timingMetrics,

      // Risk-adjusted metrics
      ...riskMetrics,

      // Regime-specific metrics
      regimePerformance,
    }
  }

  /**
   * Calculate returns from equity curve
   */
  private static calculateReturns(equityCurve: EquityPoint[], initialCapital: number): number[] {
    return equityCurve.map((point) => point.equity / initialCapital - 1)
  }

  /**
   * Calculate total return
   */
  private static calculateTotalReturn(equityCurve: EquityPoint[], initialCapital: number): number {
    const finalEquity = equityCurve[equityCurve.length - 1].equity
    return ((finalEquity - initialCapital) / initialCapital) * 100
  }

  /**
   * Calculate annualized return
   */
  private static calculateAnnualizedReturn(totalReturn: number, years: number): number {
    if (years <= 0) return 0
    return (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100
  }

  /**
   * Calculate Compound Annual Growth Rate (CAGR)
   */
  private static calculateCAGR(equityCurve: EquityPoint[], initialCapital: number, years: number): number {
    if (years <= 0) return 0
    const finalValue = equityCurve[equityCurve.length - 1].equity
    return (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100
  }

  /**
   * Calculate volatility (annualized)
   */
  private static calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0

    const dailyReturns = []
    for (let i = 1; i < returns.length; i++) {
      dailyReturns.push(returns[i] - returns[i - 1])
    }

    return StatisticalUtils.calculateVolatility(dailyReturns, 252) * 100
  }

  /**
   * Calculate Sharpe ratio
   */
  private static calculateSharpeRatio(returns: number[], riskFreeRate = 0.02): number {
    if (returns.length < 2) return 0

    const dailyReturns = []
    for (let i = 1; i < returns.length; i++) {
      dailyReturns.push(returns[i] - returns[i - 1])
    }

    const annualizedReturns = dailyReturns.map((r) => r * 252)
    return MathHelpers.calculateSharpeRatio(annualizedReturns, riskFreeRate)
  }

  /**
   * Calculate Sortino ratio
   */
  private static calculateSortinoRatio(returns: number[], riskFreeRate = 0.02): number {
    if (returns.length < 2) return 0

    const dailyReturns = []
    for (let i = 1; i < returns.length; i++) {
      dailyReturns.push(returns[i] - returns[i - 1])
    }

    const excessReturns = dailyReturns.map((r) => r * 252 - riskFreeRate)
    const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length

    // Downside deviation (only negative returns)
    const negativeReturns = excessReturns.filter((r) => r < 0)
    if (negativeReturns.length === 0) return Number.POSITIVE_INFINITY

    const downsideVariance = negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length
    const downsideDeviation = Math.sqrt(downsideVariance)

    return downsideDeviation === 0 ? 0 : meanExcessReturn / downsideDeviation
  }

  /**
   * Calculate maximum drawdown and duration
   */
  private static calculateMaxDrawdown(equityCurve: EquityPoint[]): { maxDrawdown: number; duration: number } {
    let maxDrawdown = 0
    let maxDuration = 0
    let peak = equityCurve[0].equity
    let drawdownStart = 0
    let inDrawdown = false

    for (let i = 1; i < equityCurve.length; i++) {
      const currentEquity = equityCurve[i].equity

      if (currentEquity > peak) {
        peak = currentEquity
        if (inDrawdown) {
          const duration = i - drawdownStart
          maxDuration = Math.max(maxDuration, duration)
          inDrawdown = false
        }
      } else {
        if (!inDrawdown) {
          drawdownStart = i
          inDrawdown = true
        }

        const drawdown = ((peak - currentEquity) / peak) * 100
        maxDrawdown = Math.max(maxDrawdown, drawdown)
      }
    }

    // Check if still in drawdown at the end
    if (inDrawdown) {
      const duration = equityCurve.length - 1 - drawdownStart
      maxDuration = Math.max(maxDuration, duration)
    }

    return { maxDrawdown, duration: maxDuration }
  }

  /**
   * Calculate trade-specific metrics
   */
  private static calculateTradeMetrics(trades: Trade[]): any {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
      }
    }

    const winningTrades = trades.filter((t) => t.pnlDollar > 0)
    const losingTrades = trades.filter((t) => t.pnlDollar <= 0)

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnlDollar, 0)
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlDollar, 0))

    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0

    const winRate = (winningTrades.length / trades.length) * 100
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : Number.POSITIVE_INFINITY

    // Expectancy = (Win Rate × Average Win) - (Loss Rate × Average Loss)
    const lossRate = losingTrades.length / trades.length
    const expectancy = (winRate / 100) * avgWin - lossRate * avgLoss

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
    }
  }

  /**
   * Calculate timing metrics
   */
  private static calculateTimingMetrics(trades: Trade[], equityCurve: EquityPoint[]): any {
    if (trades.length === 0) {
      return {
        avgHoldingPeriod: 0,
        avgTimeBetweenTrades: 0,
      }
    }

    const avgHoldingPeriod = trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length

    let avgTimeBetweenTrades = 0
    if (trades.length > 1) {
      const timeDiffs = []
      for (let i = 1; i < trades.length; i++) {
        const timeDiff = (trades[i].entryDate.getTime() - trades[i - 1].entryDate.getTime()) / (1000 * 60 * 60 * 24)
        timeDiffs.push(timeDiff)
      }
      avgTimeBetweenTrades = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length
    }

    return {
      avgHoldingPeriod,
      avgTimeBetweenTrades,
    }
  }

  /**
   * Calculate risk metrics
   */
  private static calculateRiskMetrics(returns: number[]): any {
    if (returns.length < 2) {
      return {
        var95: 0,
        var99: 0,
        expectedShortfall: 0,
        ulcerIndex: 0,
      }
    }

    const dailyReturns = []
    for (let i = 1; i < returns.length; i++) {
      dailyReturns.push(returns[i] - returns[i - 1])
    }

    const var95 = MathHelpers.calculateVaR(dailyReturns, 0.95) * 100
    const var99 = MathHelpers.calculateVaR(dailyReturns, 0.99) * 100
    const expectedShortfall = MathHelpers.calculateExpectedShortfall(dailyReturns, 0.95) * 100

    // Ulcer Index - measure of downside risk
    const drawdowns = returns.map((_, i) => {
      const peak = Math.max(...returns.slice(0, i + 1))
      return ((peak - returns[i]) / peak) * 100
    })

    const ulcerIndex = Math.sqrt(drawdowns.reduce((sum, dd) => sum + dd * dd, 0) / drawdowns.length)

    return {
      var95,
      var99,
      expectedShortfall,
      ulcerIndex,
    }
  }

  /**
   * Calculate regime-specific performance
   */
  private static calculateRegimePerformance(
    trades: Trade[],
    equityCurve: EquityPoint[],
  ): { [regime: string]: RegimeMetrics } {
    const regimes = ["high-correlation", "low-correlation", "transition"]
    const regimePerformance: { [regime: string]: RegimeMetrics } = {}

    for (const regime of regimes) {
      const regimeTrades = trades.filter((t) => t.regime === regime)
      const regimeEquityPoints = equityCurve.filter((p) => p.regime === regime)

      if (regimeTrades.length === 0) {
        regimePerformance[regime] = this.createEmptyRegimeMetrics()
        continue
      }

      const winningTrades = regimeTrades.filter((t) => t.pnlDollar > 0)
      const totalReturn = regimeTrades.reduce((sum, t) => sum + t.pnlPercent, 0) * 100
      const avgReturn = totalReturn / regimeTrades.length

      const returns = regimeTrades.map((t) => t.pnlPercent)
      const volatility =
        returns.length > 1
          ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn / 100, 2), 0) / returns.length) * 100
          : 0

      const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0

      // Calculate regime-specific max drawdown
      let maxDrawdown = 0
      if (regimeEquityPoints.length > 1) {
        let peak = regimeEquityPoints[0].equity
        for (const point of regimeEquityPoints) {
          if (point.equity > peak) peak = point.equity
          const drawdown = ((peak - point.equity) / peak) * 100
          maxDrawdown = Math.max(maxDrawdown, drawdown)
        }
      }

      const totalWins = winningTrades.reduce((sum, t) => sum + t.pnlDollar, 0)
      const totalLosses = Math.abs(
        regimeTrades.filter((t) => t.pnlDollar <= 0).reduce((sum, t) => sum + t.pnlDollar, 0),
      )
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : Number.POSITIVE_INFINITY

      regimePerformance[regime] = {
        trades: regimeTrades.length,
        winRate: (winningTrades.length / regimeTrades.length) * 100,
        avgReturn,
        totalReturn,
        volatility,
        sharpeRatio,
        maxDrawdown,
        profitFactor,
        avgHoldingPeriod: regimeTrades.reduce((sum, t) => sum + t.holdingPeriod, 0) / regimeTrades.length,
        timeInRegime: (regimeEquityPoints.length / equityCurve.length) * 100,
      }
    }

    return regimePerformance
  }

  /**
   * Create empty metrics for error cases
   */
  private static createEmptyMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      cagr: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      maxDrawdownDuration: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      avgHoldingPeriod: 0,
      avgTimeBetweenTrades: 0,
      var95: 0,
      var99: 0,
      expectedShortfall: 0,
      ulcerIndex: 0,
      regimePerformance: {},
    }
  }

  /**
   * Create empty regime metrics
   */
  private static createEmptyRegimeMetrics(): RegimeMetrics {
    return {
      trades: 0,
      winRate: 0,
      avgReturn: 0,
      totalReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      avgHoldingPeriod: 0,
      timeInRegime: 0,
    }
  }

  /**
   * Calculate benchmark comparison metrics
   */
  static calculateBenchmarkComparison(
    portfolioReturns: number[],
    benchmarkReturns: number[],
  ): { benchmarkReturn: number; alpha: number; beta: number; informationRatio: number } {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 2) {
      return { benchmarkReturn: 0, alpha: 0, beta: 0, informationRatio: 0 }
    }

    const benchmarkReturn = (benchmarkReturns[benchmarkReturns.length - 1] + 1 - 1) * 100

    // Calculate beta using linear regression
    const regression = StatisticalUtils.linearRegression(benchmarkReturns, portfolioReturns)
    const beta = regression.slope
    const alpha = regression.intercept * 252 * 100 // Annualized alpha

    // Information ratio = (Portfolio Return - Benchmark Return) / Tracking Error
    const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i])
    const trackingError =
      Math.sqrt(excessReturns.reduce((sum, r) => sum + r * r, 0) / excessReturns.length) * Math.sqrt(252) * 100

    const informationRatio =
      trackingError > 0 ? (portfolioReturns[portfolioReturns.length - 1] - benchmarkReturn) / trackingError : 0

    return {
      benchmarkReturn,
      alpha,
      beta,
      informationRatio,
    }
  }
}
