import { Logger } from "../utils/logger"
import { BacktestingEngine } from "./backtesting-engine"
import type {
  WalkForwardResult,
  WalkForwardAnalysis,
  BacktestConfiguration,
  StrategyParameters,
  RiskParameters,
  MarketData,
} from "./types"

/**
 * Walk-forward testing framework for out-of-sample validation
 */
export class WalkForwardTester {
  private baseConfig: BacktestConfiguration
  private baseStrategyParams: StrategyParameters
  private baseRiskParams: RiskParameters

  constructor(config: BacktestConfiguration, strategyParams: StrategyParameters, riskParams: RiskParameters) {
    this.baseConfig = config
    this.baseStrategyParams = strategyParams
    this.baseRiskParams = riskParams
  }

  /**
   * Run walk-forward analysis
   */
  async runWalkForwardAnalysis(
    marketData: MarketData,
    inSampleDays = 252,
    outOfSampleDays = 63,
    stepSize = 21,
  ): Promise<WalkForwardAnalysis> {
    Logger.info('Starting walk-forward analysis...')

    const results: WalkForwardResult[] = []
    const totalDays = marketData.dates.length

    // Ensure we have enough data
    if (totalDays < inSampleDays + outOfSampleDays) {
      throw new Error("Insufficient data for walk-forward analysis")
    }

    let currentStart = 0

    while (currentStart + inSampleDays + outOfSampleDays <= totalDays) {
      const inSampleEnd = currentStart + inSampleDays
      const outOfSampleEnd = inSampleEnd + outOfSampleDays

      console.log(`Processing window: ${currentStart} to ${outOfSampleEnd}`)

      // Split data
      const inSampleData = this.extractDataWindow(marketData, currentStart, inSampleEnd)
      const outOfSampleData = this.extractDataWindow(marketData, inSampleEnd, outOfSampleEnd)

      // Run in-sample optimization
      const optimalParams = await this.optimizeParameters(inSampleData)

      // Test in-sample with optimal parameters
      const inSampleEngine = new BacktestingEngine(
        this.createWindowConfig(inSampleData),
        optimalParams,
        this.baseRiskParams,
      )
      const inSampleResult = await inSampleEngine.runBacktest(inSampleData)

      // Test out-of-sample with optimal parameters
      const outOfSampleEngine = new BacktestingEngine(
        this.createWindowConfig(outOfSampleData),
        optimalParams,
        this.baseRiskParams,
      )
      const outOfSampleResult = await outOfSampleEngine.runBacktest(outOfSampleData)

      // Calculate degradation
      const degradation = this.calculateDegradation(inSampleResult.performance, outOfSampleResult.performance)

      results.push({
        inSamplePeriod: {
          start: inSampleData.dates[0],
          end: inSampleData.dates[inSampleData.dates.length - 1],
        },
        outOfSamplePeriod: {
          start: outOfSampleData.dates[0],
          end: outOfSampleData.dates[outOfSampleData.dates.length - 1],
        },
        inSampleMetrics: inSampleResult.performance,
        outOfSampleMetrics: outOfSampleResult.performance,
        optimalParameters: optimalParams,
        degradation,
      })

      currentStart += stepSize
    }

    // Calculate aggregate metrics
    const aggregateMetrics = this.calculateAggregateMetrics(results)

    // Analyze parameter stability
    const parameterStability = this.analyzeParameterStability(results)

    Logger.info('Walk-forward analysis completed!')

    return {
      results,
      aggregateMetrics,
      parameterStability,
    }
  }

  /**
   * Extract data window
   */
  private extractDataWindow(marketData: MarketData, start: number, end: number): MarketData {
    return {
      dates: marketData.dates.slice(start, end),
      btcPrices: marketData.btcPrices.slice(start, end),
      xrpPrices: marketData.xrpPrices.slice(start, end),
      btcReturns: marketData.btcReturns.slice(start, end),
      xrpReturns: marketData.xrpReturns.slice(start, end),
    }
  }

  /**
   * Create configuration for window
   */
  private createWindowConfig(windowData: MarketData): BacktestConfiguration {
    return {
      ...this.baseConfig,
      startDate: windowData.dates[0],
      endDate: windowData.dates[windowData.dates.length - 1],
    }
  }

