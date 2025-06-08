import { StatisticalUtils } from "../utils/statistics"
import { MathHelpers } from "../utils/math-helpers"
import type { ZScoreResult } from "./types"

/**
 * Z-Score calculation engine for spread analysis
 */
export class ZScoreCalculator {
  /**
   * Calculate rolling z-score for spread series
   */
  static calculateRollingZScore(
    spread: number[],
    window: number,
    method: "simple" | "exponential" = "simple",
  ): ZScoreResult[] {
    if (spread.length < window) {
      throw new Error(`Spread series too short. Need at least ${window} observations`)
    }

    const results: ZScoreResult[] = []

    for (let i = window - 1; i < spread.length; i++) {
      try {
        let mean: number
        let stdDev: number

        if (method === "simple") {
          const windowData = spread.slice(i - window + 1, i + 1)
          mean = windowData.reduce((sum, val) => sum + val, 0) / window
          const variance = windowData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window
          stdDev = Math.sqrt(variance)
        } else {
          // Exponential weighted moving average and standard deviation
          const alpha = 2 / (window + 1)
          const windowData = spread.slice(0, i + 1)
          const ema = MathHelpers.exponentialMovingAverage(windowData, alpha)
          mean = ema[ema.length - 1]

          // Calculate exponential weighted standard deviation
          let ewVariance = 0
          let weightSum = 0
          for (let j = 0; j < windowData.length; j++) {
            const weight = Math.pow(1 - alpha, windowData.length - 1 - j)
            ewVariance += weight * Math.pow(windowData[j] - mean, 2)
            weightSum += weight
          }
          stdDev = Math.sqrt(ewVariance / weightSum)
        }

        const currentSpread = spread[i]
        const zscore = stdDev === 0 ? 0 : MathHelpers.zScore(currentSpread, mean, stdDev)

        // Calculate percentile
        const windowData = spread.slice(Math.max(0, i - window + 1), i + 1)
        const percentile = MathHelpers.percentile(windowData, currentSpread)

        // Determine if signal is significant
        const isSignificant = Math.abs(zscore) > 2.0

        results.push({
          zscore,
          mean,
          stdDev,
          spread: currentSpread,
          isSignificant,
          percentile,
        })
      } catch (error) {
        console.warn(`Z-score calculation failed at index ${i}:`, error)
        results.push({
          zscore: 0,
          mean: 0,
          stdDev: 0,
          spread: spread[i],
          isSignificant: false,
          percentile: 50,
        })
      }
    }

    return results
  }

  /**
   * Calculate spread from price series using hedge ratio
   */
  static calculateSpread(
    series1: number[],
    series2: number[],
    hedgeRatio: number,
    method: "price" | "log" = "log",
  ): number[] {
    if (series1.length !== series2.length) {
      throw new Error("Series must have equal length")
    }

    if (method === "log") {
      // Log spread: log(S1) - hedgeRatio * log(S2)
      return series1.map((price1, i) => Math.log(price1) - hedgeRatio * Math.log(series2[i]))
    } else {
      // Price spread: S1 - hedgeRatio * S2
      return series1.map((price1, i) => price1 - hedgeRatio * series2[i])
    }
  }

  /**
   * Adaptive window sizing based on market volatility
   */
  static adaptiveWindowSize(volatility: number[], baseWindow = 30, minWindow = 15, maxWindow = 60): number[] {
    const windowSizes: number[] = []

    // Calculate rolling volatility percentiles
    const volWindow = 20
    for (let i = 0; i < volatility.length; i++) {
      if (i < volWindow) {
        windowSizes.push(baseWindow)
        continue
      }

      const recentVol = volatility.slice(i - volWindow, i)
      const currentVol = volatility[i]
      const volPercentile = MathHelpers.percentile(recentVol, currentVol)

      // Higher volatility -> shorter window (more responsive)
      // Lower volatility -> longer window (more stable)
      let adaptiveWindow: number
      if (volPercentile > 80) {
        adaptiveWindow = minWindow
      } else if (volPercentile > 60) {
        adaptiveWindow = Math.floor(baseWindow * 0.8)
      } else if (volPercentile < 20) {
        adaptiveWindow = maxWindow
      } else if (volPercentile < 40) {
        adaptiveWindow = Math.floor(baseWindow * 1.2)
      } else {
        adaptiveWindow = baseWindow
      }

      windowSizes.push(Math.max(minWindow, Math.min(maxWindow, adaptiveWindow)))
    }

    return windowSizes
  }

