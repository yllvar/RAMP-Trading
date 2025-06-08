// Comprehensive Backtesting Engine - JavaScript Implementation
const https = require("https")

console.log("🎯 COMPREHENSIVE REGIME-ADAPTIVE BACKTESTING ENGINE")
console.log("=".repeat(60))

// Import statistical analysis from enhanced analyzer
class StatisticalAnalysis {
  static correlation(series1, series2) {
    const n = series1.length
    const mean1 = series1.reduce((sum, val) => sum + val, 0) / n
    const mean2 = series2.reduce((sum, val) => sum + val, 0) / n

    let covariance = 0
    let variance1 = 0
    let variance2 = 0

    for (let i = 0; i < n; i++) {
      const diff1 = series1[i] - mean1
      const diff2 = series2[i] - mean2
      covariance += diff1 * diff2
      variance1 += diff1 * diff1
      variance2 += diff2 * diff2
    }

    return covariance / Math.sqrt(variance1 * variance2)
  }

  static linearRegression(x, y) {
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    const residuals = y.map((val, i) => val - (slope * x[i] + intercept))

    return { slope, intercept, residuals }
  }

  static standardDeviation(series) {
    const mean = series.reduce((sum, val) => sum + val, 0) / series.length
    const variance = series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / series.length
    return Math.sqrt(variance)
  }

  static zScore(value, mean, stdDev) {
    return stdDev === 0 ? 0 : (value - mean) / stdDev
  }
}

// Comprehensive backtesting engine
class RegimeAdaptiveBacktester {
  constructor(config = {}) {
    this.config = {
      initialCapital: 100000,
      commission: 0.001, // 0.1%
      slippage: 0.0005, // 0.05%
      correlationWindow: 30,
      highCorrThreshold: 0.7,
      lowCorrThreshold: 0.3,
      zscoreEntryThreshold: 2.5,
      zscoreExitThreshold: 1.0,
      stopLossThreshold: 5.0,
      maxPositionSize: 0.5,
      meanReversionLeverage: 2.5,
      momentumLeverage: 4.0,
      transitionLeverage: 1.5,
      ...config,
    }

    this.portfolio = {
      cash: this.config.initialCapital,
      equity: this.config.initialCapital,
      positions: [],
      trades: [],
      equityCurve: [],
    }

    this.tradeCounter = 0
  }

  async loadData() {
    console.log("📥 Loading market data for backtesting...")

    const btcResponse = await this.fetchData(
      "https://bldx9rnrswf4s3au.public.blob.vercel-storage.com/BTCUSDT_d-bWeIhnyBdCx9Fcjk9U3Fk0g8aLfNzW.csv",
    )
    const xrpResponse = await this.fetchData(
      "https://bldx9rnrswf4s3au.public.blob.vercel-storage.com/XRPUSDT_d-VsnkwUhaJ26AQ7ritnKoJEq5YaJTVD.csv",
    )

    const btcData = this.parseCSV(btcResponse)
    const xrpData = this.parseCSV(xrpResponse)

    // Extract prices
    const btcPrices = this.extractPrices(btcData)
    const xrpPrices = this.extractPrices(xrpData)

    // Align data
    const minLength = Math.min(btcPrices.length, xrpPrices.length)
    this.btcPrices = btcPrices.slice(0, minLength)
    this.xrpPrices = xrpPrices.slice(0, minLength)

    console.log(`✅ Loaded ${minLength} data points for backtesting`)
  }

  fetchData(url) {
    return new Promise((resolve, reject) => {
      https
        .get(url, (response) => {
          let data = ""
          response.on("data", (chunk) => {
            data += chunk
          })
          response.on("end", () => resolve(data))
        })
        .on("error", reject)
    })
  }

