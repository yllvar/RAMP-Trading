import { Logger } from "../utils/logger"
/**
 * Multi-pair trading management system
 */
import { StatisticalUtils } from "../utils/statistics"
import { CointegrationTester } from "../strategy-engine/cointegration"
import type { TradingSignal } from "../strategy-engine/types"

export interface TradingPair {
  id: string
  baseAsset: string
  quoteAsset: string
  symbol: string
  isActive: boolean
  cointegrationScore: number
  correlation: number
  volatility: number
  volume24h: number
  spread: number
  lastUpdate: Date
  regime: "high-correlation" | "low-correlation" | "transition"
  signals: TradingSignal[]
  performance: {
    totalReturn: number
    sharpeRatio: number
    maxDrawdown: number
    winRate: number
    totalTrades: number
  }
}

export interface PairSelectionCriteria {
  minVolume: number
  minCointegration: number
  maxCorrelation: number
  minCorrelation: number
  maxSpread: number
  minLiquidity: number
  excludeStablecoins: boolean
  maxPairs: number
  rebalanceFrequency: number // in hours
}

export interface PortfolioAllocation {
  pairId: string
  allocation: number // percentage of total capital
  maxAllocation: number
  currentExposure: number
  riskScore: number
  expectedReturn: number
  volatility: number
}

export interface CorrelationMatrix {
  pairs: string[]
  matrix: number[][]
  eigenvalues: number[]
  diversificationRatio: number
  lastUpdate: Date
}

/**
 * Pair selection and management system
 */
export class PairManager {
  private pairs: Map<string, TradingPair> = new Map()
  private correlationMatrix?: CorrelationMatrix
  private selectionCriteria: PairSelectionCriteria
  private portfolioAllocations: Map<string, PortfolioAllocation> = new Map()

  constructor(criteria: PairSelectionCriteria) {
    this.selectionCriteria = criteria
  }

  /**
   * Discover and evaluate potential trading pairs
   */
  async discoverPairs(availableAssets: string[], marketData: { [symbol: string]: number[] }): Promise<TradingPair[]> {
    const discoveredPairs: TradingPair[] = []

    // Generate all possible pairs
    for (let i = 0; i < availableAssets.length; i++) {
      for (let j = i + 1; j < availableAssets.length; j++) {
        const baseAsset = availableAssets[i]
        const quoteAsset = availableAssets[j]

        // Skip if excluding stablecoins
        if (this.selectionCriteria.excludeStablecoins) {
          const stablecoins = ["USDT", "USDC", "BUSD", "DAI", "TUSD"]
          if (stablecoins.includes(baseAsset) || stablecoins.includes(quoteAsset)) {
            continue
          }
        }

        const pairId = `${baseAsset}_${quoteAsset}`
        const symbol = `${baseAsset}${quoteAsset}`

        // Get price data
        const basePrices = marketData[baseAsset]
        const quotePrices = marketData[quoteAsset]

        if (!basePrices || !quotePrices || basePrices.length < 100 || quotePrices.length < 100) {
          continue
        }

        // Evaluate pair
        const evaluation = await this.evaluatePair(baseAsset, quoteAsset, basePrices, quotePrices)

        if (this.meetsCriteria(evaluation)) {
          const pair: TradingPair = {
            id: pairId,
            baseAsset,
            quoteAsset,
            symbol,
            isActive: false,
            cointegrationScore: evaluation.cointegrationScore,
            correlation: evaluation.correlation,
            volatility: evaluation.volatility,
            volume24h: evaluation.volume24h,
            spread: evaluation.spread,
            lastUpdate: new Date(),
            regime: evaluation.regime,
            signals: [],
            performance: {
              totalReturn: 0,
              sharpeRatio: 0,
              maxDrawdown: 0,
              winRate: 0,
              totalTrades: 0,
            },
          }

          discoveredPairs.push(pair)
        }
      }
    }

    // Sort by quality score
    discoveredPairs.sort((a, b) => this.calculateQualityScore(b) - this.calculateQualityScore(a))

    // Limit to max pairs
    return discoveredPairs.slice(0, this.selectionCriteria.maxPairs)
  }