  /**
   * Calculate z-score with adaptive thresholds
   */
  static calculateAdaptiveZScore(
    spread: number[],
    window: number,
    volatilityAdjustment = true,
  ): Array<ZScoreResult & { adaptiveThreshold: number }> {
    const baseResults = this.calculateRollingZScore(spread, window)

    return baseResults.map((result, i) => {
      let adaptiveThreshold = 2.0 // Base threshold

      if (volatilityAdjustment && i >= window) {
        // Adjust threshold based on recent volatility
        const recentSpreads = spread.slice(Math.max(0, i - window), i + 1)
        const spreadVol = StatisticalUtils.calculateVolatility(
          StatisticalUtils.calculateReturns(recentSpreads.map((s) => Math.abs(s))),
        )

        // Higher volatility -> higher threshold (less sensitive)
        // Lower volatility -> lower threshold (more sensitive)
        const volAdjustment = Math.max(0.5, Math.min(2.0, spreadVol * 10))
        adaptiveThreshold = 2.0 * volAdjustment
      }

      return {
        ...result,
        adaptiveThreshold,
      }
    })
  }

  /**
   * Detect z-score regime changes
   */
  static detectZScoreRegimes(
    zscores: number[],
    window = 20,
  ): Array<{ regime: "mean-reverting" | "trending" | "neutral"; confidence: number }> {
    const regimes: Array<{ regime: "mean-reverting" | "trending" | "neutral"; confidence: number }> = []

    for (let i = window; i < zscores.length; i++) {
      const recentZScores = zscores.slice(i - window, i)

      // Calculate metrics for regime detection
      const meanAbsZScore = recentZScores.reduce((sum, z) => sum + Math.abs(z), 0) / window
      const crossings = this.countZeroCrossings(recentZScores)
      const trend = this.calculateTrend(recentZScores)

      let regime: "mean-reverting" | "trending" | "neutral"
      let confidence: number

      if (meanAbsZScore > 1.5 && crossings >= 3) {
        regime = "mean-reverting"
        confidence = Math.min(0.9, meanAbsZScore / 3.0 + crossings / 10.0)
      } else if (Math.abs(trend) > 0.1 && crossings <= 1) {
        regime = "trending"
        confidence = Math.min(0.9, Math.abs(trend) * 5.0)
      } else {
        regime = "neutral"
        confidence = 0.5
      }

      regimes.push({ regime, confidence })
    }

    return regimes
  }

  /**
   * Count zero crossings in a series
   */
  private static countZeroCrossings(series: number[]): number {
    let crossings = 0
    for (let i = 1; i < series.length; i++) {
      if ((series[i] > 0 && series[i - 1] < 0) || (series[i] < 0 && series[i - 1] > 0)) {
        crossings++
      }
    }
    return crossings
  }

  /**
   * Calculate trend in a series
   */
  private static calculateTrend(series: number[]): number {
    const x = Array.from({ length: series.length }, (_, i) => i)
    const regression = StatisticalUtils.linearRegression(x, series)
    return regression.slope
  }

  /**
   * Calculate z-score momentum
   */
  static calculateZScoreMomentum(zscores: number[], window = 5): number[] {
    const momentum: number[] = []

    for (let i = window; i < zscores.length; i++) {
      const recent = zscores.slice(i - window, i)
      const current = zscores[i]

      // Calculate momentum as rate of change
      const avgRecent = recent.reduce((sum, z) => sum + z, 0) / window
      const mom = current - avgRecent

      momentum.push(mom)
    }

    return momentum
  }
}
