import type { PositionSize, TradingSignal, Portfolio, RiskParameters, StrategyParameters } from "./types"
import { MathHelpers } from "../utils/math-helpers"

/**
 * Position sizing calculator using Kelly Criterion and risk management
 */
export class PositionSizer {
  private riskParams: RiskParameters
  private strategyParams: StrategyParameters

  constructor(riskParams: RiskParameters, strategyParams: StrategyParameters) {
    this.riskParams = riskParams
    this.strategyParams = strategyParams
  }

  /**
   * Calculate optimal position size
   */
  calculateOptimalSize(signal: TradingSignal, portfolio: Portfolio, historicalPerformance?: any): PositionSize {
    try {
      // Base position size calculation
      const baseSize = this.calculateBasePositionSize(signal, portfolio)

      // Kelly Criterion adjustment
      const kellyFraction = this.calculateKellyFraction(signal, historicalPerformance)

      // Regime-based scaling
      const regimeMultiplier = this.getRegimeMultiplier(signal.regime)

      // Signal strength scaling
      const strengthMultiplier = this.getStrengthMultiplier(signal.strength, signal.confidence)

      // Risk adjustment
      const riskMultiplier = this.calculateRiskMultiplier(portfolio)

      // Calculate final position size
      const adjustedSize = baseSize * kellyFraction * regimeMultiplier * strengthMultiplier * riskMultiplier

      // Apply position limits
      const finalSize = this.applyPositionLimits(adjustedSize, portfolio)

      // Determine leverage
      const leverage = this.calculateLeverage(signal.regime, signal.strength)

      // Calculate amounts
      const { btcAmount, xrpAmount } = this.calculateAssetAmounts(finalSize, signal, leverage)

      return {
        btcAmount,
        xrpAmount,
        leverage,
        capitalAllocated: finalSize,
        riskPercentage: (finalSize / portfolio.totalCapital) * 100,
        expectedReturn: this.estimateExpectedReturn(signal, historicalPerformance),
        kellyFraction,
      }
    } catch (error) {
      console.error("Error calculating position size:", error)
      return this.createMinimalPosition(signal)
    }
  }

  /**
   * Calculate base position size as percentage of capital
   */
  private calculateBasePositionSize(signal: TradingSignal, portfolio: Portfolio): number {
    const baseAllocation = this.strategyParams.basePositionSize
    return portfolio.totalCapital * baseAllocation
  }

  /**
   * Calculate Kelly Criterion optimal fraction
   */
  private calculateKellyFraction(signal: TradingSignal, historicalPerformance?: any): number {
    if (!historicalPerformance) {
      // Default conservative Kelly fraction
      return this.strategyParams.kellyMultiplier || 0.5
    }

    try {
      const { winRate, avgWin, avgLoss } = this.getRegimePerformance(signal.regime, historicalPerformance)

      if (avgLoss === 0 || winRate === 0) return 0.25

      const kellyFraction = MathHelpers.kellyOptimalFraction(winRate, avgWin, Math.abs(avgLoss))

      // Apply Kelly multiplier for safety
      const adjustedKelly = kellyFraction * (this.strategyParams.kellyMultiplier || 0.5)

      // Cap Kelly fraction to prevent over-leveraging
      return Math.max(0.1, Math.min(1.0, adjustedKelly))
    } catch (error) {
      console.warn("Error calculating Kelly fraction:", error)
      return 0.25
    }
  }

  /**
   * Get regime-specific performance metrics
   */
  private getRegimePerformance(
    regime: string,
    historicalPerformance: any,
  ): { winRate: number; avgWin: number; avgLoss: number } {
    const regimePerf = historicalPerformance[regime] || {
      winRate: 0.6,
      avgWin: 0.02,
      avgLoss: -0.015,
    }

    return {
      winRate: regimePerf.winRate || 0.6,
      avgWin: regimePerf.avgWin || 0.02,
      avgLoss: regimePerf.avgLoss || -0.015,
    }
  }

  /**
   * Get regime-specific position multiplier
   */
  private getRegimeMultiplier(regime: string): number {
    switch (regime) {
      case "high-correlation":
        return 1.0 // Standard size for mean reversion
      case "low-correlation":
        return 1.2 // Slightly larger for momentum (higher expected returns)
      case "transition":
        return 0.5 // Smaller size during uncertainty
      default:
        return 0.8
    }
  }

  /**
   * Get signal strength multiplier
   */
  private getStrengthMultiplier(strength: number, confidence: number): number {
    // Combine strength and confidence
    const combinedScore = strength * 0.6 + confidence * 0.4

    // Scale between 0.5 and 1.5
    return 0.5 + combinedScore
  }

  /**
   * Calculate risk multiplier based on portfolio state
   */
  private calculateRiskMultiplier(portfolio: Portfolio): number {
    let multiplier = 1.0

    // Reduce size if approaching maximum drawdown
    if (portfolio.returns.length > 0) {
      const currentDrawdown = this.calculateCurrentDrawdown(portfolio.equity)
      const maxAllowedDrawdown = this.riskParams.maxDrawdown

      if (currentDrawdown > maxAllowedDrawdown * 0.5) {
        multiplier *= 0.5 // Reduce position size significantly
      } else if (currentDrawdown > maxAllowedDrawdown * 0.3) {
        multiplier *= 0.75 // Moderate reduction
      }
    }

    // Reduce size if too much capital is already allocated
    const currentAllocation = this.calculateCurrentAllocation(portfolio)
    if (currentAllocation > 0.8) {
      multiplier *= 0.3
    } else if (currentAllocation > 0.6) {
      multiplier *= 0.6
    }

    return Math.max(0.1, multiplier)
  }