  /**
   * Evaluate a trading pair
   */
  private async evaluatePair(
    baseAsset: string,
    quoteAsset: string,
    basePrices: number[],
    quotePrices: number[],
  ): Promise<{
    cointegrationScore: number
    correlation: number
    volatility: number
    volume24h: number
    spread: number
    regime: "high-correlation" | "low-correlation" | "transition"
  }> {
    // Test cointegration
    const cointegrationResult = CointegrationTester.performEngleGrangerTest(basePrices, quotePrices)

    // Calculate correlation
    const baseReturns = StatisticalUtils.calculateReturns(basePrices)
    const quoteReturns = StatisticalUtils.calculateReturns(quotePrices)
    const correlation = StatisticalUtils.correlation(baseReturns, quoteReturns)

    // Calculate volatility
    const volatility = StatisticalUtils.calculateVolatility(baseReturns)

    // Calculate spread
    const spread = this.calculateSpread(basePrices, quotePrices, cointegrationResult.hedgeRatio)

    // Determine regime
    let regime: "high-correlation" | "low-correlation" | "transition"
    if (Math.abs(correlation) > 0.7) {
      regime = "high-correlation"
    } else if (Math.abs(correlation) < 0.3) {
      regime = "low-correlation"
    } else {
      regime = "transition"
    }

    return {
      cointegrationScore: cointegrationResult.isCointegrated ? 1 - cointegrationResult.pValue : 0,
      correlation,
      volatility,
      volume24h: 1000000, // Placeholder - would get from exchange
      spread: StatisticalUtils.standardDeviation(spread),
      regime,
    }
  }

  /**
   * Calculate spread between two price series
   */
  private calculateSpread(prices1: number[], prices2: number[], hedgeRatio: number): number[] {
    const spread: number[] = []

    for (let i = 0; i < Math.min(prices1.length, prices2.length); i++) {
      spread.push(Math.log(prices1[i]) - hedgeRatio * Math.log(prices2[i]))
    }

    return spread
  }

  /**
   * Check if pair meets selection criteria
   */
  private meetsCriteria(evaluation: {
    cointegrationScore: number
    correlation: number
    volatility: number
    volume24h: number
    spread: number
  }): boolean {
    return (
      evaluation.volume24h >= this.selectionCriteria.minVolume &&
      evaluation.cointegrationScore >= this.selectionCriteria.minCointegration &&
      Math.abs(evaluation.correlation) >= this.selectionCriteria.minCorrelation &&
      Math.abs(evaluation.correlation) <= this.selectionCriteria.maxCorrelation &&
      evaluation.spread <= this.selectionCriteria.maxSpread
    )
  }

  /**
   * Calculate quality score for pair ranking
   */
  private calculateQualityScore(pair: TradingPair): number {
    let score = 0

    // Cointegration score (40% weight)
    score += pair.cointegrationScore * 0.4

    // Volume score (20% weight)
    const volumeScore = Math.min(pair.volume24h / 10000000, 1) // Normalize to 10M
    score += volumeScore * 0.2

    // Spread score (20% weight) - lower is better
    const spreadScore = Math.max(0, 1 - pair.spread / 0.1) // Normalize to 10% spread
    score += spreadScore * 0.2

    // Volatility score (10% weight) - moderate volatility is preferred
    const optimalVolatility = 0.3
    const volatilityScore = 1 - Math.abs(pair.volatility - optimalVolatility) / optimalVolatility
    score += Math.max(0, volatilityScore) * 0.1

    // Performance score (10% weight)
    const performanceScore = Math.max(0, pair.performance.sharpeRatio / 2) // Normalize to Sharpe 2.0
    score += Math.min(1, performanceScore) * 0.1

    return score
  }