  parseCSV(csvText) {
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())
    return lines.slice(1).map((line) => {
      const values = line.split(",")
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim() : ""
      })
      return row
    })
  }

  extractPrices(data) {
    // Find price column
    const priceKeywords = ["close", "price", "Close", "Price"]
    const headers = Object.keys(data[0])
    const priceColumn = headers.find((h) => priceKeywords.some((k) => h.includes(k))) || headers[headers.length - 1]

    return data.map((row) => Number.parseFloat(row[priceColumn])).filter((p) => !isNaN(p))
  }

  calculateCointegration() {
    console.log("🔬 Calculating cointegration relationship...")

    const regression = StatisticalAnalysis.linearRegression(this.btcPrices, this.xrpPrices)
    this.hedgeRatio = regression.slope

    console.log(`📊 Hedge Ratio: ${this.hedgeRatio.toFixed(4)}`)
    return regression
  }

  calculateSpread() {
    console.log("📈 Calculating log spread...")

    this.spread = this.btcPrices.map(
      (btcPrice, i) => Math.log(btcPrice) - this.hedgeRatio * Math.log(this.xrpPrices[i]),
    )

    console.log(`📊 Spread calculated for ${this.spread.length} observations`)
  }

  calculateZScores() {
    console.log("🎯 Calculating rolling z-scores...")

    this.zscores = []
    const window = this.config.correlationWindow

    for (let i = window - 1; i < this.spread.length; i++) {
      const windowData = this.spread.slice(i - window + 1, i + 1)
      const mean = windowData.reduce((sum, val) => sum + val, 0) / window
      const stdDev = StatisticalAnalysis.standardDeviation(windowData)
      const zscore = StatisticalAnalysis.zScore(this.spread[i], mean, stdDev)

      this.zscores.push(zscore)
    }

    console.log(`📊 Z-scores calculated for ${this.zscores.length} observations`)
  }

  calculateCorrelations() {
    console.log("🔗 Calculating rolling correlations...")

    const btcReturns = this.btcPrices.slice(1).map((price, i) => (price - this.btcPrices[i]) / this.btcPrices[i])
    const xrpReturns = this.xrpPrices.slice(1).map((price, i) => (price - this.xrpPrices[i]) / this.xrpPrices[i])

    this.correlations = []
    const window = this.config.correlationWindow

    for (let i = window - 1; i < btcReturns.length; i++) {
      const btcWindow = btcReturns.slice(i - window + 1, i + 1)
      const xrpWindow = xrpReturns.slice(i - window + 1, i + 1)
      const correlation = StatisticalAnalysis.correlation(btcWindow, xrpWindow)
      this.correlations.push(correlation)
    }

    console.log(`📊 Correlations calculated for ${this.correlations.length} observations`)
  }

  detectRegime(correlation) {
    if (correlation > this.config.highCorrThreshold) {
      return "high-correlation"
    } else if (correlation < this.config.lowCorrThreshold) {
      return "low-correlation"
    } else {
      return "transition"
    }
  }

  generateSignal(zscore, regime) {
    const threshold = this.config.zscoreEntryThreshold

    if (Math.abs(zscore) > threshold) {
      if (regime === "high-correlation") {
        // Mean reversion
        return {
          type: "entry",
          direction: zscore > 0 ? "short_btc_long_xrp" : "long_btc_short_xrp",
          strategy: "mean_reversion",
          strength: Math.min(Math.abs(zscore) / threshold, 2.0),
        }
      } else if (regime === "low-correlation") {
        // Momentum
        return {
          type: "entry",
          direction: zscore > 0 ? "long_btc_short_xrp" : "short_btc_long_xrp",
          strategy: "momentum",
          strength: Math.min(Math.abs(zscore) / threshold, 2.0),
        }
      }
    }

    return { type: "hold", direction: "neutral", strategy: "none", strength: 0 }
  }

  calculatePositionSize(signal, regime) {
    const baseAllocation = {
      "high-correlation": 0.4,
      "low-correlation": 0.5,
      transition: 0.2,
    }

    const leverage = {
      "high-correlation": this.config.meanReversionLeverage,
      "low-correlation": this.config.momentumLeverage,
      transition: this.config.transitionLeverage,
    }

    const allocation = baseAllocation[regime] * signal.strength
    const maxPosition = this.config.maxPositionSize * this.portfolio.cash

    return Math.min(allocation * this.portfolio.cash * leverage[regime], maxPosition)
  }

  executeEntry(signal, day, btcPrice, xrpPrice, zscore, regime) {
    const positionSize = this.calculatePositionSize(signal, regime)

    if (positionSize < 1000) return // Minimum position size

    // Apply costs
    const commission = positionSize * this.config.commission
    const slippage = positionSize * this.config.slippage
    const totalCosts = commission + slippage

    const trade = {
      id: `trade_${this.tradeCounter++}`,
      entryDay: day,
      entryBtcPrice: btcPrice,
      entryXrpPrice: xrpPrice,
      entryZscore: zscore,
      direction: signal.direction,
      strategy: signal.strategy,
      regime,
      positionSize,
      leverage: this.calculateLeverage(regime),
      commission,
      slippage,
      totalCosts,
      status: "open",
    }

    this.portfolio.positions.push(trade)
    this.portfolio.cash -= positionSize + totalCosts

    console.log(
      `📈 ENTRY: ${trade.strategy} | ${trade.direction} | Size: $${positionSize.toFixed(0)} | Z-score: ${zscore.toFixed(2)}`,
    )

    return trade
  }

  calculateLeverage(regime) {
    switch (regime) {
      case "high-correlation":
        return this.config.meanReversionLeverage
      case "low-correlation":
        return this.config.momentumLeverage
      case "transition":
        return this.config.transitionLeverage
      default:
        return 1.0
    }
  }

  checkExitConditions(position, zscore, day) {
    // Time-based exit
    if (day - position.entryDay > 30) {
      return { exit: true, reason: "max_holding_period" }
    }

    // Stop loss
    const currentPnl = this.calculatePositionPnl(position, this.btcPrices[day], this.xrpPrices[day])
    if (currentPnl < -0.05 * position.positionSize) {
      return { exit: true, reason: "stop_loss" }
    }

    // Strategy-specific exits
    if (position.strategy === "mean_reversion" && Math.abs(zscore) < this.config.zscoreExitThreshold) {
      return { exit: true, reason: "mean_reversion_target" }
    }

    if (position.strategy === "momentum") {
      if ((position.entryZscore > 0 && zscore < 0) || (position.entryZscore < 0 && zscore > 0)) {
        return { exit: true, reason: "momentum_reversal" }
      }
    }

    return { exit: false, reason: "" }
  }

  calculatePositionPnl(position, btcPrice, xrpPrice) {
    const btcPnl = (btcPrice - position.entryBtcPrice) / position.entryBtcPrice
    const xrpPnl = (xrpPrice - position.entryXrpPrice) / position.entryXrpPrice

    let totalPnl
    if (position.direction === "long_btc_short_xrp") {
      totalPnl = btcPnl - xrpPnl
    } else {
      totalPnl = xrpPnl - btcPnl
    }

    return totalPnl * position.positionSize * position.leverage
  }

  executeExit(position, day, btcPrice, xrpPrice, reason) {
    const pnl = this.calculatePositionPnl(position, btcPrice, xrpPrice)
    const commission = position.positionSize * this.config.commission
    const slippage = position.positionSize * this.config.slippage
    const netPnl = pnl - commission - slippage

    position.exitDay = day
    position.exitBtcPrice = btcPrice
    position.exitXrpPrice = xrpPrice
    position.exitReason = reason
    position.pnl = netPnl
    position.pnlPercent = netPnl / position.positionSize
    position.holdingPeriod = day - position.entryDay
    position.status = "closed"
    position.totalCosts += commission + slippage

    this.portfolio.cash += position.positionSize + netPnl
    this.portfolio.trades.push(position)

    console.log(
      `📉 EXIT: ${position.strategy} | P&L: $${netPnl.toFixed(2)} (${(position.pnlPercent * 100).toFixed(2)}%) | Reason: ${reason}`,
    )

    return position
  }

  updateEquityCurve(day, regime) {
    let unrealizedPnl = 0

    // Calculate unrealized P&L
    for (const position of this.portfolio.positions) {
      const pnl = this.calculatePositionPnl(position, this.btcPrices[day], this.xrpPrices[day])
      unrealizedPnl += pnl
    }

    const totalEquity = this.portfolio.cash + unrealizedPnl
    const drawdown = this.calculateDrawdown(totalEquity)

    this.portfolio.equityCurve.push({
      day,
      equity: totalEquity,
      cash: this.portfolio.cash,
      unrealizedPnl,
      drawdown,
      regime,
      activePositions: this.portfolio.positions.length,
    })

    this.portfolio.equity = totalEquity
  }

  calculateDrawdown(currentEquity) {
    if (this.portfolio.equityCurve.length === 0) return 0

    const peak = Math.max(...this.portfolio.equityCurve.map((point) => point.equity), currentEquity)
    return ((peak - currentEquity) / peak) * 100
  }

  async runBacktest() {
    console.log("🚀 Starting comprehensive backtest...")

    await this.loadData()
    this.calculateCointegration()
    this.calculateSpread()
    this.calculateZScores()
    this.calculateCorrelations()

    const startIndex = this.config.correlationWindow
    const regimeStats = {
      "high-correlation": { days: 0, trades: 0, pnl: 0 },
      "low-correlation": { days: 0, trades: 0, pnl: 0 },
      transition: { days: 0, trades: 0, pnl: 0 },
    }

    console.log(`📊 Running simulation for ${this.zscores.length} trading days...`)

    // Main simulation loop
    for (let day = 0; day < this.zscores.length; day++) {
      const actualDay = day + startIndex
      const zscore = this.zscores[day]
      const correlation = this.correlations[day]
      const regime = this.detectRegime(correlation)
      const btcPrice = this.btcPrices[actualDay]
      const xrpPrice = this.xrpPrices[actualDay]

      regimeStats[regime].days++

      // Check exits for existing positions
      const positionsToClose = []
      for (const position of this.portfolio.positions) {
        const { exit, reason } = this.checkExitConditions(position, zscore, actualDay)
        if (exit) {
          const closedTrade = this.executeExit(position, actualDay, btcPrice, xrpPrice, reason)
          regimeStats[closedTrade.regime].trades++
          regimeStats[closedTrade.regime].pnl += closedTrade.pnl
          positionsToClose.push(position)
        }
      }

      // Remove closed positions
      this.portfolio.positions = this.portfolio.positions.filter((pos) => !positionsToClose.includes(pos))

      // Generate new signals
      if (this.portfolio.positions.length < 2) {
        // Max 2 concurrent positions
        const signal = this.generateSignal(zscore, regime)
        if (signal.type === "entry") {
          this.executeEntry(signal, actualDay, btcPrice, xrpPrice, zscore, regime)
        }
      }

      // Update equity curve
      this.updateEquityCurve(actualDay, regime)
    }

    // Close remaining positions
    const finalDay = this.zscores.length - 1 + startIndex
    for (const position of this.portfolio.positions) {
      const closedTrade = this.executeExit(
        position,
        finalDay,
        this.btcPrices[finalDay],
        this.xrpPrices[finalDay],
        "backtest_end",
      )
      regimeStats[closedTrade.regime].trades++
      regimeStats[closedTrade.regime].pnl += closedTrade.pnl
      this.portfolio.trades.push(closedTrade)
    }

    return this.generateResults(regimeStats)
  }

  generateResults(regimeStats) {
    const totalReturn = ((this.portfolio.equity - this.config.initialCapital) / this.config.initialCapital) * 100
    const winningTrades = this.portfolio.trades.filter((t) => t.pnl > 0)
    const losingTrades = this.portfolio.trades.filter((t) => t.pnl <= 0)
    const winRate = this.portfolio.trades.length > 0 ? (winningTrades.length / this.portfolio.trades.length) * 100 : 0

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0)
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : Number.POSITIVE_INFINITY

    const maxDrawdown = Math.max(...this.portfolio.equityCurve.map((point) => point.drawdown))

    // Calculate regime performance
    const totalDays = this.zscores.length
    for (const regime in regimeStats) {
      regimeStats[regime].percentage = (regimeStats[regime].days / totalDays) * 100
      regimeStats[regime].avgReturn =
        regimeStats[regime].trades > 0 ? regimeStats[regime].pnl / regimeStats[regime].trades : 0
    }

    console.log("\n" + "=".repeat(60))
    console.log("📈 COMPREHENSIVE BACKTEST RESULTS")
    console.log("=".repeat(60))

    console.log(`💰 Initial Capital: $${this.config.initialCapital.toLocaleString()}`)
    console.log(`💰 Final Equity: $${this.portfolio.equity.toLocaleString()}`)
    console.log(`📊 Total Return: ${totalReturn.toFixed(2)}%`)
    console.log(`📊 Max Drawdown: ${maxDrawdown.toFixed(2)}%`)
    console.log(`📊 Total Trades: ${this.portfolio.trades.length}`)
    console.log(`📊 Win Rate: ${winRate.toFixed(1)}%`)
    console.log(`📊 Profit Factor: ${profitFactor.toFixed(2)}`)

    console.log("\n📊 REGIME BREAKDOWN:")
    for (const regime in regimeStats) {
      const stats = regimeStats[regime]
      console.log(
        `${regime}: ${stats.days} days (${stats.percentage.toFixed(1)}%) | ${stats.trades} trades | Avg P&L: $${stats.avgReturn.toFixed(2)}`,
      )
    }

    console.log("\n📈 TRADE ANALYSIS:")
    const meanReversionTrades = this.portfolio.trades.filter((t) => t.strategy === "mean_reversion")
    const momentumTrades = this.portfolio.trades.filter((t) => t.strategy === "momentum")

    console.log(`Mean Reversion: ${meanReversionTrades.length} trades`)
    console.log(`Momentum: ${momentumTrades.length} trades`)

    if (meanReversionTrades.length > 0) {
      const mrWinRate = (meanReversionTrades.filter((t) => t.pnl > 0).length / meanReversionTrades.length) * 100
      console.log(`Mean Reversion Win Rate: ${mrWinRate.toFixed(1)}%`)
    }

    if (momentumTrades.length > 0) {
      const momWinRate = (momentumTrades.filter((t) => t.pnl > 0).length / momentumTrades.length) * 100
      console.log(`Momentum Win Rate: ${momWinRate.toFixed(1)}%`)
    }

    console.log("\n✅ Comprehensive backtest completed!")

    return {
      totalReturn,
      winRate,
      maxDrawdown,
      profitFactor,
      totalTrades: this.portfolio.trades.length,
      regimeStats,
      equityCurve: this.portfolio.equityCurve,
      trades: this.portfolio.trades,
    }
  }
}

// Run comprehensive backtest
async function runComprehensiveBacktest() {
  const backtester = new RegimeAdaptiveBacktester({
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.0005,
    correlationWindow: 30,
    zscoreEntryThreshold: 2.5,
    zscoreExitThreshold: 1.0,
    maxPositionSize: 0.5,
  })

  try {
    const results = await backtester.runBacktest()
    return results
  } catch (error) {
    console.error("❌ Backtest failed:", error.message)
    throw error
  }
}

// Execute the backtest
runComprehensiveBacktest()
