// Strategy Visualization and Performance Analysis - JavaScript Implementation
console.log("📊 STRATEGY VISUALIZATION & PERFORMANCE ANALYZER")
console.log("=".repeat(50))

// Mock data generators for visualization
class DataGenerator {
  static generateEquityCurve(initialCapital = 100000, days = 252, volatility = 0.15, trend = 0.12) {
    const curve = [initialCapital]
    let currentValue = initialCapital

    for (let i = 1; i <= days; i++) {
      // Generate daily return with trend and volatility
      const dailyReturn = trend / 252 + (Math.random() - 0.5) * volatility * Math.sqrt(1 / 252)
      currentValue *= 1 + dailyReturn
      curve.push(Math.round(currentValue))
    }

    return curve.map((value, index) => ({
      day: index,
      equity: value,
      return: ((value - initialCapital) / initialCapital) * 100,
    }))
  }

  static generateRegimeData(days = 252) {
    const regimes = ["high-correlation", "low-correlation", "transition"]
    const regimeData = []
    let currentRegime = regimes[0]
    let regimeDuration = 0

    for (let i = 0; i < days; i++) {
      // Change regime occasionally
      if (regimeDuration > 20 && Math.random() < 0.1) {
        currentRegime = regimes[Math.floor(Math.random() * regimes.length)]
        regimeDuration = 0
      }

      regimeData.push({
        day: i,
        regime: currentRegime,
        correlation: this.getRegimeCorrelation(currentRegime),
        volatility: this.getRegimeVolatility(currentRegime),
      })

      regimeDuration++
    }

    return regimeData
  }

  static getRegimeCorrelation(regime) {
    switch (regime) {
      case "high-correlation":
        return 0.7 + Math.random() * 0.25
      case "low-correlation":
        return Math.random() * 0.3
      case "transition":
        return 0.3 + Math.random() * 0.4
      default:
        return 0.5
    }
  }

  static getRegimeVolatility(regime) {
    switch (regime) {
      case "high-correlation":
        return 0.1 + Math.random() * 0.1
      case "low-correlation":
        return 0.15 + Math.random() * 0.15
      case "transition":
        return 0.2 + Math.random() * 0.1
      default:
        return 0.15
    }
  }

  static generateTradeData(numTrades = 100) {
    const strategies = ["mean_reversion", "momentum", "transition"]
    const regimes = ["high-correlation", "low-correlation", "transition"]
    const trades = []

    for (let i = 0; i < numTrades; i++) {
      const strategy = strategies[Math.floor(Math.random() * strategies.length)]
      const regime = regimes[Math.floor(Math.random() * regimes.length)]

      // Generate realistic P&L based on strategy and regime
      let pnl
      if (strategy === "mean_reversion" && regime === "high-correlation") {
        pnl = (Math.random() - 0.3) * 1000 // Slight positive bias
      } else if (strategy === "momentum" && regime === "low-correlation") {
        pnl = (Math.random() - 0.35) * 1500 // Slight positive bias, higher variance
      } else {
        pnl = (Math.random() - 0.5) * 800 // Neutral
      }

      trades.push({
        id: i + 1,
        strategy,
        regime,
        pnl: Math.round(pnl),
        pnlPercent: pnl / 10000, // Assuming $10k position size
        holdingPeriod: Math.floor(Math.random() * 20) + 1,
        entryDate: new Date(2024, 0, Math.floor(Math.random() * 365)),
      })
    }

    return trades
  }
}

// Performance metrics calculator
class PerformanceAnalyzer {
  static calculateMetrics(equityCurve, trades) {
    const returns = equityCurve.map((point) => point.return / 100)
    const finalReturn = returns[returns.length - 1]

    // Calculate Sharpe ratio (simplified)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const returnStdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
    const sharpeRatio = returnStdDev > 0 ? (avgReturn * 252) / (returnStdDev * Math.sqrt(252)) : 0

    // Calculate max drawdown
    let maxDrawdown = 0
    let peak = equityCurve[0].equity

    for (const point of equityCurve) {
      if (point.equity > peak) peak = point.equity
      const drawdown = ((peak - point.equity) / peak) * 100
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }

    // Trade metrics
    const winningTrades = trades.filter((t) => t.pnl > 0)
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0

    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
    const avgWin =
      winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0
    const losingTrades = trades.filter((t) => t.pnl <= 0)
    const avgLoss =
      losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : Number.POSITIVE_INFINITY

    return {
      totalReturn: finalReturn * 100,
      sharpeRatio,
      maxDrawdown,
      winRate,
      totalTrades: trades.length,
      profitFactor,
      avgWin,
      avgLoss,
      totalPnl,
    }
  }

