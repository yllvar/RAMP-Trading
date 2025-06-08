// Enhanced Data Analysis Engine - JavaScript Implementation
const https = require("https")

console.log("🚀 ENHANCED CRYPTO PAIRS DATA ANALYZER")
console.log("=".repeat(60))

// Advanced statistical functions
class StatisticalAnalysis {
  // Calculate correlation between two series
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

  // Linear regression for cointegration testing
  static linearRegression(x, y) {
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate residuals and R-squared
    const residuals = y.map((val, i) => val - (slope * x[i] + intercept))
    const yMean = sumY / n
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0)
    const residualSumSquares = residuals.reduce((sum, val) => sum + val * val, 0)
    const rSquared = 1 - residualSumSquares / totalSumSquares

    return { slope, intercept, residuals, rSquared }
  }

  // Augmented Dickey-Fuller test (simplified)
  static adfTest(series, lags = 1) {
    const n = series.length
    const diff = series.slice(1).map((val, i) => val - series[i])
    const lagged = series.slice(0, -1)

    const regression = this.linearRegression(lagged, diff)
    const testStatistic = regression.slope / Math.sqrt(regression.rSquared / (n - 2))

    // Critical values (approximate)
    const criticalValues = {
      "1%": -3.43,
      "5%": -2.86,
      "10%": -2.57,
    }

    return { testStatistic, criticalValues }
  }

  // Calculate half-life of mean reversion
  static calculateHalfLife(residuals) {
    const n = residuals.length
    const laggedResiduals = residuals.slice(0, -1)
    const diffResiduals = residuals.slice(1).map((val, i) => val - residuals[i])

    const regression = this.linearRegression(laggedResiduals, diffResiduals)
    const lambda = regression.slope

    if (lambda >= 0) return Number.POSITIVE_INFINITY
    return -Math.log(2) / lambda
  }

  // Rolling window calculation
  static rollingWindow(series, window, fn) {
    const result = []
    for (let i = window - 1; i < series.length; i++) {
      const windowData = series.slice(i - window + 1, i + 1)
      result.push(fn(windowData))
    }
    return result
  }

  // Z-score calculation
  static zScore(value, mean, stdDev) {
    return stdDev === 0 ? 0 : (value - mean) / stdDev
  }

  // Standard deviation
  static standardDeviation(series) {
    const mean = series.reduce((sum, val) => sum + val, 0) / series.length
    const variance = series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / series.length
    return Math.sqrt(variance)
  }
}

// Enhanced data fetching and processing
class DataProcessor {
  static async fetchData(url) {
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

  static parseCSV(csvText) {
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",")
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim() : ""
      })
      data.push(row)
    }

    return { headers, data }
  }

  static detectColumns(df) {
    const dateKeywords = ["date", "timestamp", "time"]
    const priceKeywords = ["close", "price"]

    const dateCol = df.headers.find((col) => dateKeywords.some((keyword) => col.toLowerCase().includes(keyword)))
    const priceCol = df.headers.find((col) => priceKeywords.some((keyword) => col.toLowerCase().includes(keyword)))

    return {
      dateColumn: dateCol || df.headers[0],
      priceColumn: priceCol || df.headers[df.headers.length - 1],
    }
  }

  static extractPrices(data, priceColumn) {
    return data.map((row) => Number.parseFloat(row[priceColumn])).filter((p) => !isNaN(p))
  }

  static calculateReturns(prices) {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    return returns
  }
}

// Cointegration testing engine
class CointegrationTester {
  static performEngleGrangerTest(series1, series2) {
    console.log("🔬 Performing Engle-Granger Cointegration Test...")

    if (series1.length !== series2.length || series1.length < 30) {
      throw new Error("Series must have equal length and at least 30 observations")
    }

    // Step 1: Estimate cointegrating relationship
    const regression = StatisticalAnalysis.linearRegression(series1, series2)
    const hedgeRatio = regression.slope
    const residuals = regression.residuals

    console.log(`📊 Hedge Ratio: ${hedgeRatio.toFixed(4)}`)
    console.log(`📊 R-Squared: ${regression.rSquared.toFixed(4)}`)

    // Step 2: Test residuals for stationarity
    const adfTest = StatisticalAnalysis.adfTest(residuals, 1)

    // Calculate half-life
    const halfLife = StatisticalAnalysis.calculateHalfLife(residuals)

    // Determine cointegration
    const cointegrationCriticalValues = {
      "1%": -3.9,
      "5%": -3.34,
      "10%": -3.04,
    }

    const isCointegrated = adfTest.testStatistic < cointegrationCriticalValues["5%"]

    let pValue = 0.5
    if (adfTest.testStatistic < cointegrationCriticalValues["1%"]) pValue = 0.01
    else if (adfTest.testStatistic < cointegrationCriticalValues["5%"]) pValue = 0.05
    else if (adfTest.testStatistic < cointegrationCriticalValues["10%"]) pValue = 0.1

    console.log(`📊 ADF Test Statistic: ${adfTest.testStatistic.toFixed(4)}`)
    console.log(`📊 P-Value: ${pValue.toFixed(4)}`)
    console.log(`📊 Half-Life: ${halfLife < 100 ? halfLife.toFixed(1) + " days" : "Very Long"}`)
    console.log(`📊 Cointegrated: ${isCointegrated ? "✅ YES" : "❌ NO"}`)

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
  }
}

