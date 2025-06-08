// Regime-Adaptive Momentum Pairs Strategy Implementation
const https = require("https")

console.log("🎯 REGIME-ADAPTIVE PAIRS STRATEGY BACKTESTER")
console.log("=".repeat(50))

// Function to fetch data from URL
function fetchData(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        let data = ""
        response.on("data", (chunk) => {
          data += chunk
        })
        response.on("end", () => {
          resolve(data)
        })
      })
      .on("error", (error) => {
        reject(error)
      })
  })
}

// Function to parse CSV data
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n")
  const headers = lines[0].split(",")
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",")
    const row = {}
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : ""
    })
    data.push(row)
  }

  return { headers, data }
}

// Function to calculate correlation between two series
function calculateCorrelation(series1, series2) {
  const n = series1.length

  // Calculate means
  const mean1 = series1.reduce((sum, val) => sum + val, 0) / n
  const mean2 = series2.reduce((sum, val) => sum + val, 0) / n

  // Calculate covariance and variances
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

  // Calculate correlation
  return covariance / Math.sqrt(variance1 * variance2)
}

// Function to calculate returns from price series
function calculateReturns(prices) {
  const returns = []

  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
  }

  return returns
}

// Function to calculate rolling window statistics
function calculateRollingWindow(series, window, fn) {
  const result = []

  for (let i = window; i <= series.length; i++) {
    const windowData = series.slice(i - window, i)
    result.push(fn(windowData))
  }

  return result
}

// Function to calculate z-score
function calculateZScore(value, mean, stdDev) {
  return (value - mean) / stdDev
}

// Regime-Adaptive Pairs Strategy class
class RegimeAdaptiveStrategy {
  constructor(initialCapital = 100000) {
    this.initialCapital = initialCapital
    this.capital = initialCapital
    this.positions = []
    this.trades = []
    this.equityCurve = [initialCapital]

    // Strategy parameters
    this.params = {
      correlationWindow: 30,
      highCorrThreshold: 0.7,
      lowCorrThreshold: 0.3,
      zscoreEntryThreshold: 2.5,
      zscoreExitThreshold: 0.5,
      stopLossZscore: 5.0,
      maxPositionSize: 0.5,
      meanReversionLeverage: 2.5,
      momentumLeverage: 4.5,
      transitionLeverage: 1.5,
    }
  }

  // Detect market regime
  detectRegime(correlation) {
    if (correlation > this.params.highCorrThreshold) {
      return "high-correlation"
    } else if (correlation < this.params.lowCorrThreshold) {
      return "low-correlation"
    } else {
      return "transition"
    }
  }

  // Calculate position size based on regime
  calculatePositionSize(regime, signalStrength) {
    const baseAllocation = {
      "high-correlation": 0.4,
      "low-correlation": 0.5,
      transition: 0.2,
    }

    // Adjust for signal strength (z-score magnitude)
    const signalMultiplier = Math.min(Math.abs(signalStrength) / 2.5, 1.5)

    let positionSize = baseAllocation[regime] * this.capital * signalMultiplier

    // Apply maximum position limit
    const maxPosition = this.params.maxPositionSize * this.capital
    positionSize = Math.min(positionSize, maxPosition)

    return positionSize
  }

  // Calculate leverage based on regime
  calculateLeverage(regime) {
    switch (regime) {
      case "high-correlation":
        return this.params.meanReversionLeverage
      case "low-correlation":
        return this.params.momentumLeverage
      case "transition":
        return this.params.transitionLeverage
      default:
        return 1.0
    }
  }