  static analyzeByRegime(trades) {
    const regimes = ["high-correlation", "low-correlation", "transition"]
    const analysis = {}

    for (const regime of regimes) {
      const regimeTrades = trades.filter((t) => t.regime === regime)
      const winningTrades = regimeTrades.filter((t) => t.pnl > 0)

      analysis[regime] = {
        totalTrades: regimeTrades.length,
        winRate: regimeTrades.length > 0 ? (winningTrades.length / regimeTrades.length) * 100 : 0,
        totalPnl: regimeTrades.reduce((sum, t) => sum + t.pnl, 0),
        avgPnl: regimeTrades.length > 0 ? regimeTrades.reduce((sum, t) => sum + t.pnl, 0) / regimeTrades.length : 0,
        avgHoldingPeriod:
          regimeTrades.length > 0 ? regimeTrades.reduce((sum, t) => sum + t.holdingPeriod, 0) / regimeTrades.length : 0,
      }
    }

    return analysis
  }

  static analyzeByStrategy(trades) {
    const strategies = ["mean_reversion", "momentum", "transition"]
    const analysis = {}

    for (const strategy of strategies) {
      const strategyTrades = trades.filter((t) => t.strategy === strategy)
      const winningTrades = strategyTrades.filter((t) => t.pnl > 0)

      analysis[strategy] = {
        totalTrades: strategyTrades.length,
        winRate: strategyTrades.length > 0 ? (winningTrades.length / strategyTrades.length) * 100 : 0,
        totalPnl: strategyTrades.reduce((sum, t) => sum + t.pnl, 0),
        avgPnl:
          strategyTrades.length > 0 ? strategyTrades.reduce((sum, t) => sum + t.pnl, 0) / strategyTrades.length : 0,
      }
    }

    return analysis
  }
}

// ASCII chart generator
class ChartGenerator {
  static createEquityChart(equityCurve, width = 60, height = 15) {
    const values = equityCurve.map((point) => point.equity)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min

    if (range === 0) return "No variation in equity"

    const chart = []
    for (let i = 0; i < height; i++) {
      chart.push(Array(width).fill(" "))
    }

    // Plot data points
    for (let i = 0; i < Math.min(values.length, width); i++) {
      const value = values[Math.floor((i / width) * values.length)]
      const normalizedValue = (value - min) / range
      const y = Math.floor((1 - normalizedValue) * (height - 1))
      chart[y][i] = "•"
    }

    return chart.map((row) => row.join("")).join("\n")
  }

  static createBarChart(data, labels, width = 30) {
    const max = Math.max(...data)
    if (max === 0) return "No data to display"

    const chart = []
    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      const normalizedValue = value / max
      const barWidth = Math.floor(normalizedValue * width)
      const bar = "█".repeat(Math.max(0, barWidth))
      chart.push(`${labels[i].padEnd(20)}: ${bar} ${value.toFixed(1)}`)
    }

    return chart.join("\n")
  }

  static createRegimeDistribution(regimeData) {
    const distribution = {}
    for (const point of regimeData) {
      distribution[point.regime] = (distribution[point.regime] || 0) + 1
    }

    const total = regimeData.length
    const percentages = []
    const labels = []

    for (const regime in distribution) {
      percentages.push((distribution[regime] / total) * 100)
      labels.push(regime.replace("-", " "))
    }

    return this.createBarChart(percentages, labels)
  }
}

