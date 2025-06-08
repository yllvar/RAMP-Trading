/**
 * Trading execution engine for live trading
 */
import {
  type ExchangeConnector,
  ExchangeConnectorFactory,
  type OrderStatus,
  type MarketDataUpdate,
  type TradeUpdate,
  type BalanceUpdate,
} from "./exchange-connector"
import { SignalGenerator } from "../strategy-engine/signal-generator"
import { PositionSizer } from "../strategy-engine/position-sizer"
import { CointegrationTester } from "../strategy-engine/cointegration"
import { ZScoreCalculator } from "../strategy-engine/zscore-calculator"
import { StatisticalUtils } from "../utils/statistics"
import { EventEmitter } from "events"

export interface TradingEngineConfig {
  exchange: string
  apiKey?: string
  apiSecret?: string
  testMode?: boolean
  symbols: string[]
  baseCurrency: string
  quoteCurrency: string
  initialCapital: number
  maxPositions: number
  maxLeverage: number
  riskPerTrade: number
  correlationWindow: number
  highCorrelationThreshold: number
  lowCorrelationThreshold: number
  zscoreEntryThreshold: number
  zscoreExitThreshold: number
  stopLossPercentage: number
  takeProfitPercentage: number
  rebalanceInterval: number // in milliseconds
}

export interface Position {
  id: string
  symbol: string
  side: "long" | "short"
  entryPrice: number
  amount: number
  leverage: number
  entryTime: number
  exitPrice?: number
  exitTime?: number
  pnl?: number
  status: "open" | "closed"
  orders: OrderStatus[]
}

export interface PortfolioState {
  totalValue: number
  availableCash: number
  positions: Position[]
  balances: { [asset: string]: number }
  pnl: number
  returns: number[]
}

export interface MarketState {
  lastPrice: { [symbol: string]: number }
  bidPrice: { [symbol: string]: number }
  askPrice: { [symbol: string]: number }
  volume24h: { [symbol: string]: number }
  correlation: number
  zscore: number
  regime: "high-correlation" | "low-correlation" | "transition"
  volatility: number
  timestamp: number
}

export interface TradingEngineStatus {
  isRunning: boolean
  isConnected: boolean
  lastError?: string
  lastSignal?: any
  portfolio: PortfolioState
  market: MarketState
}

/**
 * Trading engine for live trading
 */
export class TradingEngine extends EventEmitter {
  private config: TradingEngineConfig
  private connector?: ExchangeConnector
  private signalGenerator: SignalGenerator
  private positionSizer: PositionSizer

  private isRunning = false
  private isConnected = false
  private lastError?: string

  private portfolio: PortfolioState
  private market: MarketState

  private priceHistory: { [symbol: string]: number[] } = {}
  private returnHistory: { [symbol: string]: number[] } = {}

  private rebalanceTimer?: NodeJS.Timeout

  constructor(config: TradingEngineConfig) {
    super()
    this.config = config

    // Initialize signal generator and position sizer
    this.signalGenerator = new SignalGenerator({
      correlationWindow: config.correlationWindow,
      highCorrelationThreshold: config.highCorrelationThreshold,
      lowCorrelationThreshold: config.lowCorrelationThreshold,
      zscoreEntryThreshold: config.zscoreEntryThreshold,
      zscoreExitThreshold: config.zscoreExitThreshold,
      stopLossZscore: config.stopLossPercentage * 2, // Approximate conversion
      basePositionSize: config.riskPerTrade,
      maxPositionSize: 0.5, // 50% max allocation per position
      kellyMultiplier: 0.5,
      meanReversionLeverage: Math.min(2.0, config.maxLeverage),
      momentumLeverage: Math.min(3.0, config.maxLeverage),
      transitionLeverage: 1.0,
      maxDrawdown: 15.0,
      correlationBreakdownThreshold: 0.1,
      volatilityScaling: true,
    })

    this.positionSizer = new PositionSizer(
      {
        maxPositionSize: 0.5,
        maxLeverage: config.maxLeverage,
        stopLossThreshold: config.stopLossPercentage / 100,
        maxDrawdown: 15.0,
        correlationThreshold: 0.3,
        volatilityThreshold: 0.5,
      },
      this.signalGenerator.getParameters(),
    )

    // Initialize portfolio state
    this.portfolio = {
      totalValue: config.initialCapital,
      availableCash: config.initialCapital,
      positions: [],
      balances: { [config.baseCurrency]: config.initialCapital },
      pnl: 0,
      returns: [],
    }

    // Initialize market state
    this.market = {
      lastPrice: {},
      bidPrice: {},
      askPrice: {},
      volume24h: {},
      correlation: 0,
      zscore: 0,
      regime: "transition",
      volatility: 0,
      timestamp: Date.now(),
    }

    // Initialize price history
    config.symbols.forEach((symbol) => {
      this.priceHistory[symbol] = []
      this.returnHistory[symbol] = []
      this.market.lastPrice[symbol] = 0
      this.market.bidPrice[symbol] = 0
      this.market.askPrice[symbol] = 0
      this.market.volume24h[symbol] = 0
    })
  }

