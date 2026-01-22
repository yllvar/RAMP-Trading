import { Logger } from "../utils/logger"
/**
 * Comprehensive statistical utilities for quantitative trading
 */
export class StatisticalUtils {
  /**
   * Calculate Pearson correlation coefficient
   */
  static correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      throw new Error("Arrays must have equal length and not be empty")
    }

    const n = x.length
    const meanX = x.reduce((sum, val) => sum + val, 0) / n
    const meanY = y.reduce((sum, val) => sum + val, 0) / n

    let numerator = 0
    let denominatorX = 0
    let denominatorY = 0

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX
      const diffY = y[i] - meanY
      numerator += diffX * diffY
      denominatorX += diffX * diffX
      denominatorY += diffY * diffY
    }

    const denominator = Math.sqrt(denominatorX * denominatorY)
    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Linear regression analysis
   */
  static linearRegression(
    x: number[],
    y: number[],
  ): {
    slope: number
    intercept: number
    rSquared: number
    residuals: number[]
  } {
    if (x.length !== y.length || x.length < 2) {
      throw new Error("Arrays must have equal length and at least 2 points")
    }

    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate residuals and R-squared
    const residuals = y.map((val, i) => val - (slope * x[i] + intercept))
    const yMean = sumY / n
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0)
    const residualSumSquares = residuals.reduce((sum, val) => sum + val * val, 0)
    const rSquared = totalSumSquares === 0 ? 1 : 1 - residualSumSquares / totalSumSquares

    return { slope, intercept, rSquared, residuals }
  }

  /**
   * Calculate returns from price series
   */
  static calculateReturns(prices: number[]): number[] {
    if (prices.length < 2) return []

    return prices.slice(1).map((price, i) => (price - prices[i]) / prices[i])
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  static calculateVolatility(returns: number[], annualizationFactor = 252): number {
    if (returns.length < 2) return 0

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1)

    return Math.sqrt(variance * annualizationFactor)
  }

  /**
   * Rolling correlation calculation
   */
  static rollingCorrelation(x: number[], y: number[], window: number): number[] {
    if (x.length !== y.length || window > x.length) {
      throw new Error("Invalid input for rolling correlation")
    }

    const result: number[] = []
    for (let i = window - 1; i < x.length; i++) {
      const xWindow = x.slice(i - window + 1, i + 1)
      const yWindow = y.slice(i - window + 1, i + 1)
      result.push(this.correlation(xWindow, yWindow))
    }

    return result
  }

  /**
   * Augmented Dickey-Fuller test for stationarity
   */
  static augmentedDickeyFullerTest(
    series: number[],
    lags = 1,
  ): {
    testStatistic: number
    criticalValues: { [key: string]: number }
  } {
    if (series.length < 10) {
      throw new Error("Series too short for ADF test")
    }

    // First difference
    const diff = series.slice(1).map((val, i) => val - series[i])
    const lagged = series.slice(0, -1)

    // Simple regression for test statistic
    const regression = this.linearRegression(lagged, diff)
    const n = series.length
    const standardError =
      Math.sqrt(regression.residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2)) /
      Math.sqrt(lagged.reduce((sum, val) => sum + val * val, 0))

    const testStatistic = regression.slope / standardError

    // Critical values (approximate)
    const criticalValues = {
      "1%": -3.43,
      "5%": -2.86,
      "10%": -2.57,
    }

    return { testStatistic, criticalValues }
  }

  /**
   * Calculate z-score
   */
  static zScore(value: number, mean: number, stdDev: number): number {
    return stdDev === 0 ? 0 : (value - mean) / stdDev
  }

  /**
   * Calculate percentile rank
   */
  static percentileRank(series: number[], value: number): number {
    const sorted = [...series].sort((a, b) => a - b)
    let count = 0

    for (const val of sorted) {
      if (val < value) count++
      else if (val === value) count += 0.5
    }

    return (count / sorted.length) * 100
  }
}