  /**
   * Optimize parameters for in-sample period
   */
  private async optimizeParameters(inSampleData: MarketData): Promise<StrategyParameters> {
    // Parameter ranges for optimization
    const parameterRanges = {
      correlationWindow: [20, 30, 40, 50],
      highCorrelationThreshold: [0.65, 0.7, 0.75, 0.8],
      lowCorrelationThreshold: [0.2, 0.25, 0.3, 0.35],
      zscoreEntryThreshold: [2.0, 2.5, 3.0, 3.5],
      zscoreExitThreshold: [0.5, 1.0, 1.5],
      basePositionSize: [0.2, 0.3, 0.4, 0.5],
      meanReversionLeverage: [1.5, 2.0, 2.5, 3.0],
      momentumLeverage: [2.0, 3.0, 4.0, 5.0],
    }

    let bestParams = { ...this.baseStrategyParams }
    let bestSharpe = -999

    // Grid search optimization (simplified)
    for (const corrWindow of parameterRanges.correlationWindow) {
      for (const highCorr of parameterRanges.highCorrelationThreshold) {
        for (const lowCorr of parameterRanges.lowCorrelationThreshold) {
          for (const entryThreshold of parameterRanges.zscoreEntryThreshold) {
            const testParams: StrategyParameters = {
              ...this.baseStrategyParams,
              correlationWindow: corrWindow,
              highCorrelationThreshold: highCorr,
              lowCorrelationThreshold: lowCorr,
              zscoreEntryThreshold: entryThreshold,
            }

            try {
              const engine = new BacktestingEngine(
                this.createWindowConfig(inSampleData),
                testParams,
                this.baseRiskParams,
              )

              const result = await engine.runBacktest(inSampleData)

              if (result.performance.sharpeRatio > bestSharpe && result.performance.totalTrades > 10) {
                bestSharpe = result.performance.sharpeRatio
                bestParams = { ...testParams }
              }
            } catch (error) {
              console.warn("Parameter optimization failed for combination:", testParams)
            }
          }
        }
      }
    }

    return bestParams
  }

  /**
   * Calculate performance degradation
   */
  private calculateDegradation(inSampleMetrics: any, outOfSampleMetrics: any): number {
    // Calculate degradation as percentage drop in Sharpe ratio
    if (inSampleMetrics.sharpeRatio === 0) return 0

    return (
      ((inSampleMetrics.sharpeRatio - outOfSampleMetrics.sharpeRatio) / Math.abs(inSampleMetrics.sharpeRatio)) * 100
    )
  }

  /**
   * Calculate aggregate metrics across all windows
   */
  private calculateAggregateMetrics(results: WalkForwardResult[]): any {
    if (results.length === 0) {
      return {
        avgInSampleReturn: 0,
        avgOutOfSampleReturn: 0,
        avgDegradation: 0,
        consistency: 0,
        robustness: 0,
      }
    }

    const avgInSampleReturn = results.reduce((sum, r) => sum + r.inSampleMetrics.annualizedReturn, 0) / results.length

    const avgOutOfSampleReturn =
      results.reduce((sum, r) => sum + r.outOfSampleMetrics.annualizedReturn, 0) / results.length

    const avgDegradation = results.reduce((sum, r) => sum + r.degradation, 0) / results.length

    // Consistency: percentage of out-of-sample periods with positive returns
    const positiveOOS = results.filter((r) => r.outOfSampleMetrics.totalReturn > 0).length
    const consistency = (positiveOOS / results.length) * 100

    // Robustness: inverse of degradation standard deviation
    const degradationStd = Math.sqrt(
      results.reduce((sum, r) => sum + Math.pow(r.degradation - avgDegradation, 2), 0) / results.length,
    )
    const robustness = degradationStd > 0 ? 100 / degradationStd : 100

    return {
      avgInSampleReturn,
      avgOutOfSampleReturn,
      avgDegradation,
      consistency,
      robustness,
    }
  }

