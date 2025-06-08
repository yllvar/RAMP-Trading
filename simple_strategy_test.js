// Simple pairs trading strategy test
console.log("🎯 SIMPLE PAIRS STRATEGY TEST")
console.log("=".repeat(40))

// Simulate some basic strategy logic
function simulateStrategy() {
  console.log("📊 Simulating regime-adaptive pairs strategy...")

  // Mock data for demonstration
  const mockData = {
    correlations: [0.8, 0.75, 0.6, 0.3, 0.2, 0.4, 0.7, 0.85],
    spreads: [2.1, 1.8, 0.5, -2.3, -3.1, -1.2, 0.8, 2.5],
    returns: [],
  }

  let portfolio = 100000 // Start with $100k
  let trades = 0
  let wins = 0

  console.log(`\n💰 Starting portfolio: $${portfolio.toLocaleString()}`)

  for (let i = 0; i < mockData.correlations.length; i++) {
    const correlation = mockData.correlations[i]
    const spread = mockData.spreads[i]

    // Determine regime
    let regime
    if (correlation > 0.7) {
      regime = "High Correlation"
    } else if (correlation < 0.3) {
      regime = "Low Correlation"
    } else {
      regime = "Transition"
    }

    // Trading logic
    let action = "Hold"
    let returnPct = 0

    if (regime === "High Correlation" && Math.abs(spread) > 2.0) {
      // Mean reversion trade
      action = spread > 0 ? "Short BTC, Long XRP" : "Long BTC, Short XRP"
      returnPct = -spread * 0.3 // Simulate mean reversion
      trades++
      if (returnPct > 0) wins++
    } else if (regime === "Low Correlation" && Math.abs(spread) > 1.5) {
      // Momentum trade
      action = spread > 0 ? "Long BTC, Short XRP" : "Short BTC, Long XRP"
      returnPct = spread * 0.2 // Simulate momentum
      trades++
      if (returnPct > 0) wins++
    }

    const dollarReturn = portfolio * (returnPct / 100)
    portfolio += dollarReturn

    console.log(`\nDay ${i + 1}:`)
    console.log(`  Regime: ${regime}`)
    console.log(`  Correlation: ${correlation.toFixed(2)}`)
    console.log(`  Spread Z-Score: ${spread.toFixed(1)}`)
    console.log(`  Action: ${action}`)
    if (returnPct !== 0) {
      console.log(`  Return: ${returnPct.toFixed(2)}% ($${dollarReturn.toFixed(0)})`)
    }
    console.log(`  Portfolio: $${portfolio.toLocaleString()}`)
  }

  const totalReturn = ((portfolio - 100000) / 100000) * 100
  const winRate = trades > 0 ? (wins / trades) * 100 : 0

  console.log("\n" + "=".repeat(40))
  console.log("📈 STRATEGY RESULTS:")
  console.log("=".repeat(40))
  console.log(`Final Portfolio: $${portfolio.toLocaleString()}`)
  console.log(`Total Return: ${totalReturn.toFixed(2)}%`)
  console.log(`Total Trades: ${trades}`)
  console.log(`Win Rate: ${winRate.toFixed(1)}%`)
  console.log(`Wins: ${wins}, Losses: ${trades - wins}`)

  if (totalReturn > 0) {
    console.log("✅ Strategy shows positive results!")
  } else {
    console.log("⚠️ Strategy needs optimization")
  }

  console.log("\n🎯 This is a simplified simulation.")
  console.log("Real strategy would use actual market data and more sophisticated logic.")
}

// Run the simulation
simulateStrategy()