  // Execute trade
  executeTrade(day, regime, zscore, btcPrice, xrpPrice) {
    const isMeanReversion = regime === "high-correlation"

    // Determine trade direction based on regime and z-score
    let direction
    if (isMeanReversion) {
      // Mean reversion: go against the spread
      direction = zscore > 0 ? "short_btc_long_xrp" : "long_btc_short_xrp"
    } else {
      // Momentum: go with the spread
      direction = zscore > 0 ? "long_btc_short_xrp" : "short_btc_long_xrp"
    }

    // Calculate position size and leverage
    const positionSize = this.calculatePositionSize(regime, zscore)
    const leverage = this.calculateLeverage(regime)
    const exposure = positionSize * leverage

    // Create trade
    const trade = {
      day,
      regime,
      type: isMeanReversion ? "mean_reversion" : "momentum",
      direction,
      entryZscore: zscore,
      btcEntryPrice: btcPrice,
      xrpEntryPrice: xrpPrice,
      positionSize,
      leverage,
      exposure,
      status: "open",
    }

    this.positions.push(trade)
    return trade
  }

  // Check exit conditions
  checkExitConditions(position, currentZscore, btcPrice, xrpPrice) {
    if (position.type === "mean_reversion") {
      // Exit when spread reverts to mean or stop loss triggered
      if (Math.abs(currentZscore) < this.params.zscoreExitThreshold) {
        return { shouldExit: true, reason: "target_reached" }
      } else if (Math.abs(currentZscore) > this.params.stopLossZscore) {
        return { shouldExit: true, reason: "stop_loss" }
      }
    } else if (position.type === "momentum") {
      // Exit when momentum reverses
      if ((position.entryZscore > 0 && currentZscore < 0) || (position.entryZscore < 0 && currentZscore > 0)) {
        return { shouldExit: true, reason: "momentum_reversal" }
      }

      // Exit on large profit
      const btcReturn = (btcPrice - position.btcEntryPrice) / position.btcEntryPrice
      const xrpReturn = (xrpPrice - position.xrpEntryPrice) / position.xrpEntryPrice

      if (Math.abs(btcReturn - xrpReturn) > 0.1) {
        // 10% spread profit
        return { shouldExit: true, reason: "profit_target" }
      }
    }

    return { shouldExit: false }
  }

  // Close position
  closePosition(position, day, btcPrice, xrpPrice, reason) {
    // Calculate P&L
    let btcPnl, xrpPnl

    if (position.direction === "long_btc_short_xrp") {
      btcPnl = (btcPrice - position.btcEntryPrice) / position.btcEntryPrice
      xrpPnl = -(xrpPrice - position.xrpEntryPrice) / position.xrpEntryPrice
    } else {
      // short_btc_long_xrp
      btcPnl = -(btcPrice - position.btcEntryPrice) / position.btcEntryPrice
      xrpPnl = (xrpPrice - position.xrpEntryPrice) / position.xrpEntryPrice
    }

    const totalPnl = (btcPnl + xrpPnl) * position.leverage
    const dollarPnl = totalPnl * position.positionSize

    // Update capital
    this.capital += dollarPnl

    // Record trade
    const closedTrade = {
      ...position,
      exitDay: day,
      btcExitPrice: btcPrice,
      xrpExitPrice: xrpPrice,
      exitReason: reason,
      pnlPercent: totalPnl * 100,
      pnlDollar: dollarPnl,
      status: "closed",
    }

    this.trades.push(closedTrade)

    // Remove from active positions
    this.positions = this.positions.filter((p) => p !== position)

    return closedTrade
  }

