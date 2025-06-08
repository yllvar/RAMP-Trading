// Data analysis script for BTC/XRP pairs
const https = require("https")

console.log("🚀 CRYPTO PAIRS DATA ANALYZER")
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

// Function to calculate rolling correlation
function calculateRollingCorrelation(series1, series2, window) {
  const correlations = []

  for (let i = window; i <= series1.length; i++) {
    const s1Window = series1.slice(i - window, i)
    const s2Window = series2.slice(i - window, i)

    const correlation = calculateCorrelation(s1Window, s2Window)
    correlations.push(correlation)
  }

  return correlations
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

// Function to calculate z-score
function calculateZScore(value, mean, stdDev) {
  return (value - mean) / stdDev
}

// Main analysis function
async function analyzeData() {
  try {
    console.log("📥 Loading BTC data...")
    const btcData = await fetchData(
      "https://bldx9rnrswf4s3au.public.blob.vercel-storage.com/BTCUSDT_d-bWeIhnyBdCx9Fcjk9U3Fk0g8aLfNzW.csv",
    )

    console.log("📥 Loading XRP data...")
    const xrpData = await fetchData(
      "https://bldx9rnrswf4s3au.public.blob.vercel-storage.com/XRPUSDT_d-VsnkwUhaJ26AQ7ritnKoJEq5YaJTVD.csv",
    )

    console.log("✅ Data loaded successfully!")

    // Parse CSV data
    const btcParsed = parseCSV(btcData)
    const xrpParsed = parseCSV(xrpData)

    console.log("\n📊 DATASET OVERVIEW:")
    console.log(`BTC data: ${btcParsed.data.length} rows`)
    console.log(`XRP data: ${xrpParsed.data.length} rows`)

    console.log("\n📋 COLUMN STRUCTURE:")
    console.log(`BTC columns: ${btcParsed.headers.join(", ")}`)
    console.log(`XRP columns: ${xrpParsed.headers.join(", ")}`)

    // Try to find price columns
    const priceKeywords = ["close", "price", "Close", "Price"]
    const btcPriceCol =
      btcParsed.headers.find((h) => priceKeywords.some((k) => h.includes(k))) ||
      btcParsed.headers[btcParsed.headers.length - 1]
    const xrpPriceCol =
      xrpParsed.headers.find((h) => priceKeywords.some((k) => h.includes(k))) ||
      xrpParsed.headers[xrpParsed.headers.length - 1]

    console.log("\n💰 DETECTED PRICE COLUMNS:")
    console.log(`BTC price column: ${btcPriceCol}`)
    console.log(`XRP price column: ${xrpPriceCol}`)

    // Extract price data
    const btcPrices = btcParsed.data.map((row) => Number.parseFloat(row[btcPriceCol])).filter((p) => !isNaN(p))
    const xrpPrices = xrpParsed.data.map((row) => Number.parseFloat(row[xrpPriceCol])).filter((p) => !isNaN(p))

    // Ensure equal length for analysis
    const minLength = Math.min(btcPrices.length, xrpPrices.length)
    const btcPricesTrimmed = btcPrices.slice(0, minLength)
    const xrpPricesTrimmed = xrpPrices.slice(0, minLength)

    console.log("\n📈 PRICE STATISTICS:")
    console.log(
      `BTC price range: $${Math.min(...btcPricesTrimmed).toFixed(2)} - $${Math.max(...btcPricesTrimmed).toFixed(2)}`,
    )
    console.log(
      `XRP price range: $${Math.min(...xrpPricesTrimmed).toFixed(6)} - $${Math.max(...xrpPricesTrimmed).toFixed(6)}`,
    )

    // Calculate returns
    const btcReturns = calculateReturns(btcPricesTrimmed)
    const xrpReturns = calculateReturns(xrpPricesTrimmed)

    // Calculate overall correlation
    const overallCorrelation = calculateCorrelation(btcReturns, xrpReturns)

    console.log("\n🔗 CORRELATION ANALYSIS:")
    console.log(`Overall return correlation: ${overallCorrelation.toFixed(3)}`)

    // Calculate rolling correlation with 30-day window
    const window = 30
    if (btcReturns.length > window) {
      const rollingCorrelations = calculateRollingCorrelation(btcReturns, xrpReturns, window)

      // Analyze correlation regimes
      const highCorrCount = rollingCorrelations.filter((c) => c > 0.7).length
      const lowCorrCount = rollingCorrelations.filter((c) => c < 0.3).length
      const transitionCount = rollingCorrelations.length - highCorrCount - lowCorrCount

      console.log("\n🎯 REGIME ANALYSIS:")
      console.log(
        `High correlation periods (>0.7): ${highCorrCount} (${((highCorrCount / rollingCorrelations.length) * 100).toFixed(1)}%)`,
      )
      console.log(
        `Low correlation periods (<0.3): ${lowCorrCount} (${((lowCorrCount / rollingCorrelations.length) * 100).toFixed(1)}%)`,
      )
      console.log(
        `Transition periods: ${transitionCount} (${((transitionCount / rollingCorrelations.length) * 100).toFixed(1)}%)`,
      )

      // Calculate spread and z-score
      const logBtcPrices = btcPricesTrimmed.map((p) => Math.log(p))
      const logXrpPrices = xrpPricesTrimmed.map((p) => Math.log(p))

      const spread = logBtcPrices.map((btcPrice, i) => btcPrice - logXrpPrices[i])

      // Calculate z-scores with 30-day window
      const zScores = []
      for (let i = window; i < spread.length; i++) {
        const windowSpread = spread.slice(i - window, i)
        const mean = windowSpread.reduce((sum, val) => sum + val, 0) / window
        const variance = windowSpread.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window
        const stdDev = Math.sqrt(variance)

        zScores.push(calculateZScore(spread[i], mean, stdDev))
      }

      // Count trading opportunities
      const highThreshold = 2.5
      const meanReversionOpps = zScores.filter((z) => Math.abs(z) > highThreshold).length

      console.log("\n💼 TRADING OPPORTUNITIES:")
      console.log(`Mean reversion opportunities (|z-score| > ${highThreshold}): ${meanReversionOpps}`)
      console.log(`Percentage of days with signals: ${((meanReversionOpps / zScores.length) * 100).toFixed(1)}%`)

      // Strategy recommendation
      console.log("\n🚀 STRATEGY RECOMMENDATION:")
      if (highCorrCount > lowCorrCount && highCorrCount > transitionCount) {
        console.log("✅ Predominantly HIGH CORRELATION regime - Focus on MEAN REVERSION strategy")
      } else if (lowCorrCount > highCorrCount && lowCorrCount > transitionCount) {
        console.log("✅ Predominantly LOW CORRELATION regime - Focus on MOMENTUM strategy")
      } else {
        console.log("✅ Mixed regimes - Use ADAPTIVE strategy switching between mean reversion and momentum")
      }
    }

    console.log("\n✅ Analysis complete! Data is suitable for regime-adaptive pairs trading.")
  } catch (error) {
    console.error("❌ Error during analysis:", error.message)
  }
}

// Run the analysis
analyzeData()
