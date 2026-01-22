import { Logger } from "../utils/logger"
import type { TradingSignal, RegimeState, StrategyParameters } from "./types"

/**
 * Signal generation engine for regime-adaptive pairs trading
 */
export class SignalGenerator {
  private parameters: StrategyParameters

  constructor(parameters: StrategyParameters) {
    this.parameters = parameters
  }

  /**
   * Generate trading signal based on current market conditions
   */
  generateSignal(
    zscore: number,
    regime: RegimeState,
    correlation: number,
    volatility: number,
    timestamp: Date,
    previousSignal?: TradingSignal,
  ): TradingSignal {
    try {
      // Get regime-specific thresholds
      const thresholds = this.getRegimeThresholds(regime.current)

      // Calculate signal strength
      const strength = this.calculateSignalStrength(zscore, correlation, volatility, regime)

      // Determine signal type and direction
      const { type, direction } = this.determineSignalTypeAndDirection(
        zscore,
        thresholds,
        regime.current,
        previousSignal,
      )

      // Calculate confidence
      const confidence = this.calculateSignalConfidence(zscore, correlation, regime, strength)

      return {
        type,
        direction,
        strength,
        regime: regime.current,
        zscore,
        confidence,
        timestamp,
        entryThreshold: thresholds.entry,
        exitThreshold: thresholds.exit,
      }
    } catch (error) {
      console.error("Error generating signal:", error)
      return this.createNeutralSignal(timestamp)
    }
  }

  /**
   * Get regime-specific trading thresholds
   */
  private getRegimeThresholds(regime: string): { entry: number; exit: number; stopLoss: number } {
    switch (regime) {
      case "high-correlation":
        return {
          entry: this.parameters.zscoreEntryThreshold,
          exit: this.parameters.zscoreExitThreshold,
          stopLoss: this.parameters.stopLossZscore,
        }

      case "low-correlation":
        return {
          entry: this.parameters.zscoreEntryThreshold * 0.8, // More sensitive for momentum
          exit: this.parameters.zscoreExitThreshold * 1.5, // Wider exits for momentum
          stopLoss: this.parameters.stopLossZscore * 0.8, // Tighter stops for momentum
        }

      case "transition":
        return {
          entry: this.parameters.zscoreEntryThreshold * 1.5, // Less sensitive during uncertainty
          exit: this.parameters.zscoreExitThreshold,
          stopLoss: this.parameters.stopLossZscore * 0.6, // Tighter stops during uncertainty
        }

      default:
        return {
          entry: this.parameters.zscoreEntryThreshold,
          exit: this.parameters.zscoreExitThreshold,
          stopLoss: this.parameters.stopLossZscore,
        }
    }
  }

  /**
   * Determine signal type and direction
   */
  private determineSignalTypeAndDirection(
    zscore: number,
    thresholds: { entry: number; exit: number; stopLoss: number },
    regime: string,
    previousSignal?: TradingSignal,
  ): { type: "entry" | "exit" | "hold"; direction: "long_btc_short_xrp" | "short_btc_long_xrp" | "neutral" } {
    // Check for stop loss first
    if (previousSignal && previousSignal.type === "entry" && Math.abs(zscore) > thresholds.stopLoss) {
      return { type: "exit", direction: "neutral" }
    }

    // Check for exit conditions
    if (previousSignal && previousSignal.type === "entry" && Math.abs(zscore) < thresholds.exit) {
      return { type: "exit", direction: "neutral" }
    }

    // Check for entry conditions
    if (Math.abs(zscore) > thresholds.entry) {
      if (regime === "high-correlation") {
        // Mean reversion strategy
        return {
          type: "entry",
          direction: zscore > 0 ? "short_btc_long_xrp" : "long_btc_short_xrp",
        }
      } else if (regime === "low-correlation") {
        // Momentum strategy
        return {
          type: "entry",
          direction: zscore > 0 ? "long_btc_short_xrp" : "short_btc_long_xrp",
        }
      }
    }

    return { type: "hold", direction: "neutral" }
  }

