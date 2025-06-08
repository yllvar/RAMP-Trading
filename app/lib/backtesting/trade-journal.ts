import type { Trade } from "./types"

/**
 * Trade journal for detailed trade analysis and record keeping
 */
export class TradeJournal {
  private trades: Trade[] = []

  /**
   * Add trade to journal
   */
  addTrade(trade: Trade): void {
    this.trades.push({ ...trade })
  }

  /**
   * Get all trades
   */
  getAllTrades(): Trade[] {
    return [...this.trades]
  }

  /**
   * Get trades by regime
   */
  getTradesByRegime(regime: string): Trade[] {
    return this.trades.filter((trade) => trade.regime === regime)
  }

  /**
   * Get trades by strategy type
   */
  getTradesByStrategy(strategy: "mean_reversion" | "momentum" | "transition"): Trade[] {
    return this.trades.filter((trade) => trade.strategy === strategy)
  }

  /**
   * Get winning trades
   */
  getWinningTrades(): Trade[] {
    return this.trades.filter((trade) => trade.pnlDollar > 0)
  }

  /**
   * Get losing trades
   */
  getLosingTrades(): Trade[] {
    return this.trades.filter((trade) => trade.pnlDollar <= 0)
  }

  /**
   * Get trades by date range
   */
  getTradesByDateRange(startDate: Date, endDate: Date): Trade[] {
    return this.trades.filter((trade) => trade.entryDate >= startDate && trade.entryDate <= endDate)
  }

