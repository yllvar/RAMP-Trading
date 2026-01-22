import { Logger } from "../utils/logger"
/**
 * Advanced Risk Management System
 * Enterprise-grade risk monitoring and control
 */

export interface RiskLimit {
  id: string
  name: string
  type: "portfolio" | "position" | "asset" | "strategy" | "counterparty"
  metric: "var" | "drawdown" | "exposure" | "concentration" | "leverage" | "correlation"
  threshold: number
  warningThreshold: number
  timeframe: "intraday" | "daily" | "weekly" | "monthly"
  action: "alert" | "reduce" | "close" | "halt"
  isActive: boolean
  lastTriggered?: Date
}

export interface RiskMetrics {
  timestamp: Date
  portfolioValue: number
  totalExposure: number
  netExposure: number
  grossExposure: number
  leverage: number

  // VaR metrics
  var95_1d: number
  var99_1d: number
  var95_10d: number
  expectedShortfall: number

  // Drawdown metrics
  currentDrawdown: number
  maxDrawdown: number
  drawdownDuration: number

  // Concentration metrics
  maxPositionWeight: number
  maxAssetWeight: number
  maxStrategyWeight: number

  // Correlation metrics
  avgCorrelation: number
  maxCorrelation: number
  diversificationRatio: number

  // Liquidity metrics
  liquidityScore: number
  timeToLiquidate: number // hours

  // Stress test results
  stressTestResults: { [scenario: string]: number }
}

export interface RiskAlert {
  id: string
  timestamp: Date
  severity: "low" | "medium" | "high" | "critical"
  type: "limit_breach" | "unusual_activity" | "system_error" | "market_event"
  message: string
  affectedPositions: string[]
  recommendedActions: string[]
  isAcknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

export interface StressTestScenario {
  id: string
  name: string
  description: string
  shocks: {
    asset: string
    priceShock: number // percentage
    volatilityShock: number
    correlationShock: number
  }[]
  marketConditions: {
    liquidityShock: number
    spreadWidening: number
    volumeReduction: number
  }
}

/**
 * Advanced Risk Management System
 */
export class AdvancedRiskManager {
  private riskLimits: Map<string, RiskLimit> = new Map()
  private riskMetricsHistory: RiskMetrics[] = []
  private activeAlerts: Map<string, RiskAlert> = new Map()
  private stressTestScenarios: Map<string, StressTestScenario> = new Map()

  private monitoringInterval?: NodeJS.Timeout
  private isMonitoring = false

  constructor() {
    this.initializeDefaultLimits()
    this.initializeStressTestScenarios()
  }

  /**
   * Initialize default risk limits
   */
  private initializeDefaultLimits(): void {
    const defaultLimits: RiskLimit[] = [
      {
        id: "portfolio_var_95",
        name: "Portfolio VaR 95%",
        type: "portfolio",
        metric: "var",
        threshold: 5.0, // 5% daily VaR
        warningThreshold: 3.0,
        timeframe: "daily",
        action: "alert",
        isActive: true,
      },
      {
        id: "max_drawdown",
        name: "Maximum Drawdown",
        type: "portfolio",
        metric: "drawdown",
        threshold: 15.0, // 15% max drawdown
        warningThreshold: 10.0,
        timeframe: "daily",
        action: "reduce",
        isActive: true,
      },
      {
        id: "max_leverage",
        name: "Maximum Leverage",
        type: "portfolio",
        metric: "leverage",
        threshold: 5.0, // 5x max leverage
        warningThreshold: 4.0,
        timeframe: "intraday",
        action: "halt",
        isActive: true,
      },
      {
        id: "max_position_concentration",
        name: "Maximum Position Concentration",
        type: "position",
        metric: "concentration",
        threshold: 25.0, // 25% max position size
        warningThreshold: 20.0,
        timeframe: "intraday",
        action: "reduce",
        isActive: true,
      },
      {
        id: "max_correlation",
        name: "Maximum Portfolio Correlation",
        type: "portfolio",
        metric: "correlation",
        threshold: 0.8, // 80% max correlation
        warningThreshold: 0.7,
        timeframe: "daily",
        action: "alert",
        isActive: true,
      },
    ]

    defaultLimits.forEach((limit) => {
      this.riskLimits.set(limit.id, limit)
    })
  }