  /**
   * Calculate current drawdown
   */
  private calculateCurrentDrawdown(equity: number[]): number {
    if (equity.length === 0) return 0

    const peak = Math.max(...equity)
    const current = equity[equity.length - 1]
    return ((peak - current) / peak) * 100
  }

  /**
   * Calculate current capital allocation
   */
  private calculateCurrentAllocation(portfolio: Portfolio): number {
    const allocatedCapital = portfolio.positions
      .filter((pos) => pos.status === "open")
      .reduce((sum, pos) => sum + Math.abs(pos.btcAmount) + Math.abs(pos.xrpAmount), 0)

    return allocatedCapital / portfolio.totalCapital
  }

  /**
   * Apply position limits
   */
  private applyPositionLimits(size: number, portfolio: Portfolio): number {
    const maxPositionSize = portfolio.totalCapital * this.riskParams.maxPositionSize
    const availableCapital = portfolio.availableCapital

    return Math.min(size, maxPositionSize, availableCapital * 0.9)
  }

  /**
   * Calculate leverage based on regime and signal strength
   */
  private calculateLeverage(regime: string, strength: number): number {
    let baseLeverage: number

    switch (regime) {
      case "high-correlation":
        baseLeverage = this.strategyParams.meanReversionLeverage
        break
      case "low-correlation":
        baseLeverage = this.strategyParams.momentumLeverage
        break
      case "transition":
        baseLeverage = this.strategyParams.transitionLeverage
        break
      default:
        baseLeverage = 1.0
    }

    // Adjust leverage based on signal strength
    const strengthAdjustment = 0.5 + strength * 0.5 // Scale between 0.5 and 1.0
    const adjustedLeverage = baseLeverage * strengthAdjustment

    // Apply maximum leverage limit
    return Math.min(adjustedLeverage, this.riskParams.maxLeverage)
  }

  /**
   * Calculate asset amounts based on position size and signal
   */
  private calculateAssetAmounts(
    positionSize: number,
    signal: TradingSignal,
    leverage: number,
  ): { btcAmount: number; xrpAmount: number } {
    const totalExposure = positionSize * leverage

    if (signal.direction === "long_btc_short_xrp") {
      return {
        btcAmount: totalExposure * 0.5, // Long BTC
        xrpAmount: -totalExposure * 0.5, // Short XRP
      }
    } else if (signal.direction === "short_btc_long_xrp") {
      return {
        btcAmount: -totalExposure * 0.5, // Short BTC
        xrpAmount: totalExposure * 0.5, // Long XRP
      }
    } else {
      return {
        btcAmount: 0,
        xrpAmount: 0,
      }
    }
  }

  /**
   * Estimate expected return based on signal and historical performance
   */
  private estimateExpectedReturn(signal: TradingSignal, historicalPerformance?: any): number {
    if (!historicalPerformance) {
      // Default expected returns by regime
      const defaultReturns = {
        "high-correlation": 0.015,
        "low-correlation": 0.025,
        transition: 0.005,
      }
      return defaultReturns[signal.regime] || 0.01
    }

    const regimePerf = historicalPerformance[signal.regime]
    if (!regimePerf) return 0.01

    // Weight expected return by signal strength and confidence
    const baseReturn = regimePerf.avgReturn || 0.01
    const adjustmentFactor = signal.strength * 0.6 + signal.confidence * 0.4

    return baseReturn * adjustmentFactor
  }

  /**
   * Create minimal position for error cases
   */
  private createMinimalPosition(signal: TradingSignal): PositionSize {
    return {
      btcAmount: 0,
      xrpAmount: 0,
      leverage: 1.0,
      capitalAllocated: 0,
      riskPercentage: 0,
      expectedReturn: 0,
      kellyFraction: 0,
    }
  }

  /**
   * Update risk parameters
   */
  updateRiskParameters(newParams: Partial<RiskParameters>): void {
    this.riskParams = { ...this.riskParams, ...newParams }
  }

  /**
   * Update strategy parameters
   */
  updateStrategyParameters(newParams: Partial<StrategyParameters>): void {
    this.strategyParams = { ...this.strategyParams, ...newParams }
  }

  /**
   * Calculate position size for portfolio rebalancing
   */
  calculateRebalanceSize(
    currentPositions: any[],
    targetAllocation: number,
    portfolio: Portfolio,
  ): { btcAdjustment: number; xrpAdjustment: number } {
    const currentBtcExposure = currentPositions.reduce((sum, pos) => sum + pos.btcAmount, 0)
    const currentXrpExposure = currentPositions.reduce((sum, pos) => sum + pos.xrpAmount, 0)

    const targetExposure = portfolio.totalCapital * targetAllocation
    const currentTotalExposure = Math.abs(currentBtcExposure) + Math.abs(currentXrpExposure)

    const exposureDiff = targetExposure - currentTotalExposure

    return {
      btcAdjustment: exposureDiff * 0.5 * Math.sign(currentBtcExposure || 1),
      xrpAdjustment: exposureDiff * 0.5 * Math.sign(currentXrpExposure || 1),
    }
  }
}