  /**
   * Start trading engine
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log("Trading engine already running")
      return true
    }

    try {
      // Create exchange connector
      this.connector = ExchangeConnectorFactory.createConnector(this.config.exchange, {
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
        testMode: this.config.testMode,
      })

      // Connect to exchange
      this.isConnected = await this.connector.connect()

      if (!this.isConnected) {
        this.lastError = "Failed to connect to exchange"
        return false
      }

      // Subscribe to market data for all symbols
      for (const symbol of this.config.symbols) {
        await this.connector.subscribeMarketData(symbol, this.handleMarketData.bind(this))
        await this.connector.subscribeTrades(symbol, this.handleTradeUpdate.bind(this))
      }

      // Subscribe to user data if API credentials provided
      if (this.config.apiKey && this.config.apiSecret) {
        await this.connector.subscribeUserData(this.handleUserData.bind(this))

        // Get initial balances
        const balances = await this.connector.getBalances()
        this.updateBalances(balances)
      }

      // Load historical data for initial analysis
      await this.loadHistoricalData()

      // Start rebalance timer
      this.startRebalanceTimer()

      this.isRunning = true
      this.emit("started")

      console.log("Trading engine started")
      return true
    } catch (error) {
      this.lastError = `Failed to start trading engine: ${error instanceof Error ? error.message : "Unknown error"}`
      console.error(this.lastError)
      return false
    }
  }

  /**
   * Stop trading engine
   */
  async stop(): Promise<boolean> {
    if (!this.isRunning) {
      console.log("Trading engine not running")
      return true
    }

    try {
      // Stop rebalance timer
      this.stopRebalanceTimer()

      // Disconnect from exchange
      if (this.connector && this.isConnected) {
        await this.connector.disconnect()
      }

      this.isRunning = false
      this.isConnected = false
      this.emit("stopped")

      console.log("Trading engine stopped")
      return true
    } catch (error) {
      this.lastError = `Failed to stop trading engine: ${error instanceof Error ? error.message : "Unknown error"}`
      console.error(this.lastError)
      return false
    }
  }

  /**
   * Get trading engine status
   */
  getStatus(): TradingEngineStatus {
    return {
      isRunning: this.isRunning,
      isConnected: this.isConnected,
      lastError: this.lastError,
      portfolio: this.portfolio,
      market: this.market,
    }
  }