  /**
   * Initialize stress test scenarios
   */
  private initializeStressTestScenarios(): void {
    const scenarios: StressTestScenario[] = [
      {
        id: "crypto_crash",
        name: "Crypto Market Crash",
        description: "Major cryptocurrency market crash scenario",
        shocks: [
          { asset: "BTC", priceShock: -50, volatilityShock: 2.0, correlationShock: 0.3 },
          { asset: "ETH", priceShock: -60, volatilityShock: 2.5, correlationShock: 0.3 },
          { asset: "XRP", priceShock: -70, volatilityShock: 3.0, correlationShock: 0.4 },
        ],
        marketConditions: {
          liquidityShock: -80, // 80% liquidity reduction
          spreadWidening: 5.0, // 5x spread widening
          volumeReduction: -70, // 70% volume reduction
        },
      },
      {
        id: "correlation_breakdown",
        name: "Correlation Breakdown",
        description: "Sudden breakdown in asset correlations",
        shocks: [
          { asset: "BTC", priceShock: -20, volatilityShock: 1.5, correlationShock: -0.8 },
          { asset: "XRP", priceShock: 15, volatilityShock: 1.8, correlationShock: -0.8 },
        ],
        marketConditions: {
          liquidityShock: -30,
          spreadWidening: 2.0,
          volumeReduction: -40,
        },
      },
      {
        id: "flash_crash",
        name: "Flash Crash",
        description: "Rapid market crash with quick recovery",
        shocks: [
          { asset: "BTC", priceShock: -30, volatilityShock: 5.0, correlationShock: 0.5 },
          { asset: "XRP", priceShock: -35, volatilityShock: 6.0, correlationShock: 0.5 },
        ],
        marketConditions: {
          liquidityShock: -90,
          spreadWidening: 10.0,
          volumeReduction: -85,
        },
      },
      {
        id: "regulatory_shock",
        name: "Regulatory Shock",
        description: "Major regulatory announcement impact",
        shocks: [
          { asset: "BTC", priceShock: -25, volatilityShock: 2.0, correlationShock: 0.2 },
          { asset: "ETH", priceShock: -30, volatilityShock: 2.2, correlationShock: 0.2 },
          { asset: "XRP", priceShock: -40, volatilityShock: 3.0, correlationShock: 0.3 },
        ],
        marketConditions: {
          liquidityShock: -50,
          spreadWidening: 3.0,
          volumeReduction: -60,
        },
      },
    ]

    scenarios.forEach((scenario) => {
      this.stressTestScenarios.set(scenario.id, scenario)
    })
  }

  /**
   * Start real-time risk monitoring
   */
  startMonitoring(intervalMs = 5000): void {
    if (this.isMonitoring) {
      Logger.info('Risk monitoring already active')
      return
    }

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.performRiskCheck()
    }, intervalMs)