  /**
   * Calculate signal strength (0-1 scale)
   */
  private calculateSignalStrength(
    zscore: number,
    correlation: number,
    volatility: number,
    regime: RegimeState,
  ): number {
    let strength = 0

    // Z-score magnitude component (40% weight)
    const zscoreStrength = Math.min(Math.abs(zscore) / 4.0, 1.0)
    strength += zscoreStrength * 0.4

    // Regime confidence component (30% weight)
    strength += regime.confidence * 0.3

    // Correlation strength component (20% weight)
    const correlationStrength =
      regime.current === "high-correlation" ? Math.abs(correlation) : 1 - Math.abs(correlation)
    strength += correlationStrength * 0.2

    // Volatility component (10% weight)
    // Higher volatility can increase signal strength for momentum, decrease for mean reversion
    const volAdjustment = regime.current === "low-correlation" ? volatility : 1 - volatility
    strength += Math.max(0, Math.min(1, volAdjustment)) * 0.1

    return Math.max(0, Math.min(1, strength))
  }

  /**
   * Calculate signal confidence
   */
  private calculateSignalConfidence(
    zscore: number,
    correlation: number,
    regime: RegimeState,
    strength: number,
  ): number {
    let confidence = 0

    // Statistical significance (40% weight)
    if (Math.abs(zscore) > 3.0) confidence += 0.4
    else if (Math.abs(zscore) > 2.5) confidence += 0.3
    else if (Math.abs(zscore) > 2.0) confidence += 0.2

    // Regime confidence (30% weight)
    confidence += regime.confidence * 0.3

    // Signal strength (20% weight)
    confidence += strength * 0.2

    // Correlation quality (10% weight)
    if (regime.current === "high-correlation" && Math.abs(correlation) > 0.7) {
      confidence += 0.1
    } else if (regime.current === "low-correlation" && Math.abs(correlation) < 0.3) {
      confidence += 0.1
    }

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Create neutral signal
   */
  private createNeutralSignal(timestamp: Date): TradingSignal {
    return {
      type: "hold",
      direction: "neutral",
      strength: 0,
      regime: "transition",
      zscore: 0,
      confidence: 0,
      timestamp,
      entryThreshold: this.parameters.zscoreEntryThreshold,
      exitThreshold: this.parameters.zscoreExitThreshold,
    }
  }

  /**
   * Filter signals based on additional criteria
   */
  filterSignal(signal: TradingSignal, additionalCriteria: { minConfidence?: number; minStrength?: number }): boolean {
    const { minConfidence = 0.5, minStrength = 0.3 } = additionalCriteria

    // Don't filter hold signals
    if (signal.type === "hold") return true

    // Filter based on confidence and strength
    if (signal.confidence < minConfidence || signal.strength < minStrength) {
      return false
    }

    // Additional regime-specific filters
    if (signal.regime === "transition" && signal.confidence < 0.7) {
      return false
    }

    return true
  }

  /**
   * Generate signal with momentum confirmation
   */
  generateSignalWithMomentum(
    zscore: number,
    zscoreMomentum: number,
    regime: RegimeState,
    correlation: number,
    volatility: number,
    timestamp: Date,
    previousSignal?: TradingSignal,
  ): TradingSignal {
    const baseSignal = this.generateSignal(zscore, regime, correlation, volatility, timestamp, previousSignal)

    // Adjust signal based on momentum
    if (baseSignal.type === "entry") {
      // For mean reversion, we want momentum to be against the z-score
      // For momentum trading, we want momentum to be with the z-score
      const momentumAlignment =
        regime.current === "high-correlation"
          ? (zscore > 0 && zscoreMomentum < 0) || (zscore < 0 && zscoreMomentum > 0)
          : (zscore > 0 && zscoreMomentum > 0) || (zscore < 0 && zscoreMomentum < 0)

      if (momentumAlignment) {
        baseSignal.strength = Math.min(1.0, baseSignal.strength * 1.2)
        baseSignal.confidence = Math.min(1.0, baseSignal.confidence * 1.1)
      } else {
        baseSignal.strength *= 0.8
        baseSignal.confidence *= 0.9
      }
    }

    return baseSignal
  }

  /**
   * Update strategy parameters
   */
  updateParameters(newParameters: Partial<StrategyParameters>): void {
    this.parameters = { ...this.parameters, ...newParameters }
  }

  /**
   * Get current parameters
   */
  getParameters(): StrategyParameters {
    return { ...this.parameters }
  }
}