// Main visualization function
function runVisualization() {
  console.log("Generating strategy performance visualization...")

  // Generate sample data
  const equityCurve = DataGenerator.generateEquityCurve(100000, 252, 0.15, 0.18)
  const regimeData = DataGenerator.generateRegimeData(252)
  const trades = DataGenerator.generateTradeData(89)

  // Calculate performance metrics
  const metrics = PerformanceAnalyzer.calculateMetrics(equityCurve, trades)
  const regimeAnalysis = PerformanceAnalyzer.analyzeByRegime(trades)
  const strategyAnalysis = PerformanceAnalyzer.analyzeByStrategy(trades)

  // Display results
  console.log("\n📈 EQUITY CURVE:")
  console.log(ChartGenerator.createEquityChart(equityCurve))

  console.log(`\nStarting: $${equityCurve[0].equity.toLocaleString()}`)
  console.log(`Ending: $${equityCurve[equityCurve.length - 1].equity.toLocaleString()}`)
  console.log(`Return: ${metrics.totalReturn.toFixed(2)}%`)

  console.log("\n📊 PERFORMANCE METRICS:")
  console.log(`Total Return: ${metrics.totalReturn.toFixed(2)}%`)
  console.log(`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`)
  console.log(`Max Drawdown: ${metrics.maxDrawdown.toFixed(2)}%`)
  console.log(`Win Rate: ${metrics.winRate.toFixed(1)}%`)
  console.log(`Profit Factor: ${metrics.profitFactor.toFixed(2)}`)
  console.log(`Total Trades: ${metrics.totalTrades}`)

  console.log("\n📊 REGIME DISTRIBUTION:")
  console.log(ChartGenerator.createRegimeDistribution(regimeData))

  console.log("\n💰 REGIME PERFORMANCE:")
  for (const regime in regimeAnalysis) {
    const analysis = regimeAnalysis[regime]
    console.log(
      `${regime.replace("-", " ").padEnd(20)}: ${analysis.totalTrades} trades | ${analysis.winRate.toFixed(1)}% win rate | $${analysis.avgPnl.toFixed(2)} avg P&L`,
    )
  }

  console.log("\n🎯 STRATEGY PERFORMANCE:")
  for (const strategy in strategyAnalysis) {
    const analysis = strategyAnalysis[strategy]
    console.log(
      `${strategy.replace("_", " ").padEnd(20)}: ${analysis.totalTrades} trades | ${analysis.winRate.toFixed(1)}% win rate | $${analysis.avgPnl.toFixed(2)} avg P&L`,
    )
  }

  console.log("\n📈 TRADE STATISTICS:")
  console.log("Type".padEnd(20) + "Count".padEnd(10) + "Win Rate".padEnd(12) + "Avg P&L")
  console.log("-".repeat(50))

  const meanRevTrades = trades.filter((t) => t.strategy === "mean_reversion")
  const momentumTrades = trades.filter((t) => t.strategy === "momentum")

  if (meanRevTrades.length > 0) {
    const mrWinRate = (meanRevTrades.filter((t) => t.pnl > 0).length / meanRevTrades.length) * 100
    const mrAvgPnl = meanRevTrades.reduce((sum, t) => sum + t.pnl, 0) / meanRevTrades.length
    console.log(
      `${"Mean Reversion".padEnd(20)}${meanRevTrades.length.toString().padEnd(10)}${mrWinRate.toFixed(1).padEnd(12)}$${mrAvgPnl.toFixed(2)}`,
    )
  }

  if (momentumTrades.length > 0) {
    const momWinRate = (momentumTrades.filter((t) => t.pnl > 0).length / momentumTrades.length) * 100
    const momAvgPnl = momentumTrades.reduce((sum, t) => sum + t.pnl, 0) / momentumTrades.length
    console.log(
      `${"Momentum".padEnd(20)}${momentumTrades.length.toString().padEnd(10)}${momWinRate.toFixed(1).padEnd(12)}$${momAvgPnl.toFixed(2)}`,
    )
  }

  console.log("\n✅ Visualization complete!")
  console.log("For interactive charts, use the web dashboard components.")

  return {
    metrics,
    regimeAnalysis,
    strategyAnalysis,
    equityCurve,
    trades,
  }
}

// Execute visualization
runVisualization()