  /**
   * Update correlation matrix
   */
  async updateCorrelationMatrix(marketData: { [symbol: string]: number[] }): Promise<void> {
    const activePairs = Array.from(this.pairs.values()).filter((pair) => pair.isActive)

    if (activePairs.length < 2) {
      return
    }

    const pairIds = activePairs.map((pair) => pair.id)
    const returns: number[][] = []

    // Calculate returns for each pair
    for (const pair of activePairs) {
      const basePrices = marketData[pair.baseAsset]
      const quotePrices = marketData[pair.quoteAsset]

      if (basePrices && quotePrices) {
        const baseReturns = StatisticalUtils.calculateReturns(basePrices)
        const quoteReturns = StatisticalUtils.calculateReturns(quotePrices)

        // Calculate pair returns (spread returns)
        const pairReturns: number[] = []
        for (let i = 0; i < Math.min(baseReturns.length, quoteReturns.length); i++) {
          pairReturns.push(baseReturns[i] - quoteReturns[i])
        }

        returns.push(pairReturns)
      }
    }

    // Calculate correlation matrix
    const matrix: number[][] = []
    for (let i = 0; i < returns.length; i++) {
      matrix[i] = []
      for (let j = 0; j < returns.length; j++) {
        if (i === j) {
          matrix[i][j] = 1.0
        } else {
          matrix[i][j] = StatisticalUtils.correlation(returns[i], returns[j])
        }
      }
    }

    // Calculate eigenvalues for diversification analysis
    const eigenvalues = this.calculateEigenvalues(matrix)

    // Calculate diversification ratio
    const diversificationRatio = this.calculateDiversificationRatio(matrix)

    this.correlationMatrix = {
      pairs: pairIds,
      matrix,
      eigenvalues,
      diversificationRatio,
      lastUpdate: new Date(),
    }
  }

  /**
   * Calculate eigenvalues (simplified implementation)
   */
  private calculateEigenvalues(matrix: number[][]): number[] {
    // Simplified eigenvalue calculation
    // In practice, you'd use a proper linear algebra library
    const n = matrix.length
    const eigenvalues: number[] = []

    // Calculate trace (sum of diagonal elements)
    let trace = 0
    for (let i = 0; i < n; i++) {
      trace += matrix[i][i]
    }

    // For a correlation matrix, eigenvalues sum to the trace
    // This is a very simplified approximation
    eigenvalues.push(trace / n)

    return eigenvalues
  }

