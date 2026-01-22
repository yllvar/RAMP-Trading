import { Logger } from "../utils/logger"
import { StatisticalUtils } from "../utils/statistics"
import { MathHelpers } from "../utils/math-helpers"
import type { CointegrationResult } from "./types"

/**
 * Cointegration testing engine using Engle-Granger methodology
 */
export class CointegrationTester {
  /**
   * Perform Engle-Granger two-step cointegration test
   */
  static performEngleGrangerTest(series1: number[], series2: number[]): CointegrationResult {
    if (series1.length !== series2.length || series1.length < 30) {
      throw new Error("Series must have equal length and at least 30 observations")
    }

    try {
      // Step 1: Estimate the cointegrating relationship
      const regression = StatisticalUtils.linearRegression(series1, series2)
      const hedgeRatio = regression.slope
      const residuals = regression.residuals

      // Step 2: Test residuals for stationarity using ADF test
      const adfTest = StatisticalUtils.augmentedDickeyFullerTest(residuals, 1)

      // Calculate half-life of mean reversion
      const halfLife = MathHelpers.calculateHalfLife(residuals)

      // Determine if series are cointegrated
      // More stringent critical values for cointegration test
      const cointegrationCriticalValues = {
        "1%": -3.9,
        "5%": -3.34,
        "10%": -3.04,
      }

      const isCointegrated = adfTest.testStatistic < cointegrationCriticalValues["5%"]

      // Estimate p-value for cointegration
      let pValue = 0.5
      if (adfTest.testStatistic < cointegrationCriticalValues["1%"]) pValue = 0.01
      else if (adfTest.testStatistic < cointegrationCriticalValues["5%"]) pValue = 0.05
      else if (adfTest.testStatistic < cointegrationCriticalValues["10%"]) pValue = 0.1

      return {
        isCointegrated,
        pValue,
        testStatistic: adfTest.testStatistic,
        criticalValues: cointegrationCriticalValues,
        hedgeRatio,
        residuals,
        halfLife,
        rSquared: regression.rSquared,
      }
    } catch (error) {
      console.error("Error in cointegration test:", error)
      throw new Error("Failed to perform cointegration test")
    }
  }

  /**
   * Rolling cointegration test
   */
  static rollingCointegrationTest(
    series1: number[],
    series2: number[],
    window: number,
  ): Array<CointegrationResult | null> {
    const results: Array<CointegrationResult | null> = []

    for (let i = window; i <= series1.length; i++) {
      try {
        const windowSeries1 = series1.slice(i - window, i)
        const windowSeries2 = series2.slice(i - window, i)
        const result = this.performEngleGrangerTest(windowSeries1, windowSeries2)
        results.push(result)
      } catch (error) {
        console.warn(`Rolling cointegration test failed at window ${i}:`, error)
        results.push(null)
      }
    }

    return results
  }

  /**
   * Calculate optimal hedge ratio using different methods
   */
  static calculateOptimalHedgeRatio(
    series1: number[],
    series2: number[],
    method: "ols" | "tls" | "kalman" = "ols",
  ): number {
    switch (method) {
      case "ols":
        const regression = StatisticalUtils.linearRegression(series1, series2)
        return regression.slope

      case "tls":
        // Total Least Squares (more robust to noise in both series)
        return this.totalLeastSquares(series1, series2)

      case "kalman":
        // Kalman filter for time-varying hedge ratio
        return this.kalmanFilterHedgeRatio(series1, series2)

      default:
        throw new Error("Unknown hedge ratio calculation method")
    }
  }

  /**
   * Total Least Squares hedge ratio calculation
   */
  private static totalLeastSquares(x: number[], y: number[]): number {
    const n = x.length
    const meanX = x.reduce((sum, val) => sum + val, 0) / n
    const meanY = y.reduce((sum, val) => sum + val, 0) / n

    let sxx = 0,
      syy = 0,
      sxy = 0

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX
      const dy = y[i] - meanY
      sxx += dx * dx
      syy += dy * dy
      sxy += dx * dy
    }

    // TLS slope calculation
    const slope = (syy - sxx + Math.sqrt((syy - sxx) ** 2 + 4 * sxy ** 2)) / (2 * sxy)
    return slope
  }

  /**
   * Kalman filter for dynamic hedge ratio estimation
   */
  private static kalmanFilterHedgeRatio(x: number[], y: number[]): number {
    // Simplified Kalman filter implementation
    let hedgeRatio = 1.0
    let P = 1.0 // Error covariance
    const Q = 0.001 // Process noise
    const R = 0.1 // Measurement noise

    for (let i = 1; i < x.length; i++) {
      // Prediction step
      P = P + Q

      // Update step
      const innovation = y[i] - hedgeRatio * x[i]
      const S = x[i] * P * x[i] + R
      const K = (P * x[i]) / S

      hedgeRatio = hedgeRatio + K * innovation
      P = P - K * x[i] * P
    }

    return hedgeRatio
  }

  /**
   * Test for structural breaks in cointegration relationship
   */
  static testStructuralBreaks(
    series1: number[],
    series2: number[],
    breakPoints: number[] = [],
  ): {
    hasBreak: boolean
    breakPoint?: number
    beforeAfterTest: { before: CointegrationResult; after: CointegrationResult } | null
  } {
    if (breakPoints.length === 0) {
      // Auto-detect potential break points
      const midPoint = Math.floor(series1.length / 2)
      breakPoints = [midPoint]
    }

    for (const breakPoint of breakPoints) {
      if (breakPoint < 30 || breakPoint > series1.length - 30) continue

      const beforeSeries1 = series1.slice(0, breakPoint)
      const beforeSeries2 = series2.slice(0, breakPoint)
      const afterSeries1 = series1.slice(breakPoint)
      const afterSeries2 = series2.slice(breakPoint)

      try {
        const beforeTest = this.performEngleGrangerTest(beforeSeries1, beforeSeries2)
        const afterTest = this.performEngleGrangerTest(afterSeries1, afterSeries2)

        // Check if cointegration relationship changed significantly
        const hedgeRatioDiff = Math.abs(beforeTest.hedgeRatio - afterTest.hedgeRatio)
        const rSquaredDiff = Math.abs(beforeTest.rSquared - afterTest.rSquared)

        if (hedgeRatioDiff > 0.2 || rSquaredDiff > 0.3) {
          return {
            hasBreak: true,
            breakPoint,
            beforeAfterTest: { before: beforeTest, after: afterTest },
          }
        }
      } catch (error) {
        console.warn(`Structural break test failed at point ${breakPoint}:`, error)
      }
    }

    return { hasBreak: false, beforeAfterTest: null }
  }

  /**
   * Calculate cointegration confidence score
   */
  static calculateCointegrationConfidence(result: CointegrationResult): number {
    let confidence = 0

    // Statistical significance (40% weight)
    if (result.pValue <= 0.01) confidence += 0.4
    else if (result.pValue <= 0.05) confidence += 0.3
    else if (result.pValue <= 0.1) confidence += 0.2

    // R-squared quality (30% weight)
    confidence += Math.min(result.rSquared, 1.0) * 0.3

    // Half-life reasonableness (20% weight)
    if (result.halfLife > 1 && result.halfLife < 100) {
      confidence += 0.2
    } else if (result.halfLife >= 100 && result.halfLife < 500) {
      confidence += 0.1
    }

    // Hedge ratio stability (10% weight)
    if (Math.abs(result.hedgeRatio) > 0.1 && Math.abs(result.hedgeRatio) < 10) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }
}