    Logger.info('Risk monitoring started')
  }

  /**
   * Stop risk monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
    this.isMonitoring = false
    Logger.info('Risk monitoring stopped')
  }

  /**
   * Calculate comprehensive risk metrics
   */
  calculateRiskMetrics(portfolio: any, marketData: any, positions: any[]): RiskMetrics {
    const timestamp = new Date()

    // Basic portfolio metrics
    const portfolioValue = portfolio.totalValue || 0
    const totalExposure = this.calculateTotalExposure(positions)
    const netExposure = this.calculateNetExposure(positions)
    const grossExposure = this.calculateGrossExposure(positions)
    const leverage = portfolioValue > 0 ? grossExposure / portfolioValue : 0

    // VaR calculations
    const returns = portfolio.returns || []
    const var95_1d = this.calculateVaR(returns, 0.95, 1)
    const var99_1d = this.calculateVaR(returns, 0.99, 1)
    const var95_10d = this.calculateVaR(returns, 0.95, 10)
    const expectedShortfall = this.calculateExpectedShortfall(returns, 0.95)

    // Drawdown metrics
    const equityCurve = portfolio.equity || [portfolioValue]
    const drawdownMetrics = this.calculateDrawdownMetrics(equityCurve)

    // Concentration metrics
    const concentrationMetrics = this.calculateConcentrationMetrics(positions, portfolioValue)

    // Correlation metrics
    const correlationMetrics = this.calculateCorrelationMetrics(positions, marketData)

    // Liquidity metrics
    const liquidityMetrics = this.calculateLiquidityMetrics(positions, marketData)

    // Stress test results
    const stressTestResults = this.runAllStressTests(positions, marketData)

    const riskMetrics: RiskMetrics = {
      timestamp,
      portfolioValue,
      totalExposure,
      netExposure,
      grossExposure,
      leverage,
      var95_1d,
      var99_1d,
      var95_10d,
      expectedShortfall,
      currentDrawdown: drawdownMetrics.currentDrawdown,
      maxDrawdown: drawdownMetrics.maxDrawdown,
      drawdownDuration: drawdownMetrics.drawdownDuration,
      maxPositionWeight: concentrationMetrics.maxPositionWeight,
      maxAssetWeight: concentrationMetrics.maxAssetWeight,
      maxStrategyWeight: concentrationMetrics.maxStrategyWeight,
      avgCorrelation: correlationMetrics.avgCorrelation,
      maxCorrelation: correlationMetrics.maxCorrelation,
      diversificationRatio: correlationMetrics.diversificationRatio,
      liquidityScore: liquidityMetrics.liquidityScore,
      timeToLiquidate: liquidityMetrics.timeToLiquidate,
      stressTestResults,
    }

    // Store in history
    this.riskMetricsHistory.push(riskMetrics)

    // Limit history size
    if (this.riskMetricsHistory.length > 10000) {
      this.riskMetricsHistory = this.riskMetricsHistory.slice(-5000)
    }

    return riskMetrics
  }

  /**
   * Calculate Value at Risk
   */
  private calculateVaR(returns: number[], confidence: number, horizon: number): number {
    if (returns.length === 0) return 0

    // Sort returns in ascending order
    const sortedReturns = [...returns].sort((a, b) => a - b)

    // Find the percentile
    const index = Math.floor((1 - confidence) * sortedReturns.length)
    const var1d = -sortedReturns[index] * 100 // Convert to percentage

    // Scale for horizon (square root of time rule)
    return var1d * Math.sqrt(horizon)
  }

  /**
   * Calculate Expected Shortfall (Conditional VaR)
   */
  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0

    const sortedReturns = [...returns].sort((a, b) => a - b)
    const cutoffIndex = Math.floor((1 - confidence) * sortedReturns.length)

    // Average of returns below VaR threshold
    const tailReturns = sortedReturns.slice(0, cutoffIndex)
    const avgTailReturn = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length

    return -avgTailReturn * 100 // Convert to percentage
  }

  /**
   * Calculate drawdown metrics
   */
  private calculateDrawdownMetrics(equityCurve: number[]): {
    currentDrawdown: number
    maxDrawdown: number
    drawdownDuration: number
  } {
    if (equityCurve.length === 0) {
      return { currentDrawdown: 0, maxDrawdown: 0, drawdownDuration: 0 }
    }

    let peak = equityCurve[0]
    let maxDrawdown = 0
    let currentDrawdown = 0
    let drawdownDuration = 0
    let currentDrawdownDuration = 0

    for (let i = 1; i < equityCurve.length; i++) {
      const value = equityCurve[i]

      if (value > peak) {
        peak = value
        currentDrawdownDuration = 0
      } else {
        currentDrawdownDuration++
      }

      const drawdown = ((peak - value) / peak) * 100

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
        drawdownDuration = currentDrawdownDuration
      }

      if (i === equityCurve.length - 1) {
        currentDrawdown = drawdown
      }
    }

    return { currentDrawdown, maxDrawdown, drawdownDuration }
  }

  /**
   * Calculate concentration metrics
   */
  private calculateConcentrationMetrics(
    positions: any[],
    portfolioValue: number,
  ): {
    maxPositionWeight: number
    maxAssetWeight: number
    maxStrategyWeight: number
  } {
    if (positions.length === 0 || portfolioValue === 0) {
      return { maxPositionWeight: 0, maxAssetWeight: 0, maxStrategyWeight: 0 }
    }

    // Position concentration
    const positionWeights = positions.map((pos) => (Math.abs(pos.amount * pos.entryPrice) / portfolioValue) * 100)
    const maxPositionWeight = Math.max(...positionWeights, 0)

    // Asset concentration
    const assetExposures = new Map<string, number>()
    positions.forEach((pos) => {
      const asset = pos.symbol.split("/")[0] || pos.symbol
      const exposure = Math.abs(pos.amount * pos.entryPrice)
      assetExposures.set(asset, (assetExposures.get(asset) || 0) + exposure)
    })

    const maxAssetExposure = Math.max(...Array.from(assetExposures.values()), 0)
    const maxAssetWeight = (maxAssetExposure / portfolioValue) * 100

    // Strategy concentration (simplified - assume all positions are same strategy)
    const maxStrategyWeight = maxAssetWeight

    return { maxPositionWeight, maxAssetWeight, maxStrategyWeight }
  }

  /**
   * Calculate correlation metrics
   */
  private calculateCorrelationMetrics(
    positions: any[],
    marketData: any,
  ): {
    avgCorrelation: number
    maxCorrelation: number
    diversificationRatio: number
  } {
    // Simplified correlation calculation
    // In practice, you'd calculate correlations between all position pairs

    const avgCorrelation = marketData.correlation || 0
    const maxCorrelation = Math.abs(avgCorrelation)

    // Diversification ratio = 1 / (1 + (n-1) * avg_correlation)
    const n = positions.length
    const diversificationRatio = n > 1 ? 1 / (1 + (n - 1) * Math.abs(avgCorrelation)) : 1

    return { avgCorrelation, maxCorrelation, diversificationRatio }
  }

  /**
   * Calculate liquidity metrics
   */
  private calculateLiquidityMetrics(
    positions: any[],
    marketData: any,
  ): {
    liquidityScore: number
    timeToLiquidate: number
  } {
    // Simplified liquidity calculation
    // In practice, you'd analyze order book depth, trading volumes, etc.

    const avgVolume =
      Object.values(marketData.volume24h || {}).reduce((sum: number, vol: any) => sum + vol, 0) /
      Object.keys(marketData.volume24h || {}).length

    const liquidityScore = Math.min(100, avgVolume / 1000000) // Normalize to $1M daily volume
    const timeToLiquidate = Math.max(0.1, 24 / liquidityScore) // Hours to liquidate

    return { liquidityScore, timeToLiquidate }
  }

  /**
   * Calculate total exposure
   */
  private calculateTotalExposure(positions: any[]): number {
    return positions.reduce((total, pos) => {
      return total + Math.abs(pos.amount * pos.entryPrice)
    }, 0)
  }

  /**
   * Calculate net exposure
   */
  private calculateNetExposure(positions: any[]): number {
    return positions.reduce((total, pos) => {
      const exposure = pos.amount * pos.entryPrice
      return total + (pos.side === "long" ? exposure : -exposure)
    }, 0)
  }

  /**
   * Calculate gross exposure
   */
  private calculateGrossExposure(positions: any[]): number {
    return this.calculateTotalExposure(positions)
  }

  /**
   * Run all stress tests
   */
  private runAllStressTests(positions: any[], marketData: any): { [scenario: string]: number } {
    const results: { [scenario: string]: number } = {}

    for (const [scenarioId, scenario] of this.stressTestScenarios.entries()) {
      results[scenarioId] = this.runStressTest(scenario, positions, marketData)
    }

    return results
  }

  /**
   * Run individual stress test
   */
  private runStressTest(scenario: StressTestScenario, positions: any[], marketData: any): number {
    let totalPnL = 0

    for (const position of positions) {
      const asset = position.symbol.split("/")[0] || position.symbol
      const shock = scenario.shocks.find((s) => s.asset === asset)

      if (shock) {
        const currentPrice = position.entryPrice
        const shockedPrice = currentPrice * (1 + shock.priceShock / 100)
        const positionPnL = position.amount * (shockedPrice - currentPrice)

        // Apply liquidity adjustment
        const liquidityAdjustment = scenario.marketConditions.liquidityShock / 100
        const adjustedPnL = positionPnL * (1 + liquidityAdjustment)

        totalPnL += adjustedPnL
      }
    }

    return totalPnL
  }

  /**
   * Perform comprehensive risk check
   */
  private performRiskCheck(): void {
    // This would be called with real portfolio and market data
    // For now, we'll simulate the check
    Logger.info('Performing risk check...')

    // In practice, you'd get current portfolio and market data here
    // const portfolio = getCurrentPortfolio()
    // const marketData = getCurrentMarketData()
    // const positions = getCurrentPositions()

    // const riskMetrics = this.calculateRiskMetrics(portfolio, marketData, positions)
    // this.checkRiskLimits(riskMetrics)
  }

  /**
   * Check risk limits against current metrics
   */
  checkRiskLimits(riskMetrics: RiskMetrics): RiskAlert[] {
    const alerts: RiskAlert[] = []

    for (const [limitId, limit] of this.riskLimits.entries()) {
      if (!limit.isActive) continue

      const currentValue = this.getRiskMetricValue(riskMetrics, limit.metric)
      const isBreached = currentValue > limit.threshold
      const isWarning = currentValue > limit.warningThreshold

      if (isBreached || isWarning) {
        const alert: RiskAlert = {
          id: `${limitId}_${Date.now()}`,
          timestamp: new Date(),
          severity: isBreached ? "high" : "medium",
          type: "limit_breach",
          message: `${limit.name} ${isBreached ? "breached" : "warning"}: ${currentValue.toFixed(2)} > ${isBreached ? limit.threshold : limit.warningThreshold}`,
          affectedPositions: [], // Would be populated with actual affected positions
          recommendedActions: this.getRecommendedActions(limit, currentValue),
          isAcknowledged: false,
        }

        alerts.push(alert)
        this.activeAlerts.set(alert.id, alert)

        // Update last triggered time
        limit.lastTriggered = new Date()
      }
    }

    return alerts
  }

  /**
   * Get risk metric value by type
   */
  private getRiskMetricValue(metrics: RiskMetrics, metricType: string): number {
    switch (metricType) {
      case "var":
        return metrics.var95_1d
      case "drawdown":
        return metrics.currentDrawdown
      case "leverage":
        return metrics.leverage
      case "concentration":
        return metrics.maxPositionWeight
      case "correlation":
        return metrics.maxCorrelation
      case "exposure":
        return metrics.totalExposure
      default:
        return 0
    }
  }

  /**
   * Get recommended actions for limit breach
   */
  private getRecommendedActions(limit: RiskLimit, currentValue: number): string[] {
    const actions: string[] = []

    switch (limit.action) {
      case "alert":
        actions.push("Monitor closely")
        actions.push("Review position sizing")
        break
      case "reduce":
        actions.push("Reduce position sizes")
        actions.push("Close most risky positions")
        break
      case "close":
        actions.push("Close all positions")
        actions.push("Move to cash")
        break
      case "halt":
        actions.push("Halt all trading")
        actions.push("Emergency risk review")
        break
    }

    return actions
  }

  /**
   * Add custom risk limit
   */
  addRiskLimit(limit: RiskLimit): void {
    this.riskLimits.set(limit.id, limit)
  }

  /**
   * Update risk limit
   */
  updateRiskLimit(limitId: string, updates: Partial<RiskLimit>): boolean {
    const limit = this.riskLimits.get(limitId)
    if (!limit) return false

    Object.assign(limit, updates)
    return true
  }

  /**
   * Remove risk limit
   */
  removeRiskLimit(limitId: string): boolean {
    return this.riskLimits.delete(limitId)
  }

  /**
   * Get all risk limits
   */
  getRiskLimits(): RiskLimit[] {
    return Array.from(this.riskLimits.values())
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): RiskAlert[] {
    return Array.from(this.activeAlerts.values()).filter((alert) => !alert.isAcknowledged)
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (!alert) return false

    alert.isAcknowledged = true
    alert.acknowledgedBy = acknowledgedBy
    alert.acknowledgedAt = new Date()

    return true
  }

  /**
   * Get risk metrics history
   */
  getRiskMetricsHistory(lookbackDays = 30): RiskMetrics[] {
    const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    return this.riskMetricsHistory.filter((metrics) => metrics.timestamp >= cutoffDate)
  }

  /**
   * Get stress test scenarios
   */
  getStressTestScenarios(): StressTestScenario[] {
    return Array.from(this.stressTestScenarios.values())
  }

  /**
   * Add custom stress test scenario
   */
  addStressTestScenario(scenario: StressTestScenario): void {
    this.stressTestScenarios.set(scenario.id, scenario)
  }

  /**
   * Generate risk report
   */
  generateRiskReport(
    portfolio: any,
    marketData: any,
    positions: any[],
  ): {
    summary: any
    metrics: RiskMetrics
    alerts: RiskAlert[]
    stressTests: { [scenario: string]: number }
    recommendations: string[]
  } {
    const metrics = this.calculateRiskMetrics(portfolio, marketData, positions)
    const alerts = this.checkRiskLimits(metrics)
    const stressTests = metrics.stressTestResults

    const summary = {
      riskLevel: this.assessOverallRiskLevel(metrics),
      keyRisks: this.identifyKeyRisks(metrics),
      riskScore: this.calculateRiskScore(metrics),
    }

    const recommendations = this.generateRecommendations(metrics, alerts)

    return {
      summary,
      metrics,
      alerts,
      stressTests,
      recommendations,
    }
  }

  /**
   * Assess overall risk level
   */
  private assessOverallRiskLevel(metrics: RiskMetrics): "low" | "medium" | "high" | "critical" {
    let riskScore = 0

    // VaR contribution
    if (metrics.var95_1d > 5) riskScore += 3
    else if (metrics.var95_1d > 3) riskScore += 2
    else if (metrics.var95_1d > 1) riskScore += 1

    // Drawdown contribution
    if (metrics.currentDrawdown > 15) riskScore += 3
    else if (metrics.currentDrawdown > 10) riskScore += 2
    else if (metrics.currentDrawdown > 5) riskScore += 1

    // Leverage contribution
    if (metrics.leverage > 5) riskScore += 3
    else if (metrics.leverage > 3) riskScore += 2
    else if (metrics.leverage > 2) riskScore += 1

    // Concentration contribution
    if (metrics.maxPositionWeight > 50) riskScore += 3
    else if (metrics.maxPositionWeight > 30) riskScore += 2
    else if (metrics.maxPositionWeight > 20) riskScore += 1

    if (riskScore >= 8) return "critical"
    if (riskScore >= 5) return "high"
    if (riskScore >= 2) return "medium"
    return "low"
  }

  /**
   * Identify key risks
   */
  private identifyKeyRisks(metrics: RiskMetrics): string[] {
    const risks: string[] = []

    if (metrics.var95_1d > 3) risks.push("High Value at Risk")
    if (metrics.currentDrawdown > 10) risks.push("Significant Drawdown")
    if (metrics.leverage > 3) risks.push("High Leverage")
    if (metrics.maxPositionWeight > 25) risks.push("Position Concentration")
    if (metrics.maxCorrelation > 0.8) risks.push("High Correlation")
    if (metrics.liquidityScore < 50) risks.push("Low Liquidity")

    return risks
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(metrics: RiskMetrics): number {
    // Weighted risk score (0-100)
    let score = 0

    score += Math.min(30, metrics.var95_1d * 6) // VaR component (max 30)
    score += Math.min(25, metrics.currentDrawdown * 1.67) // Drawdown component (max 25)
    score += Math.min(20, metrics.leverage * 4) // Leverage component (max 20)
    score += Math.min(15, metrics.maxPositionWeight * 0.6) // Concentration component (max 15)
    score += Math.min(10, metrics.maxCorrelation * 12.5) // Correlation component (max 10)

    return Math.min(100, score)
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(metrics: RiskMetrics, alerts: RiskAlert[]): string[] {
    const recommendations: string[] = []

    if (metrics.var95_1d > 3) {
      recommendations.push("Consider reducing position sizes to lower portfolio VaR")
    }

    if (metrics.currentDrawdown > 10) {
      recommendations.push("Review stop-loss levels and consider tightening risk controls")
    }

    if (metrics.leverage > 3) {
      recommendations.push("Reduce leverage to improve risk-adjusted returns")
    }

    if (metrics.maxPositionWeight > 25) {
      recommendations.push("Diversify portfolio to reduce concentration risk")
    }

    if (metrics.maxCorrelation > 0.8) {
      recommendations.push("Add uncorrelated assets to improve diversification")
    }

    if (metrics.liquidityScore < 50) {
      recommendations.push("Increase allocation to more liquid assets")
    }

    if (alerts.length > 0) {
      recommendations.push("Address active risk alerts immediately")
    }

    return recommendations
  }
}