// Z-Score calculation engine
class ZScoreCalculator {
  static calculateSpread(series1, series2, hedgeRatio, method = "log") {
    if (method === "log") {
      return series1.map((price1, i) => Math.log(price1) - hedgeRatio * Math.log(series2[i]))
    } else {
      return series1.map((price1, i) => price1 - hedgeRatio * series2[i])
    }
  }

  static calculateRollingZScore(spread, window) {
    const results = []

    for (let i = window - 1; i < spread.length; i++) {
      const windowData = spread.slice(i - window + 1, i + 1)
      const mean = windowData.reduce((sum, val) => sum + val, 0) / window
      const stdDev = StatisticalAnalysis.standardDeviation(windowData)
      const zscore = StatisticalAnalysis.zScore(spread[i], mean, stdDev)

      results.push({
        zscore,
        mean,
        stdDev,
        spread: spread[i],
        isSignificant: Math.abs(zscore) > 2.0,
      })
    }

    return results
  }
}

// Main analysis function
async function runEnhancedAnalysis() {
  try {
    console.log("📥 Loading market data...")

    // Load data from URLs
    const btcData = await DataProcessor.fetchData(
      "https://bldx9rnrswf4s3au.public.blob.vercel-storage.com/BTCUSDT_d-bWeIhnyBdCx9Fcjk9U3Fk0g8aLfNzW.csv",
    )
    const xrpData = await DataProcessor.fetchData(
      "https://bldx9rnrswf4s3au.public.blob.vercel-storage.com/XRPUSDT_d-VsnkwUhaJ26AQ7ritnKoJEq5YaJTVD.csv",
    )

    console.log("✅ Data loaded successfully!")

    // Parse CSV data
    const btcParsed = DataProcessor.parseCSV(btcData)
    const xrpParsed = DataProcessor.parseCSV(xrpData)

    console.log(`📊 BTC data: ${btcParsed.data.length} rows`)
    console.log(`📊 XRP data: ${xrpParsed.data.length} rows`)

    // Detect columns
    const btcColumns = DataProcessor.detectColumns(btcParsed)
    const xrpColumns = DataProcessor.detectColumns(xrpParsed)

    console.log(`📋 BTC columns: date='${btcColumns.dateColumn}', price='${btcColumns.priceColumn}'`)
    console.log(`📋 XRP columns: date='${xrpColumns.dateColumn}', price='${xrpColumns.priceColumn}'`)

    // Extract prices
    const btcPrices = DataProcessor.extractPrices(btcParsed.data, btcColumns.priceColumn)
    const xrpPrices = DataProcessor.extractPrices(xrpParsed.data, xrpColumns.priceColumn)

    // Align data
    const minLength = Math.min(btcPrices.length, xrpPrices.length)
    const btcPricesTrimmed = btcPrices.slice(0, minLength)
    const xrpPricesTrimmed = xrpPrices.slice(0, minLength)

    console.log(`📊 Aligned data: ${minLength} observations`)

    // REAL COINTEGRATION TESTING
    const cointegrationResult = CointegrationTester.performEngleGrangerTest(btcPricesTrimmed, xrpPricesTrimmed)

    // REAL Z-SCORE CALCULATION
    console.log("\n🎯 Calculating spread and z-scores...")
    const spread = ZScoreCalculator.calculateSpread(
      btcPricesTrimmed,
      xrpPricesTrimmed,
      cointegrationResult.hedgeRatio,
      "log",
    )
    const zscoreResults = ZScoreCalculator.calculateRollingZScore(spread, 30)

    // Calculate returns for correlation analysis
    const btcReturns = DataProcessor.calculateReturns(btcPricesTrimmed)
    const xrpReturns = DataProcessor.calculateReturns(xrpPricesTrimmed)

    // Overall correlation
    const overallCorrelation = StatisticalAnalysis.correlation(btcReturns, xrpReturns)

    // Rolling correlation
    const rollingCorrelations = StatisticalAnalysis.rollingWindow(btcReturns, 30, (window) => {
      const xrpWindow = xrpReturns.slice(btcReturns.indexOf(window[0]), btcReturns.indexOf(window[0]) + window.length)
      return StatisticalAnalysis.correlation(window, xrpWindow)
    })

    // Regime analysis
    const highCorrCount = rollingCorrelations.filter((c) => c > 0.7).length
    const lowCorrCount = rollingCorrelations.filter((c) => c < 0.3).length
    const transitionCount = rollingCorrelations.length - highCorrCount - lowCorrCount

    // Trading opportunities
    const tradingOpportunities = zscoreResults.filter((result) => result.isSignificant).length

    // Generate comprehensive report
    console.log("\n" + "=".repeat(60))
    console.log("📈 COMPREHENSIVE ANALYSIS RESULTS")
    console.log("=".repeat(60))

    console.log("\n📊 DATA OVERVIEW:")
    console.log(`Total observations: ${minLength}`)
    console.log(
      `BTC price range: $${Math.min(...btcPricesTrimmed).toFixed(2)} - $${Math.max(...btcPricesTrimmed).toFixed(2)}`,
    )
    console.log(
      `XRP price range: $${Math.min(...xrpPricesTrimmed).toFixed(6)} - $${Math.max(...xrpPricesTrimmed).toFixed(6)}`,
    )

    console.log("\n🔗 COINTEGRATION ANALYSIS:")
    console.log(`Cointegrated: ${cointegrationResult.isCointegrated ? "✅ YES" : "❌ NO"}`)
    console.log(`P-Value: ${cointegrationResult.pValue.toFixed(4)}`)
    console.log(`Hedge Ratio: ${cointegrationResult.hedgeRatio.toFixed(4)}`)
    console.log(`R-Squared: ${cointegrationResult.rSquared.toFixed(4)}`)
    console.log(
      `Half-Life: ${cointegrationResult.halfLife < 100 ? cointegrationResult.halfLife.toFixed(1) + " days" : "Very Long"}`,
    )

    console.log("\n📊 CORRELATION ANALYSIS:")
    console.log(`Overall correlation: ${overallCorrelation.toFixed(3)}`)
    console.log(
      `High correlation periods (>0.7): ${highCorrCount} (${((highCorrCount / rollingCorrelations.length) * 100).toFixed(1)}%)`,
    )
    console.log(
      `Low correlation periods (<0.3): ${lowCorrCount} (${((lowCorrCount / rollingCorrelations.length) * 100).toFixed(1)}%)`,
    )
    console.log(
      `Transition periods: ${transitionCount} (${((transitionCount / rollingCorrelations.length) * 100).toFixed(1)}%)`,
    )

    console.log("\n💼 TRADING OPPORTUNITIES:")
    console.log(`Significant z-score signals: ${tradingOpportunities}`)
    console.log(`Signal frequency: ${((tradingOpportunities / zscoreResults.length) * 100).toFixed(1)}% of days`)

    console.log("\n🚀 STRATEGY RECOMMENDATION:")
    if (cointegrationResult.isCointegrated) {
      if (highCorrCount > lowCorrCount && highCorrCount > transitionCount) {
        console.log("✅ COINTEGRATED PAIR - Focus on MEAN REVERSION strategy")
        console.log("   High correlation dominant - Use z-score thresholds ±2.5")
      } else if (lowCorrCount > highCorrCount && lowCorrCount > transitionCount) {
        console.log("✅ COINTEGRATED PAIR - Focus on MOMENTUM strategy")
        console.log("   Low correlation dominant - Use trend-following signals")
      } else {
        console.log("✅ COINTEGRATED PAIR - Use ADAPTIVE strategy")
        console.log("   Mixed regimes - Switch between mean reversion and momentum")
      }
    } else {
      console.log("⚠️ WEAK COINTEGRATION - Consider:")
      console.log("   • Shorter timeframes")
      console.log("   • Alternative pairs")
      console.log("   • Momentum-only strategies")
    }

    console.log("\n✅ Enhanced analysis complete!")
    console.log("Ready for strategy implementation and backtesting! 🎯")

    return {
      dataPoints: minLength,
      cointegration: cointegrationResult,
      correlation: overallCorrelation,
      regimeDistribution: {
        highCorrelation: (highCorrCount / rollingCorrelations.length) * 100,
        lowCorrelation: (lowCorrCount / rollingCorrelations.length) * 100,
        transition: (transitionCount / rollingCorrelations.length) * 100,
      },
      tradingOpportunities,
      recommendation: cointegrationResult.isCointegrated ? "SUITABLE_FOR_TRADING" : "WEAK_COINTEGRATION",
    }
  } catch (error) {
    console.error("❌ Error during enhanced analysis:", error.message)
    throw error
  }
}

// Execute the enhanced analysis
runEnhancedAnalysis()
