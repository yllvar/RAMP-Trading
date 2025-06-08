/**
 * Mathematical helper functions for quantitative trading
 */
export class MathHelpers {
  /**
   * Calculate Kelly optimal fraction
   */
  static kellyOptimalFraction(winRate: number, avgWin: number, avgLoss: number): number {
    if (avgLoss === 0 || winRate === 0 || winRate === 1) return 0

    const lossRate = 1 - winRate
    const winLossRatio = avgWin / avgLoss

    return (winRate * winLossRatio - lossRate) / winLossRatio
  }

  /**
   * Calculate Sharpe ratio
   */
  static calculateSharpeRatio(returns: number[], riskFreeRate = 0.02): number {
    if (returns.length < 2) return 0

    const excessReturns = returns.map((r) => r - riskFreeRate / 252)
    const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length
    const stdDev = Math.sqrt(
      excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcessReturn, 2), 0) / (excessReturns.length - 1),
    )

    return stdDev === 0 ? 0 : (meanExcessReturn * Math.sqrt(252)) / (stdDev * Math.sqrt(252))
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  static calculateVaR(returns: number[], confidenceLevel = 0.95): number {
    if (returns.length === 0) return 0

    const sorted = [...returns].sort((a, b) => a - b)
    const index = Math.floor((1 - confidenceLevel) * sorted.length)

    return sorted[Math.max(0, index)]
  }

  /**
   * Calculate Expected Shortfall (Conditional VaR)
   */
  static calculateExpectedShortfall(returns: number[], confidenceLevel = 0.95): number {
    const var95 = this.calculateVaR(returns, confidenceLevel)
    const tailReturns = returns.filter((r) => r <= var95)

    return tailReturns.length > 0 ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0
  }

  /**
   * Calculate half-life of mean reversion
   */
  static calculateHalfLife(residuals: number[]): number {
    if (residuals.length < 2) return Number.POSITIVE_INFINITY

    const laggedResiduals = residuals.slice(0, -1)
    const diffResiduals = residuals.slice(1).map((val, i) => val - residuals[i])

    // Simple regression to estimate AR(1) coefficient
    const n = laggedResiduals.length
    const sumX = laggedResiduals.reduce((sum, val) => sum + val, 0)
    const sumY = diffResiduals.reduce((sum, val) => sum + val, 0)
    const sumXY = laggedResiduals.reduce((sum, val, i) => sum + val * diffResiduals[i], 0)
    const sumXX = laggedResiduals.reduce((sum, val) => sum + val * val, 0)

    const lambda = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

    if (lambda >= 0) return Number.POSITIVE_INFINITY
    return -Math.log(2) / lambda
  }

  /**
   * Exponential moving average
   */
  static exponentialMovingAverage(series: number[], alpha: number): number[] {
    if (series.length === 0) return []

    const ema = [series[0]]
    for (let i = 1; i < series.length; i++) {
      ema.push(alpha * series[i] + (1 - alpha) * ema[i - 1])
    }

    return ema
  }

  /**
   * Calculate percentile of value in series
   */
  static percentile(series: number[], value: number): number {
    const sorted = [...series].sort((a, b) => a - b)
    let count = 0

    for (const val of sorted) {
      if (val < value) count++
      else if (val === value) count += 0.5
    }

    return (count / sorted.length) * 100
  }

  /**
   * Z-score calculation
   */
  static zScore(value: number, mean: number, stdDev: number): number {
    return stdDev === 0 ? 0 : (value - mean) / stdDev
  }

  /**
   * Compound Annual Growth Rate (CAGR)
   */
  static calculateCAGR(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || endValue <= 0 || years <= 0) return 0
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100
  }

  /**
   * Maximum Drawdown calculation
   */
  static calculateMaxDrawdown(equityCurve: number[]): { maxDrawdown: number; duration: number } {
    if (equityCurve.length === 0) return { maxDrawdown: 0, duration: 0 }

    let maxDrawdown = 0
    let maxDuration = 0
    let peak = equityCurve[0]
    let drawdownStart = 0
    let inDrawdown = false

    for (let i = 1; i < equityCurve.length; i++) {
      if (equityCurve[i] > peak) {
        peak = equityCurve[i]
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

        const drawdown = ((peak - equityCurve[i]) / peak) * 100
        maxDrawdown = Math.max(maxDrawdown, drawdown)
      }
    }

    if (inDrawdown) {
      const duration = equityCurve.length - 1 - drawdownStart
      maxDuration = Math.max(maxDuration, duration)
    }

    return { maxDrawdown, duration: maxDuration }
  }
}