  /**
   * Handle market data update
   */
  private handleMarketData(data: MarketDataUpdate): void {
    // Update market state
    this.market.lastPrice[data.symbol] = data.price
    this.market.bidPrice[data.symbol] = data.bidPrice || data.price
    this.market.askPrice[data.symbol] = data.askPrice || data.price
    this.market.volume24h[data.symbol] = data.volume
    this.market.timestamp = data.timestamp

    // Update price history
    if (this.priceHistory[data.symbol]) {
      this.priceHistory[data.symbol].push(data.price)

      // Keep history limited to window size * 2
      if (this.priceHistory[data.symbol].length > this.config.correlationWindow * 2) {
        this.priceHistory[data.symbol].shift()
      }

      // Calculate returns if we have at least 2 prices
      if (this.priceHistory[data.symbol].length >= 2) {
        const prices = this.priceHistory[data.symbol]
        const returns = (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]

        this.returnHistory[data.symbol].push(returns)

        // Keep returns history limited
        if (this.returnHistory[data.symbol].length > this.config.correlationWindow * 2) {
          this.returnHistory[data.symbol].shift()
        }
      }
    }

    // Update portfolio value
    this.updatePortfolioValue()

    // Analyze market state
    this.analyzeMarketState()

    // Generate trading signals
    this.generateTradingSignals()

    // Emit market update event
    this.emit("marketUpdate", {
      symbol: data.symbol,
      price: data.price,
      market: this.market,
    })
  }

  /**
   * Handle trade update
   */
  private handleTradeUpdate(data: TradeUpdate): void {
    // Emit trade update event
    this.emit("tradeUpdate", data)
  }

  /**
   * Handle user data update
   */
  private handleUserData(data: OrderStatus | BalanceUpdate): void {
    if ("asset" in data) {
      // Balance update
      this.updateBalance(data)
    } else {
      // Order update
      this.updateOrder(data)
    }
  }

  /**
   * Update balance
   */
  private updateBalance(balance: BalanceUpdate): void {
    this.portfolio.balances[balance.asset] = balance.total
    this.updatePortfolioValue()

    // Emit balance update event
    this.emit("balanceUpdate", balance)
  }

  /**
   * Update balances
   */
  private updateBalances(balances: BalanceUpdate[]): void {
    balances.forEach((balance) => {
      this.portfolio.balances[balance.asset] = balance.total
    })

    this.updatePortfolioValue()

    // Emit balances update event
    this.emit("balancesUpdate", balances)
  }

  /**
   * Update order
   */
  private updateOrder(order: OrderStatus): void {
    // Find position for this order
    const position = this.portfolio.positions.find(
      (p) => p.symbol === order.symbol && p.status === "open" && p.orders.some((o) => o.id === order.id),
    )

    if (position) {
      // Update order in position
      const orderIndex = position.orders.findIndex((o) => o.id === order.id)
      if (orderIndex >= 0) {
        position.orders[orderIndex] = order
      } else {
        position.orders.push(order)
      }

      // Check if position is closed
      if (order.status === "filled" && order.side !== position.side.toLowerCase()) {
        position.status = "closed"
        position.exitPrice = order.price
        position.exitTime = order.timestamp

        // Calculate PnL
        if (position.side === "long") {
          position.pnl = (position.exitPrice! - position.entryPrice) * position.amount
        } else {
          position.pnl = (position.entryPrice - position.exitPrice!) * position.amount
        }

        // Update portfolio PnL
        this.portfolio.pnl += position.pnl

        // Emit position closed event
        this.emit("positionClosed", position)
      }
    }

    // Emit order update event
    this.emit("orderUpdate", order)
  }

  /**
   * Update portfolio value
   */
  private updatePortfolioValue(): void {
    let totalValue = 0

    // Add up all balances
    for (const [asset, balance] of Object.entries(this.portfolio.balances)) {
      if (asset === this.config.quoteCurrency) {
        totalValue += balance
      } else {
        // Convert to quote currency using latest price
        const symbol = `${asset}${this.config.quoteCurrency}`
        const price = this.market.lastPrice[symbol] || 0

        if (price > 0) {
          totalValue += balance * price
        }
      }
    }

    // Calculate return
    const previousValue = this.portfolio.totalValue
    if (previousValue > 0) {
      const returnPct = (totalValue - previousValue) / previousValue
      this.portfolio.returns.push(returnPct)

      // Keep returns history limited
      if (this.portfolio.returns.length > 1000) {
        this.portfolio.returns.shift()
      }
    }

    this.portfolio.totalValue = totalValue

    // Calculate available cash
    this.portfolio.availableCash = this.portfolio.balances[this.config.quoteCurrency] || 0

    // Emit portfolio update event
    this.emit("portfolioUpdate", this.portfolio)
  }