  /**
   * Analyze parameter stability across windows
   */
  private analyzeParameterStability(results: WalkForwardResult[]): any {
    const parameterNames = [
      "correlationWindow",
      "highCorrelationThreshold",
      "lowCorrelationThreshold",
      "zscoreEntryThreshold",
      "zscoreExitThreshold",
    ]

    const stability: { [param: string]: { mean: number; std: number; stability: number } } = {}

    for (const paramName of parameterNames) {
      const values = results.map((r) => (r.optimalParameters as any)[paramName])

      if (values.length > 0) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
        const std = Math.sqrt(variance)

        // Stability score: higher is more stable (lower coefficient of variation)
        const stabilityScore = mean > 0 ? 100 / (1 + std / mean) : 0

        stability[paramName] = {
          mean,
          std,
          stability: stabilityScore,
        }
      }
    }

    return stability
  }

  /**
   * Generate walk-forward report
   */
  generateReport(analysis: WalkForwardAnalysis): string {
    const { results, aggregateMetrics, parameterStability } = analysis

    let report = "WALK-FORWARD ANALYSIS REPORT\n"
    report += "=" * 50 + "\n\n"

    report += `Total Windows Tested: ${results.length}\n`
    report += `Average In-Sample Return: ${aggregateMetrics.avgInSampleReturn.toFixed(2)}%\n`
    report += `Average Out-of-Sample Return: ${aggregateMetrics.avgOutOfSampleReturn.toFixed(2)}%\n`
    report += `Average Degradation: ${aggregateMetrics.avgDegradation.toFixed(2)}%\n`
    report += `Consistency: ${aggregateMetrics.consistency.toFixed(1)}%\n`
    report += `Robustness Score: ${aggregateMetrics.robustness.toFixed(1)}\n\n`

    report += "PARAMETER STABILITY:\n"
    report += "-" * 30 + "\n"

    for (const [param, stats] of Object.entries(parameterStability)) {
      report += `${param}: Mean=${stats.mean.toFixed(3)}, Std=${stats.std.toFixed(3)}, Stability=${stats.stability.toFixed(1)}\n`
    }

    report += "\nWINDOW DETAILS:\n"
    report += "-" * 30 + "\n"

    results.forEach((result, index) => {
      report += `Window ${index + 1}:\n`
      report += `  In-Sample: ${result.inSampleMetrics.totalReturn.toFixed(2)}% (Sharpe: ${result.inSampleMetrics.sharpeRatio.toFixed(2)})\n`
      report += `  Out-of-Sample: ${result.outOfSampleMetrics.totalReturn.toFixed(2)}% (Sharpe: ${result.outOfSampleMetrics.sharpeRatio.toFixed(2)})\n`
      report += `  Degradation: ${result.degradation.toFixed(2)}%\n\n`
    })

    return report
  }

  /**
   * Run Monte Carlo walk-forward analysis
   */
  async runMonteCarloWalkForward(
    marketData: MarketData,
    numSimulations = 100,
    inSampleDays = 252,
    outOfSampleDays = 63,
  ): Promise<{
    simulations: WalkForwardAnalysis[]
    aggregateStats: {
      avgReturn: number
      stdReturn: number
      successRate: number
      worstCase: number
      bestCase: number
    }
  }> {
    console.log(`Running ${numSimulations} Monte Carlo walk-forward simulations...`)

    const simulations: WalkForwardAnalysis[] = []

    for (let i = 0; i < numSimulations; i++) {
      // Randomly select start point for this simulation
      const maxStart = marketData.dates.length - inSampleDays - outOfSampleDays
      const randomStart = Math.floor(Math.random() * maxStart)

      // Extract random window
      const windowData = this.extractDataWindow(marketData, randomStart, randomStart + inSampleDays + outOfSampleDays)

      try {
        const analysis = await this.runWalkForwardAnalysis(
          windowData,
          inSampleDays,
          outOfSampleDays,
          outOfSampleDays, // Non-overlapping windows
        )

        simulations.push(analysis)
      } catch (error) {
        console.warn(`Simulation ${i + 1} failed:`, error)
      }
    }

    // Calculate aggregate statistics
    const returns = simulations.map((sim) => sim.aggregateMetrics.avgOutOfSampleReturn)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const stdReturn = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)

    const successRate = (returns.filter((r) => r > 0).length / returns.length) * 100
    const worstCase = Math.min(...returns)
    const bestCase = Math.max(...returns)

    return {
      simulations,
      aggregateStats: {
        avgReturn,
        stdReturn,
        successRate,
        worstCase,
        bestCase,
      },
    }
  }
}