  // Run backtest
  async runBacktest() {
    try {
      console.log("📥 Loading market data...")

      // Load BTC data
      const btcData = await fetchData(
        "https://bldx9rnrswf4s3au.public.blob.vercel-storage.com/BTCUSDT_d-bWeIhnyBdCx9Fcjk9U3Fk0g8aLfNzW.csv",
      )
      const btcParsed = parseCSV(btcData)

      // Load XRP data
      const xrpData = await fetchData(
        "https://bldx9rnrswf4s3au.public.blob.vercel-storage.com/XRPUSDT_d-VsnkwUhaJ26AQ7ritnKoJEq5YaJTVD.csv",
      )
      const xrpParsed = parseCSV(xrpData)

      console.log("✅ Data loaded successfully!")

      // Find price columns
      const priceKeywords = ["close", "price", "Close", "Price"]
      const btcPriceCol =
        btcParsed.headers.find((h) => priceKeywords.some((k) => h.includes(k))) ||
        btcParsed.headers[btcParsed.headers.length - 1]
      const xrpPriceCol =
        xrpParsed.headers.find((h) => priceKeywords.some((k) => h.includes(k))) ||
        xrpParsed.headers[xrpParsed.headers.length - 1]

      // Extract price data
      const btcPrices = btcParsed.data.map((row) => Number.parseFloat(row[btcPriceCol])).filter((p) => !isNaN(p))
      const xrpPrices = xrpParsed.data.map((row) => Number.parseFloat(row[xrpPriceCol])).filter((p) => !isNaN(p))

      // Ensure equal length
      const minLength = Math.min(btcPrices.length, xrpPrices.length)
      const btcPricesTrimmed = btcPrices.slice(0, minLength)
      const xrpPricesTrimmed = xrpPrices.slice(0, minLength)

      console.log(`📊 Processing ${minLength} days of price data...`)

      // Calculate returns
      const btcReturns = calculateReturns(btcPricesTrimmed)
      const xrpReturns = calculateReturns(xrpPricesTrimmed)

      // Calculate log prices for spread
      const logBtcPrices = btcPricesTrimmed.map((p) => Math.log(p))
      const logXrpPrices = xrpPricesTrimmed.map((p) => Math.log(p))
      const spread = logBtcPrices.map((btc, i) => btc - logXrpPrices[i])

      const window = this.params.correlationWindow

      // Skip days without enough history
      if (minLength <= window) {
        console.log("❌ Not enough data for analysis")
        return
      }

      console.log("🎯 Running backtest...")

      // Track regime statistics
      const regimeStats = {
        "high-correlation": { days: 0, returns: 0 },
        "low-correlation": { days: 0, returns: 0 },
        transition: { days: 0, returns: 0 },
      }

      // Run day by day simulation
      for (let day = window; day < minLength; day++) {
        // Calculate rolling correlation
        const corrWindow = btcReturns.slice(day - window, day)
        const xrpCorrWindow = xrpReturns.slice(day - window, day)
        const correlation = calculateCorrelation(corrWindow, xrpCorrWindow)

        // Calculate z-score
        const spreadWindow = spread.slice(day - window, day)
        const spreadMean = spreadWindow.reduce((sum, val) => sum + val, 0) / window
        const spreadVariance = spreadWindow.reduce((sum, val) => sum + Math.pow(val - spreadMean, 2), 0) / window
        const spreadStdDev = Math.sqrt(spreadVariance)
        const currentZscore = (spread[day] - spreadMean) / spreadStdDev

        // Detect regime
        const regime = this.detectRegime(correlation)
        regimeStats[regime].days++

        // Check exit conditions for existing positions
        for (const position of [...this.positions]) {
          const { shouldExit, reason } = this.checkExitConditions(
            position,
            currentZscore,
            btcPricesTrimmed[day],
            xrpPricesTrimmed[day],
          )

          if (shouldExit) {
            const closedTrade = this.closePosition(position, day, btcPricesTrimmed[day], xrpPricesTrimmed[day], reason)

            // Update regime returns
            regimeStats[position.regime].returns += closedTrade.pnlPercent
          }
        }

        // Generate new signals
        if (this.positions.length < 2) {
          // Max 2 concurrent positions
          if (regime === "high-correlation" && Math.abs(currentZscore) > this.params.zscoreEntryThreshold) {
            // Mean reversion signal
            this.executeTrade(day, regime, currentZscore, btcPricesTrimmed[day], xrpPricesTrimmed[day])
          } else if (regime === "low-correlation" && Math.abs(currentZscore) > 1.5) {
            // Momentum signal
            this.executeTrade(day, regime, currentZscore, btcPricesTrimmed[day], xrpPricesTrimmed[day])
          }
        }

        // Update equity curve
        this.equityCurve.push(this.capital)
      }

      // Close any remaining positions
      for (const position of [...this.positions]) {
        this.closePosition(
          position,
          minLength - 1,
          btcPricesTrimmed[minLength - 1],
          xrpPricesTrimmed[minLength - 1],
          "backtest_end",
        )
      }

      // Calculate performance metrics
      const totalReturn = ((this.capital - this.initialCapital) / this.initialCapital) * 100
      const winningTrades = this.trades.filter((t) => t.pnlDollar > 0)
      const losingTrades = this.trades.filter((t) => t.pnlDollar <= 0)
      const winRate = (winningTrades.length / this.trades.length) * 100

      const avgWin =
        winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / winningTrades.length : 0

      const avgLoss =
        losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / losingTrades.length : 0

      const profitFactor =
        losingTrades.length > 0
          ? Math.abs(
              winningTrades.reduce((sum, t) => sum + t.pnlDollar, 0) /
                losingTrades.reduce((sum, t) => sum + t.pnlDollar, 0),
            )
          : Number.POSITIVE_INFINITY

      // Calculate drawdown
      let maxDrawdown = 0
      let peak = this.initialCapital

      for (const equity of this.equityCurve) {
        if (equity > peak) {
          peak = equity
        }

        const drawdown = ((peak - equity) / peak) * 100
        maxDrawdown = Math.max(maxDrawdown, drawdown)
      }

      // Calculate regime performance
      for (const regime in regimeStats) {
        if (regimeStats[regime].days > 0) {
          regimeStats[regime].avgReturn = regimeStats[regime].returns / regimeStats[regime].days
        }
      }

      // Print results
      console.log("\n" + "=".repeat(50))
      console.log("📈 BACKTEST RESULTS")
      console.log("=".repeat(50))

      console.log(`Initial Capital: $${this.initialCapital.toLocaleString()}`)
      console.log(`Final Capital: $${this.capital.toLocaleString()}`)
      console.log(`Total Return: ${totalReturn.toFixed(2)}%`)
      console.log(`Max Drawdown: ${maxDrawdown.toFixed(2)}%`)
      console.log(`Total Trades: ${this.trades.length}`)
      console.log(`Win Rate: ${winRate.toFixed(1)}%`)
      console.log(`Average Win: ${avgWin.toFixed(2)}%`)
      console.log(`Average Loss: ${avgLoss.toFixed(2)}%`)
      console.log(`Profit Factor: ${profitFactor.toFixed(2)}`)

      console.log("\n📊 REGIME ANALYSIS:")
      for (const regime in regimeStats) {
        const percentage = ((regimeStats[regime].days / (minLength - window)) * 100).toFixed(1)
        console.log(
          `${regime}: ${regimeStats[regime].days} days (${percentage}%), Avg Return: ${regimeStats[regime].avgReturn.toFixed(2)}%`,
        )
      }

      console.log("\n📈 TRADE BREAKDOWN:")
      const meanReversionTrades = this.trades.filter((t) => t.type === "mean_reversion")
      const momentumTrades = this.trades.filter((t) => t.type === "momentum")

      const mrWinRate =
        meanReversionTrades.length > 0
          ? ((meanReversionTrades.filter((t) => t.pnlDollar > 0).length / meanReversionTrades.length) * 100).toFixed(1)
          : "N/A"

      const momWinRate =
        momentumTrades.length > 0
          ? ((momentumTrades.filter((t) => t.pnlDollar > 0).length / momentumTrades.length) * 100).toFixed(1)
          : "N/A"

      console.log(`Mean Reversion: ${meanReversionTrades.length} trades, Win Rate: ${mrWinRate}%`)
      console.log(`Momentum: ${momentumTrades.length} trades, Win Rate: ${momWinRate}%`)

      return {
        totalReturn,
        winRate,
        maxDrawdown,
        profitFactor,
        trades: this.trades,
        equityCurve: this.equityCurve,
        regimeStats,
      }
    } catch (error) {
      console.error("❌ Error during backtest:", error.message)
    }
  }
}

// Run the strategy
const strategy = new RegimeAdaptiveStrategy(100000)
strategy.runBacktest()