  /**
   * Calculate diversification ratio
   */
  private calculateDiversificationRatio(correlationMatrix: number[][]): number {
    const n = correlationMatrix.length

    if (n <= 1) return 1.0

    // Calculate average correlation
    let sumCorrelations = 0
    let count = 0

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        sumCorrelations += Math.abs(correlationMatrix[i][j])
        count++
      }
    }

    const avgCorrelation = count > 0 ? sumCorrelations / count : 0

    // Diversification ratio = 1 / (1 + (n-1) * avg_correlation)
    return 1 / (1 + (n - 1) * avgCorrelation)
  }

  /**
   * Optimize portfolio allocation
   */
  async optimizeAllocation(
    totalCapital: number,
    riskTolerance: number,
    expectedReturns: { [pairId: string]: number },
    volatilities: { [pairId: string]: number },
  ): Promise<Map<string, PortfolioAllocation>> {
    const activePairs = Array.from(this.pairs.values()).filter((pair) => pair.isActive)

    if (activePairs.length === 0) {
      return new Map()
    }

    // Simple mean-variance optimization
    const allocations = new Map<string, PortfolioAllocation>()

    // Equal weight as baseline
    const equalWeight = 1.0 / activePairs.length

    for (const pair of activePairs) {
      const expectedReturn = expectedReturns[pair.id] || 0.1
      const volatility = volatilities[pair.id] || pair.volatility

      // Risk-adjusted allocation
      const riskAdjustedReturn = expectedReturn / volatility
      const qualityScore = this.calculateQualityScore(pair)

      // Combine risk-adjusted return with quality score
      const allocationScore = riskAdjustedReturn * 0.7 + qualityScore * 0.3

      // Calculate allocation (with risk tolerance adjustment)
      let allocation = equalWeight * (1 + allocationScore * riskTolerance)

      // Apply constraints
      allocation = Math.max(0.05, Math.min(0.4, allocation)) // 5% min, 40% max

      const portfolioAllocation: PortfolioAllocation = {
        pairId: pair.id,
        allocation,
        maxAllocation: 0.4,
        currentExposure: 0,
        riskScore: volatility,
        expectedReturn,
        volatility,
      }

      allocations.set(pair.id, portfolioAllocation)
    }

    // Normalize allocations to sum to 1
    const totalAllocation = Array.from(allocations.values()).reduce((sum, alloc) => sum + alloc.allocation, 0)

    if (totalAllocation > 0) {
      for (const allocation of allocations.values()) {
        allocation.allocation /= totalAllocation
      }
    }

    this.portfolioAllocations = allocations
    return allocations
  }

  /**
   * Add pair to active trading
   */
  activatePair(pairId: string): boolean {
    const pair = this.pairs.get(pairId)
    if (pair) {
      pair.isActive = true
      return true
    }
    return false
  }

  /**
   * Remove pair from active trading
   */
  deactivatePair(pairId: string): boolean {
    const pair = this.pairs.get(pairId)
    if (pair) {
      pair.isActive = false
      return true
    }
    return false
  }

  /**
   * Update pair performance
   */
  updatePairPerformance(
    pairId: string,
    performance: {
      totalReturn: number
      sharpeRatio: number
      maxDrawdown: number
      winRate: number
      totalTrades: number
    },
  ): void {
    const pair = this.pairs.get(pairId)
    if (pair) {
      pair.performance = performance
      pair.lastUpdate = new Date()
    }
  }

  /**
   * Get active pairs
   */
  getActivePairs(): TradingPair[] {
    return Array.from(this.pairs.values()).filter((pair) => pair.isActive)
  }

  /**
   * Get correlation matrix
   */
  getCorrelationMatrix(): CorrelationMatrix | undefined {
    return this.correlationMatrix
  }

  /**
   * Get portfolio allocations
   */
  getPortfolioAllocations(): Map<string, PortfolioAllocation> {
    return this.portfolioAllocations
  }

  /**
   * Rebalance pairs based on performance
   */
  async rebalancePairs(performanceData: { [pairId: string]: any }): Promise<{
    toActivate: string[]
    toDeactivate: string[]
    allocationChanges: Map<string, number>
  }> {
    const toActivate: string[] = []
    const toDeactivate: string[] = []
    const allocationChanges = new Map<string, number>()

    // Evaluate all pairs
    for (const [pairId, pair] of this.pairs.entries()) {
      const performance = performanceData[pairId]

      if (performance) {
        // Update performance
        this.updatePairPerformance(pairId, performance)

        // Check if pair should be activated/deactivated
        const qualityScore = this.calculateQualityScore(pair)

        if (!pair.isActive && qualityScore > 0.6) {
          toActivate.push(pairId)
        } else if (pair.isActive && qualityScore < 0.3) {
          toDeactivate.push(pairId)
        }
      }
    }

    // Limit active pairs
    const currentActivePairs = this.getActivePairs().length
    const maxNewActivations = Math.max(0, this.selectionCriteria.maxPairs - currentActivePairs)

    // Sort by quality and limit activations
    toActivate.sort((a, b) => {
      const pairA = this.pairs.get(a)!
      const pairB = this.pairs.get(b)!
      return this.calculateQualityScore(pairB) - this.calculateQualityScore(pairA)
    })

    const finalActivations = toActivate.slice(0, maxNewActivations)

    // Apply changes
    for (const pairId of finalActivations) {
      this.activatePair(pairId)
    }

    for (const pairId of toDeactivate) {
      this.deactivatePair(pairId)
    }

    return {
      toActivate: finalActivations,
      toDeactivate,
      allocationChanges,
    }
  }

  /**
   * Get pair statistics
   */
  getPairStatistics(): {
    totalPairs: number
    activePairs: number
    avgCorrelation: number
    avgVolatility: number
    diversificationRatio: number
  } {
    const allPairs = Array.from(this.pairs.values())
    const activePairs = allPairs.filter((pair) => pair.isActive)

    const avgCorrelation =
      allPairs.length > 0 ? allPairs.reduce((sum, pair) => sum + Math.abs(pair.correlation), 0) / allPairs.length : 0

    const avgVolatility =
      allPairs.length > 0 ? allPairs.reduce((sum, pair) => sum + pair.volatility, 0) / allPairs.length : 0

    return {
      totalPairs: allPairs.length,
      activePairs: activePairs.length,
      avgCorrelation,
      avgVolatility,
      diversificationRatio: this.correlationMatrix?.diversificationRatio || 1.0,
    }
  }
}