  /**
   * Analyze market state
   */
  private analyzeMarketState(): void {
    try {
      // Check if we have enough data
      const btcSymbol = `BTC${this.config.quoteCurrency}`
      const xrpSymbol = `XRP${this.config.quoteCurrency}`

      if (
        !this.priceHistory[btcSymbol] ||
        !this.priceHistory[xrpSymbol] ||
        this.priceHistory[btcSymbol].length < this.config.correlationWindow ||
        this.priceHistory[xrpSymbol].length < this.config.correlationWindow
      ) {
        return
      }

      // Get price data
      const btcPrices = this.priceHistory[btcSymbol].slice(-this.config.correlationWindow)
      const xrpPrices = this.priceHistory[xrpSymbol].slice(-this.config.correlationWindow)

      // Calculate correlation
      const btcReturns = this.returnHistory[btcSymbol].slice(-this.config.correlationWindow)
      const xrpReturns = this.returnHistory[xrpSymbol].slice(-this.config.correlationWindow)

      if (btcReturns.length >= this.config.correlationWindow && xrpReturns.length >= this.config.correlationWindow) {
        this.market.correlation = StatisticalUtils.correlation(btcReturns, xrpReturns)
      }

      // Detect regime
      if (this.market.correlation > this.config.highCorrelationThreshold) {
        this.market.regime = "high-correlation"
      } else if (this.market.correlation < this.config.lowCorrelationThreshold) {
        this.market.regime = "low-correlation"
      } else {
        this.market.regime = "transition"
      }

      // Calculate volatility
      if (btcReturns.length > 0) {
        this.market.volatility = StatisticalUtils.calculateVolatility(btcReturns)
      }

      // Test cointegration
      const cointegrationResult = CointegrationTester.performEngleGrangerTest(btcPrices, xrpPrices)

      // Calculate spread and z-score
      if (cointegrationResult.isCointegrated) {
        const spread = ZScoreCalculator.calculateSpread(btcPrices, xrpPrices, cointegrationResult.hedgeRatio, "log")

        const zscoreResults = ZScoreCalculator.calculateRollingZScore(spread, this.config.correlationWindow)

        if (zscoreResults.length > 0) {
          this.market.zscore = zscoreResults[zscoreResults.length - 1].zscore
        }
      }

      // Emit market state update event
      this.emit("marketStateUpdate", this.market)
    } catch (error) {
      console.error("Error analyzing market state:", error)
    }
  }

  /**
   * Generate trading signals
   */
  private generateTradingSignals(): void {
    try {
      // Check if we have enough data
      if (this.market.correlation === 0 || this.market.zscore === 0 || !this.isRunning || !this.isConnected) {
        return
      }

      // Create regime state
      const regime = {
        current: this.market.regime,
        confidence: 0.8,
        duration: 1,
        correlation: this.market.correlation,
        volatility: this.market.volatility,
        transitionProbability: {},
        volatilityRegime: this.market.volatility > 0.3 ? "high" : this.market.volatility > 0.15 ? "medium" : "low",
      }

      // Generate signal
      const signal = this.signalGenerator.generateSignal(
        this.market.zscore,
        regime,
        this.market.correlation,
        this.market.volatility,
        new Date(this.market.timestamp),
      )

      // Check if signal is actionable
      if (signal.type === "entry" && signal.direction !== "neutral") {
        // Check if we can open a new position
        if (this.portfolio.positions.filter((p) => p.status === "open").length >= this.config.maxPositions) {
          return
        }

        // Calculate position size
        const positionSize = this.positionSizer.calculateOptimalSize(signal, {
          totalCapital: this.portfolio.totalValue,
          availableCapital: this.portfolio.availableCash,
          positions: this.portfolio.positions,
          equity: [this.portfolio.totalValue],
          returns: this.portfolio.returns,
        })

        // Check if position size is valid
        if (positionSize.capitalAllocated < 100) {
          return
        }

        // Execute trade
        this.executeTrade(signal, positionSize)
      } else if (signal.type === "exit") {
        // Find open positions to close
        const openPositions = this.portfolio.positions.filter((p) => p.status === "open")

        for (const position of openPositions) {
          // Check exit conditions
          if (this.shouldExitPosition(position, signal)) {
            this.closePosition(position, "signal")
          }
        }
      }

      // Emit signal event
      this.emit("signal", signal)
    } catch (error) {
      console.error("Error generating trading signals:", error)
    }
  }