  /**
   * Analyze trade patterns
   */
  analyzeTradePatterns(): {
    bestPerformingRegime: string
    worstPerformingRegime: string
    mostProfitableStrategy: string
    avgHoldingTimeByRegime: { [regime: string]: number }
    winRateByStrategy: { [strategy: string]: number }
    profitFactorByRegime: { [regime: string]: number }
  } {
    const regimes = ["high-correlation", "low-correlation", "transition"]
    const strategies = ["mean_reversion", "momentum", "transition"]

    // Calculate performance by regime
    const regimePerformance: { [regime: string]: number } = {}
    const avgHoldingTimeByRegime: { [regime: string]: number } = {}
    const profitFactorByRegime: { [regime: string]: number } = {}

    for (const regime of regimes) {
      const regimeTrades = this.getTradesByRegime(regime)
      if (regimeTrades.length > 0) {
        const totalPnl = regimeTrades.reduce((sum, trade) => sum + trade.pnlDollar, 0)
        regimePerformance[regime] = totalPnl / regimeTrades.length

        avgHoldingTimeByRegime[regime] =
          regimeTrades.reduce((sum, trade) => sum + trade.holdingPeriod, 0) / regimeTrades.length

        const wins = regimeTrades.filter((t) => t.pnlDollar > 0)
        const losses = regimeTrades.filter((t) => t.pnlDollar <= 0)
        const totalWins = wins.reduce((sum, t) => sum + t.pnlDollar, 0)
        const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnlDollar, 0))

        profitFactorByRegime[regime] = totalLosses > 0 ? totalWins / totalLosses : 0
      }
    }

    // Calculate win rate by strategy
    const winRateByStrategy: { [strategy: string]: number } = {}
    for (const strategy of strategies) {
      const strategyTrades = this.getTradesByStrategy(strategy)
      if (strategyTrades.length > 0) {
        const wins = strategyTrades.filter((trade) => trade.pnlDollar > 0).length
        winRateByStrategy[strategy] = (wins / strategyTrades.length) * 100
      }
    }

    // Find best and worst performing regimes
    const bestPerformingRegime = Object.keys(regimePerformance).reduce(
      (a, b) => (regimePerformance[a] > regimePerformance[b] ? a : b),
      regimes[0],
    )

    const worstPerformingRegime = Object.keys(regimePerformance).reduce(
      (a, b) => (regimePerformance[a] < regimePerformance[b] ? a : b),
      regimes[0],
    )

    // Find most profitable strategy
    const mostProfitableStrategy = Object.keys(winRateByStrategy).reduce(
      (a, b) => (winRateByStrategy[a] > winRateByStrategy[b] ? a : b),
      strategies[0],
    )

    return {
      bestPerformingRegime,
      worstPerformingRegime,
      mostProfitableStrategy,
      avgHoldingTimeByRegime,
      winRateByStrategy,
      profitFactorByRegime,
    }
  }

  /**
   * Generate trade summary statistics
   */
  generateSummaryStats(): {
    totalTrades: number
    totalPnl: number
    avgPnl: number
    winRate: number
    profitFactor: number
    avgHoldingPeriod: number
    largestWin: number
    largestLoss: number
    consecutiveWins: number
    consecutiveLosses: number
    avgWin: number
    avgLoss: number
  } {
    if (this.trades.length === 0) {
      return {
        totalTrades: 0,
        totalPnl: 0,
        avgPnl: 0,
        winRate: 0,
        profitFactor: 0,
        avgHoldingPeriod: 0,
        largestWin: 0,
        largestLoss: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        avgWin: 0,
        avgLoss: 0,
      }
    }

    const totalPnl = this.trades.reduce((sum, trade) => sum + trade.pnlDollar, 0)
    const avgPnl = totalPnl / this.trades.length

    const winningTrades = this.getWinningTrades()
    const losingTrades = this.getLosingTrades()

    const winRate = (winningTrades.length / this.trades.length) * 100

    const totalWins = winningTrades.reduce((sum, trade) => sum + trade.pnlDollar, 0)
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnlDollar, 0))
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0

    const avgHoldingPeriod = this.trades.reduce((sum, trade) => sum + trade.holdingPeriod, 0) / this.trades.length

    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map((trade) => trade.pnlDollar)) : 0

    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map((trade) => trade.pnlDollar)) : 0

    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0

    // Calculate consecutive wins/losses
    let consecutiveWins = 0
    let consecutiveLosses = 0
    let currentWinStreak = 0
    let currentLossStreak = 0

    for (const trade of this.trades) {
      if (trade.pnlDollar > 0) {
        currentWinStreak++
        currentLossStreak = 0
        consecutiveWins = Math.max(consecutiveWins, currentWinStreak)
      } else {
        currentLossStreak++
        currentWinStreak = 0
        consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak)
      }
    }

    return {
      totalTrades: this.trades.length,
      totalPnl,
      avgPnl,
      winRate,
      profitFactor,
      avgHoldingPeriod,
      largestWin,
      largestLoss,
      consecutiveWins,
      consecutiveLosses,
      avgWin,
      avgLoss,
    }
  }

  /**
   * Export trades to CSV format
   */
  exportToCSV(): string {
    const headers = [
      "Trade ID",
      "Entry Date",
      "Exit Date",
      "Regime",
      "Strategy",
      "Entry BTC Price",
      "Entry XRP Price",
      "Exit BTC Price",
      "Exit XRP Price",
      "BTC Amount",
      "XRP Amount",
      "Leverage",
      "Capital Allocated",
      "P&L Dollar",
      "P&L Percent",
      "Holding Period",
      "Entry Reason",
      "Exit Reason",
      "Entry Z-Score",
      "Signal Strength",
      "Commission",
      "Slippage",
    ]

    const rows = this.trades.map((trade) => [
      trade.id,
      trade.entryDate.toISOString().split("T")[0],
      trade.exitDate?.toISOString().split("T")[0] || "",
      trade.regime,
      trade.strategy,
      trade.entryBtcPrice.toFixed(2),
      trade.entryXrpPrice.toFixed(6),
      trade.exitBtcPrice?.toFixed(2) || "",
      trade.exitXrpPrice?.toFixed(6) || "",
      trade.btcAmount.toFixed(6),
      trade.xrpAmount.toFixed(2),
      trade.leverage.toFixed(2),
      trade.capitalAllocated.toFixed(2),
      trade.pnlDollar.toFixed(2),
      (trade.pnlPercent * 100).toFixed(2),
      trade.holdingPeriod.toFixed(1),
      trade.entryReason,
      trade.exitReason || "",
      trade.entryZscore.toFixed(3),
      trade.entrySignalStrength.toFixed(3),
      trade.totalCommission.toFixed(2),
      trade.totalSlippage.toFixed(2),
    ])

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
  }

  /**
   * Clear all trades
   */
  clear(): void {
    this.trades = []
  }

  /**
   * Get trade statistics by month
   */
  getMonthlyStats(): Array<{
    month: string
    trades: number
    pnl: number
    winRate: number
    avgHoldingPeriod: number
  }> {
    const monthlyStats = new Map<
      string,
      {
        trades: Trade[]
        pnl: number
      }
    >()

    for (const trade of this.trades) {
      const monthKey = `${trade.entryDate.getFullYear()}-${String(trade.entryDate.getMonth() + 1).padStart(2, "0")}`

      if (!monthlyStats.has(monthKey)) {
        monthlyStats.set(monthKey, { trades: [], pnl: 0 })
      }

      const monthData = monthlyStats.get(monthKey)!
      monthData.trades.push(trade)
      monthData.pnl += trade.pnlDollar
    }

    return Array.from(monthlyStats.entries())
      .map(([month, data]) => ({
        month,
        trades: data.trades.length,
        pnl: data.pnl,
        winRate: (data.trades.filter((t) => t.pnlDollar > 0).length / data.trades.length) * 100,
        avgHoldingPeriod: data.trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / data.trades.length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }
}