  /**
   * Execute trade
   */
  private async executeTrade(signal: any, positionSize: any): Promise<void> {
    if (!this.connector) {
      console.error("Exchange connector not initialized")
      return
    }

    try {
      // Determine symbols
      const btcSymbol = `BTC${this.config.quoteCurrency}`
      const xrpSymbol = `XRP${this.config.quoteCurrency}`

      // Determine trade direction
      let btcSide: "buy" | "sell"
      let xrpSide: "buy" | "sell"

      if (signal.direction === "long_btc_short_xrp") {
        btcSide = "buy"
        xrpSide = "sell"
      } else {
        btcSide = "sell"
        xrpSide = "buy"
      }

      // Calculate amounts
      const btcPrice = this.market.lastPrice[btcSymbol]
      const xrpPrice = this.market.lastPrice[xrpSymbol]

      const btcAmount = Math.abs(positionSize.btcAmount)
      const xrpAmount = Math.abs(positionSize.xrpAmount)

      // Place BTC order
      const btcOrder = await this.connector.placeOrder(btcSymbol, btcSide, "market", btcAmount)

      // Place XRP order
      const xrpOrder = await this.connector.placeOrder(xrpSymbol, xrpSide, "market", xrpAmount)

      // Create position
      const position: Position = {
        id: `pos_${Date.now()}`,
        symbol: `${btcSymbol}/${xrpSymbol}`,
        side: signal.direction === "long_btc_short_xrp" ? "long" : "short",
        entryPrice: btcPrice / xrpPrice, // Price ratio
        amount: btcAmount,
        leverage: positionSize.leverage,
        entryTime: Date.now(),
        status: "open",
        orders: [btcOrder, xrpOrder],
      }

      // Add position to portfolio
      this.portfolio.positions.push(position)

      // Emit position opened event
      this.emit("positionOpened", position)

      console.log(`Position opened: ${position.id}, ${position.side} ${position.symbol}`)
    } catch (error) {
      console.error("Error executing trade:", error)
      this.lastError = `Trade execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }

  /**
   * Check if position should be exited
   */
  private shouldExitPosition(position: Position, signal: any): boolean {
    // Exit on signal
    if (signal.type === "exit") {
      return true
    }

    // Check stop loss
    const btcSymbol = `BTC${this.config.quoteCurrency}`
    const xrpSymbol = `XRP${this.config.quoteCurrency}`

    const btcPrice = this.market.lastPrice[btcSymbol]
    const xrpPrice = this.market.lastPrice[xrpSymbol]

    const currentRatio = btcPrice / xrpPrice
    const priceDiff = (currentRatio - position.entryPrice) / position.entryPrice

    // Apply stop loss
    if (position.side === "long" && priceDiff < -this.config.stopLossPercentage / 100) {
      return true
    }

    if (position.side === "short" && priceDiff > this.config.stopLossPercentage / 100) {
      return true
    }

    // Apply take profit
    if (position.side === "long" && priceDiff > this.config.takeProfitPercentage / 100) {
      return true
    }

    if (position.side === "short" && priceDiff < -this.config.takeProfitPercentage / 100) {
      return true
    }

    return false
  }

  /**
   * Close position
   */
  private async closePosition(position: Position, reason: string): Promise<void> {
    if (!this.connector) {
      console.error("Exchange connector not initialized")
      return
    }

    try {
      // Determine symbols
      const btcSymbol = `BTC${this.config.quoteCurrency}`
      const xrpSymbol = `XRP${this.config.quoteCurrency}`

      // Determine close sides (opposite of entry)
      let btcSide: "buy" | "sell"
      let xrpSide: "buy" | "sell"

      if (position.side === "long") {
        btcSide = "sell"
        xrpSide = "buy"
      } else {
        btcSide = "buy"
        xrpSide = "sell"
      }

      // Place BTC order
      const btcOrder = await this.connector.placeOrder(btcSymbol, btcSide, "market", position.amount)

      // Place XRP order
      const xrpOrder = await this.connector.placeOrder(
        xrpSymbol,
        xrpSide,
        "market",
        (position.amount * position.entryPrice) / this.market.lastPrice[xrpSymbol],
      )

      // Update position
      position.status = "closed"
      position.exitPrice = this.market.lastPrice[btcSymbol] / this.market.lastPrice[xrpSymbol]
      position.exitTime = Date.now()
      position.orders.push(btcOrder, xrpOrder)

      // Calculate PnL
      if (position.side === "long") {
        position.pnl = (position.exitPrice - position.entryPrice) * position.amount
      } else {
        position.pnl = (position.entryPrice - position.exitPrice) * position.amount
      }

      // Update portfolio PnL
      this.portfolio.pnl += position.pnl || 0

      // Emit position closed event
      this.emit("positionClosed", { position, reason })

      console.log(`Position closed: ${position.id}, ${position.side} ${position.symbol}, PnL: ${position.pnl}`)
    } catch (error) {
      console.error("Error closing position:", error)
      this.lastError = `Position close failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }

  /**
   * Start rebalance timer
   */
  private startRebalanceTimer(): void {
    // Clear existing timer if any
    this.stopRebalanceTimer()

    // Start new timer
    this.rebalanceTimer = setInterval(() => {
      this.rebalancePortfolio()
    }, this.config.rebalanceInterval)
  }

  /**
   * Stop rebalance timer
   */
  private stopRebalanceTimer(): void {
    if (this.rebalanceTimer) {
      clearInterval(this.rebalanceTimer)
      this.rebalanceTimer = undefined
    }
  }

  /**
   * Rebalance portfolio
   */
  private rebalancePortfolio(): void {
    // Check open positions for exit conditions
    const openPositions = this.portfolio.positions.filter((p) => p.status === "open")

    for (const position of openPositions) {
      // Check time-based exit (max holding period)
      const holdingTime = (Date.now() - position.entryTime) / (1000 * 60 * 60 * 24) // days

      if (holdingTime > 7) {
        // 7 days max holding period
        this.closePosition(position, "max_holding_period")
      }
    }

    // Emit rebalance event
    this.emit("rebalance", {
      timestamp: Date.now(),
      portfolio: this.portfolio,
    })
  }

  /**
   * Load historical data
   */
  private async loadHistoricalData(): Promise<void> {
    if (!this.connector) {
      console.error("Exchange connector not initialized")
      return
    }

    try {
      // Load historical data for all symbols
      for (const symbol of this.config.symbols) {
        const candles = await this.connector.getHistoricalCandles(
          symbol,
          "1d", // Daily candles
          undefined,
          undefined,
          this.config.correlationWindow * 2, // Get enough data for correlation window
        )

        // Extract close prices
        const prices = candles.map((candle) => candle.close)

        // Initialize price history
        this.priceHistory[symbol] = prices

        // Calculate returns
        for (let i = 1; i < prices.length; i++) {
          const returns = (prices[i] - prices[i - 1]) / prices[i - 1]
          this.returnHistory[symbol].push(returns)
        }

        // Update latest price
        if (prices.length > 0) {
          this.market.lastPrice[symbol] = prices[prices.length - 1]
        }
      }

      // Analyze initial market state
      this.analyzeMarketState()

      console.log("Historical data loaded")
    } catch (error) {
      console.error("Error loading historical data:", error)
      this.lastError = `Failed to load historical data: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
