/**
 * Exchange connector for real-time data and trading
 */
import WebSocket from "isomorphic-ws"
import axios from "axios"
import crypto from "crypto"
import { Logger } from "../utils/logger"

export interface ExchangeCredentials {
  apiKey: string
  apiSecret: string
  testMode?: boolean
}

export interface MarketDataUpdate {
  exchange: string
  symbol: string
  timestamp: number
  price: number
  volume: number
  bidPrice?: number
  askPrice?: number
  bidSize?: number
  askSize?: number
}

export interface OrderbookUpdate {
  exchange: string
  symbol: string
  timestamp: number
  bids: [number, number][] // [price, size]
  asks: [number, number][] // [price, size]
}

export interface TradeUpdate {
  exchange: string
  symbol: string
  timestamp: number
  price: number
  size: number
  side: "buy" | "sell"
  id: string
}

export interface OrderStatus {
  id: string
  symbol: string
  side: "buy" | "sell"
  type: "market" | "limit" | "stop" | "stop_limit"
  status: "new" | "partially_filled" | "filled" | "canceled" | "rejected"
  price?: number
  amount: number
  filled: number
  remaining: number
  cost: number
  fee: number
  timestamp: number
}

export interface BalanceUpdate {
  asset: string
  free: number
  locked: number
  total: number
}

export type DataHandler = (data: MarketDataUpdate | OrderbookUpdate | TradeUpdate | OrderStatus | BalanceUpdate) => void

/**
 * Base exchange connector class
 */
export abstract class ExchangeConnector {
  protected credentials?: ExchangeCredentials
  protected dataHandlers: Map<string, DataHandler[]> = new Map()
  protected wsConnections: Map<string, WebSocket> = new Map()
  protected isConnected = false
  protected heartbeatInterval?: NodeJS.Timeout

  constructor(credentials?: ExchangeCredentials) {
    this.credentials = credentials
  }

  /**
   * Connect to exchange
   */
  abstract connect(): Promise<boolean>

  /**
   * Disconnect from exchange
   */
  abstract disconnect(): Promise<void>

  /**
   * Subscribe to market data
   */
  abstract subscribeMarketData(symbol: string, handler: DataHandler): Promise<boolean>

  /**
   * Subscribe to orderbook updates
   */
  abstract subscribeOrderbook(symbol: string, handler: DataHandler): Promise<boolean>

  /**
   * Subscribe to trade updates
   */
  abstract subscribeTrades(symbol: string, handler: DataHandler): Promise<boolean>

  /**
   * Subscribe to user data (orders, balances)
   */
  abstract subscribeUserData(handler: DataHandler): Promise<boolean>

  /**
   * Get historical candles
   */
  abstract getHistoricalCandles(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ): Promise<any[]>

  /**
   * Place order
   */
  abstract placeOrder(
    symbol: string,
    side: "buy" | "sell",
    type: "market" | "limit",
    amount: number,
    price?: number,
    params?: any,
  ): Promise<OrderStatus>

  /**
   * Cancel order
   */
  abstract cancelOrder(orderId: string, symbol: string): Promise<boolean>

  /**
   * Get order status
   */
  abstract getOrderStatus(orderId: string, symbol: string): Promise<OrderStatus>

  /**
   * Get account balances
   */
  abstract getBalances(): Promise<BalanceUpdate[]>

  /**
   * Add data handler
   */
  protected addHandler(channel: string, handler: DataHandler): void {
    if (!this.dataHandlers.has(channel)) {
      this.dataHandlers.set(channel, [])
    }
    this.dataHandlers.get(channel)?.push(handler)
  }

  /**
   * Notify handlers
   */
  protected notifyHandlers(channel: string, data: any): void {
    const handlers = this.dataHandlers.get(channel)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }

  /**
   * Check if connected
   */
  isExchangeConnected(): boolean {
    return this.isConnected
  }

  /**
   * Get exchange name
   */
  abstract getExchangeName(): string

  /**
   * Get exchange status
   */
  abstract getExchangeStatus(): Promise<{
    status: "ok" | "error" | "maintenance"
    message?: string
  }>
}

/**
 * Binance exchange connector
 */
export class BinanceConnector extends ExchangeConnector {
  private baseUrl: string
  private baseWsUrl: string

  constructor(credentials?: ExchangeCredentials) {
    super(credentials)

    // Use testnet if in test mode
    if (credentials?.testMode) {
      this.baseUrl = "https://testnet.binance.vision/api"
      this.baseWsUrl = "wss://testnet.binance.vision/ws"
    } else {
      this.baseUrl = "https://api.binance.com/api"
      this.baseWsUrl = "wss://stream.binance.com:9443/ws"
    }
  }

  /**
   * Connect to Binance
   */
  async connect(): Promise<boolean> {
    try {
      // Test connection with a simple API call
      const response = await axios.get(`${this.baseUrl}/v3/ping`)
      if (response.status === 200) {
        this.isConnected = true
        this.setupHeartbeat()
        Logger.info('Connected to Binance')
        return true
      }
      return false
    } catch (error) {
      console.error("Failed to connect to Binance:", error)
      return false
    }
  }

  /**
   * Disconnect from Binance
   */
  async disconnect(): Promise<void> {
    // Close all WebSocket connections
    for (const [key, ws] of this.wsConnections.entries()) {
      ws.close()
      this.wsConnections.delete(key)
    }

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.isConnected = false
    Logger.info('Disconnected from Binance')
  }

  /**
   * Subscribe to market data
   */
  async subscribeMarketData(symbol: string, handler: DataHandler): Promise<boolean> {
    try {
      const formattedSymbol = symbol.toLowerCase()
      const channel = `${formattedSymbol}@ticker`

      // Add handler
      this.addHandler(channel, handler)

      // Create WebSocket connection if it doesn't exist
      if (!this.wsConnections.has(channel)) {
        const ws = new WebSocket(`${this.baseWsUrl}/${channel}`)

        ws.onopen = () => {
          console.log(`WebSocket connected: ${channel}`)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString())

            // Transform to standard format
            const update: MarketDataUpdate = {
              exchange: "binance",
              symbol: symbol.toUpperCase(),
              timestamp: Date.now(),
              price: Number.parseFloat(data.c), // Last price
              volume: Number.parseFloat(data.v), // 24h volume
              bidPrice: Number.parseFloat(data.b),
              askPrice: Number.parseFloat(data.a),
              bidSize: Number.parseFloat(data.B),
              askSize: Number.parseFloat(data.A),
            }

            this.notifyHandlers(channel, update)
          } catch (error) {
            console.error("Error processing WebSocket message:", error)
          }
        }

        ws.onerror = (error) => {
          console.error(`WebSocket error: ${channel}`, error)
        }

        ws.onclose = () => {
          console.log(`WebSocket closed: ${channel}`)
          this.wsConnections.delete(channel)

          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (this.isConnected) {
              console.log(`Attempting to reconnect: ${channel}`)
              this.subscribeMarketData(symbol, handler)
            }
          }, 5000)
        }

        this.wsConnections.set(channel, ws)
      }

      return true
    } catch (error) {
      console.error("Failed to subscribe to market data:", error)
      return false
    }
  }

  /**
   * Subscribe to orderbook updates
   */
  async subscribeOrderbook(symbol: string, handler: DataHandler): Promise<boolean> {
    try {
      const formattedSymbol = symbol.toLowerCase()
      const channel = `${formattedSymbol}@depth`

      // Add handler
      this.addHandler(channel, handler)

      // Create WebSocket connection if it doesn't exist
      if (!this.wsConnections.has(channel)) {
        const ws = new WebSocket(`${this.baseWsUrl}/${channel}`)

        ws.onopen = () => {
          console.log(`WebSocket connected: ${channel}`)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString())

            // Transform to standard format
            const update: OrderbookUpdate = {
              exchange: "binance",
              symbol: symbol.toUpperCase(),
              timestamp: data.E || Date.now(),
              bids: data.b.map((bid: string[]) => [Number.parseFloat(bid[0]), Number.parseFloat(bid[1])]),
              asks: data.a.map((ask: string[]) => [Number.parseFloat(ask[0]), Number.parseFloat(ask[1])]),
            }

            this.notifyHandlers(channel, update)
          } catch (error) {
            console.error("Error processing WebSocket message:", error)
          }
        }

        ws.onerror = (error) => {
          console.error(`WebSocket error: ${channel}`, error)
        }

        ws.onclose = () => {
          console.log(`WebSocket closed: ${channel}`)
          this.wsConnections.delete(channel)

          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (this.isConnected) {
              console.log(`Attempting to reconnect: ${channel}`)
              this.subscribeOrderbook(symbol, handler)
            }
          }, 5000)
        }

        this.wsConnections.set(channel, ws)
      }

      return true
    } catch (error) {
      console.error("Failed to subscribe to orderbook:", error)
      return false
    }
  }

  /**
   * Subscribe to trade updates
   */
  async subscribeTrades(symbol: string, handler: DataHandler): Promise<boolean> {
    try {
      const formattedSymbol = symbol.toLowerCase()
      const channel = `${formattedSymbol}@trade`

      // Add handler
      this.addHandler(channel, handler)

      // Create WebSocket connection if it doesn't exist
      if (!this.wsConnections.has(channel)) {
        const ws = new WebSocket(`${this.baseWsUrl}/${channel}`)

        ws.onopen = () => {
          console.log(`WebSocket connected: ${channel}`)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString())

            // Transform to standard format
            const update: TradeUpdate = {
              exchange: "binance",
              symbol: symbol.toUpperCase(),
              timestamp: data.T || Date.now(),
              price: Number.parseFloat(data.p),
              size: Number.parseFloat(data.q),
              side: data.m ? "sell" : "buy", // m is true for sell (maker) and false for buy (taker)
              id: data.t.toString(),
            }

            this.notifyHandlers(channel, update)
          } catch (error) {
            console.error("Error processing WebSocket message:", error)
          }
        }

        ws.onerror = (error) => {
          console.error(`WebSocket error: ${channel}`, error)
        }

        ws.onclose = () => {
          console.log(`WebSocket closed: ${channel}`)
          this.wsConnections.delete(channel)

          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (this.isConnected) {
              console.log(`Attempting to reconnect: ${channel}`)
              this.subscribeTrades(symbol, handler)
            }
          }, 5000)
        }

        this.wsConnections.set(channel, ws)
      }

      return true
    } catch (error) {
      console.error("Failed to subscribe to trades:", error)
      return false
    }
  }

  /**
   * Subscribe to user data (orders, balances)
   */
  async subscribeUserData(handler: DataHandler): Promise<boolean> {
    if (!this.credentials) {
      Logger.info('API credentials required for user data subscription')
      return false
    }

    try {
      // Get listen key for user data stream
      const response = await axios.post(
        `${this.baseUrl}/v3/userDataStream`,
        {},
        {
          headers: {
            "X-MBX-APIKEY": this.credentials.apiKey,
          },
        },
      )

      const listenKey = response.data.listenKey
      const channel = `userDataStream_${listenKey}`

      // Add handler
      this.addHandler(channel, handler)

      // Create WebSocket connection
      const ws = new WebSocket(`${this.baseWsUrl}/${listenKey}`)

      ws.onopen = () => {
        Logger.info('User data stream connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString())

          // Process different event types
          switch (data.e) {
            case "outboundAccountPosition":
              // Balance update
              const balances = data.B.map((balance: any) => ({
                asset: balance.a,
                free: Number.parseFloat(balance.f),
                locked: Number.parseFloat(balance.l),
                total: Number.parseFloat(balance.f) + Number.parseFloat(balance.l),
              }))

              balances.forEach((balance: BalanceUpdate) => {
                this.notifyHandlers(channel, balance)
              })
              break

            case "executionReport":
              // Order update
              const orderStatus: OrderStatus = {
                id: data.i.toString(),
                symbol: data.s,
                side: data.S.toLowerCase(),
                type: data.o.toLowerCase(),
                status: data.X.toLowerCase(),
                price: Number.parseFloat(data.p),
                amount: Number.parseFloat(data.q),
                filled: Number.parseFloat(data.z),
                remaining: Number.parseFloat(data.q) - Number.parseFloat(data.z),
                cost: Number.parseFloat(data.Z),
                fee: Number.parseFloat(data.n || 0),
                timestamp: data.T,
              }

              this.notifyHandlers(channel, orderStatus)
              break
          }
        } catch (error) {
          console.error("Error processing user data message:", error)
        }
      }

      ws.onerror = (error) => {
        console.error("User data stream error:", error)
      }

      ws.onclose = () => {
        Logger.info('User data stream closed')
        this.wsConnections.delete(channel)

        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (this.isConnected) {
            Logger.info('Attempting to reconnect user data stream')
            this.subscribeUserData(handler)
          }
        }, 5000)
      }

      this.wsConnections.set(channel, ws)

      // Keep-alive for listen key (required every 60 minutes)
      setInterval(
        async () => {
          try {
            await axios.put(
              `${this.baseUrl}/v3/userDataStream`,
              { listenKey },
              {
                headers: {
                  "X-MBX-APIKEY": this.credentials.apiKey,
                },
              },
            )
            Logger.info('Listen key extended')
          } catch (error) {
            console.error("Failed to extend listen key:", error)
          }
        },
        50 * 60 * 1000,
      ) // 50 minutes

      return true
    } catch (error) {
      console.error("Failed to subscribe to user data:", error)
      return false
    }
  }

  /**
   * Get historical candles
   */
  async getHistoricalCandles(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit = 500,
  ): Promise<any[]> {
    try {
      const params: any = {
        symbol: symbol.toUpperCase(),
        interval,
        limit,
      }

      if (startTime) params.startTime = startTime
      if (endTime) params.endTime = endTime

      const response = await axios.get(`${this.baseUrl}/v3/klines`, { params })

      // Transform to standard format
      return response.data.map((candle: any[]) => ({
        timestamp: candle[0],
        open: Number.parseFloat(candle[1]),
        high: Number.parseFloat(candle[2]),
        low: Number.parseFloat(candle[3]),
        close: Number.parseFloat(candle[4]),
        volume: Number.parseFloat(candle[5]),
        closeTime: candle[6],
        quoteVolume: Number.parseFloat(candle[7]),
        trades: candle[8],
        buyBaseVolume: Number.parseFloat(candle[9]),
        buyQuoteVolume: Number.parseFloat(candle[10]),
      }))
    } catch (error) {
      console.error("Failed to get historical candles:", error)
      throw error
    }
  }

  /**
   * Place order
   */
  async placeOrder(
    symbol: string,
    side: "buy" | "sell",
    type: "market" | "limit",
    amount: number,
    price?: number,
    params: any = {},
  ): Promise<OrderStatus> {
    if (!this.credentials) {
      throw new Error("API credentials required for placing orders")
    }

    try {
      const timestamp = Date.now()
      const queryParams: any = {
        symbol: symbol.toUpperCase(),
        side: side.toUpperCase(),
        type: type.toUpperCase(),
        quantity: amount.toString(),
        timestamp,
      }

      if (type === "limit" && price) {
        queryParams.price = price.toString()
        queryParams.timeInForce = params.timeInForce || "GTC"
      }

      // Add additional parameters
      Object.keys(params).forEach((key) => {
        if (!queryParams[key]) {
          queryParams[key] = params[key]
        }
      })

      // Create signature
      const queryString = Object.keys(queryParams)
        .map((key) => `${key}=${queryParams[key]}`)
        .join("&")

      const signature = crypto.createHmac("sha256", this.credentials.apiSecret).update(queryString).digest("hex")

      // Add signature to query params
      queryParams.signature = signature

      // Send request
      const response = await axios.post(`${this.baseUrl}/v3/order`, null, {
        params: queryParams,
        headers: {
          "X-MBX-APIKEY": this.credentials.apiKey,
        },
      })

      // Transform to standard format
      return {
        id: response.data.orderId.toString(),
        symbol: response.data.symbol,
        side: response.data.side.toLowerCase(),
        type: response.data.type.toLowerCase(),
        status: response.data.status.toLowerCase(),
        price: Number.parseFloat(response.data.price),
        amount: Number.parseFloat(response.data.origQty),
        filled: Number.parseFloat(response.data.executedQty),
        remaining: Number.parseFloat(response.data.origQty) - Number.parseFloat(response.data.executedQty),
        cost: Number.parseFloat(response.data.cummulativeQuoteQty),
        fee: 0, // Not provided in order placement response
        timestamp: response.data.transactTime,
      }
    } catch (error) {
      console.error("Failed to place order:", error)
      throw error
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    if (!this.credentials) {
      throw new Error("API credentials required for canceling orders")
    }

    try {
      const timestamp = Date.now()
      const queryParams: any = {
        symbol: symbol.toUpperCase(),
        orderId,
        timestamp,
      }

      // Create signature
      const queryString = Object.keys(queryParams)
        .map((key) => `${key}=${queryParams[key]}`)
        .join("&")

      const signature = crypto.createHmac("sha256", this.credentials.apiSecret).update(queryString).digest("hex")

      // Add signature to query params
      queryParams.signature = signature

      // Send request
      await axios.delete(`${this.baseUrl}/v3/order`, {
        params: queryParams,
        headers: {
          "X-MBX-APIKEY": this.credentials.apiKey,
        },
      })

      return true
    } catch (error) {
      console.error("Failed to cancel order:", error)
      return false
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string, symbol: string): Promise<OrderStatus> {
    if (!this.credentials) {
      throw new Error("API credentials required for getting order status")
    }

    try {
      const timestamp = Date.now()
      const queryParams: any = {
        symbol: symbol.toUpperCase(),
        orderId,
        timestamp,
      }

      // Create signature
      const queryString = Object.keys(queryParams)
        .map((key) => `${key}=${queryParams[key]}`)
        .join("&")

      const signature = crypto.createHmac("sha256", this.credentials.apiSecret).update(queryString).digest("hex")

      // Add signature to query params
      queryParams.signature = signature

      // Send request
      const response = await axios.get(`${this.baseUrl}/v3/order`, {
        params: queryParams,
        headers: {
          "X-MBX-APIKEY": this.credentials.apiKey,
        },
      })

      // Transform to standard format
      return {
        id: response.data.orderId.toString(),
        symbol: response.data.symbol,
        side: response.data.side.toLowerCase(),
        type: response.data.type.toLowerCase(),
        status: response.data.status.toLowerCase(),
        price: Number.parseFloat(response.data.price),
        amount: Number.parseFloat(response.data.origQty),
        filled: Number.parseFloat(response.data.executedQty),
        remaining: Number.parseFloat(response.data.origQty) - Number.parseFloat(response.data.executedQty),
        cost: Number.parseFloat(response.data.cummulativeQuoteQty),
        fee: 0, // Not provided in order status response
        timestamp: response.data.time,
      }
    } catch (error) {
      console.error("Failed to get order status:", error)
      throw error
    }
  }

  /**
   * Get account balances
   */
  async getBalances(): Promise<BalanceUpdate[]> {
    if (!this.credentials) {
      throw new Error("API credentials required for getting balances")
    }

    try {
      const timestamp = Date.now()
      const queryParams: any = {
        timestamp,
      }

      // Create signature
      const queryString = Object.keys(queryParams)
        .map((key) => `${key}=${queryParams[key]}`)
        .join("&")

      const signature = crypto.createHmac("sha256", this.credentials.apiSecret).update(queryString).digest("hex")

      // Add signature to query params
      queryParams.signature = signature

      // Send request
      const response = await axios.get(`${this.baseUrl}/v3/account`, {
        params: queryParams,
        headers: {
          "X-MBX-APIKEY": this.credentials.apiKey,
        },
      })

      // Transform to standard format
      return response.data.balances
        .filter((balance: any) => Number.parseFloat(balance.free) > 0 || Number.parseFloat(balance.locked) > 0)
        .map((balance: any) => ({
          asset: balance.asset,
          free: Number.parseFloat(balance.free),
          locked: Number.parseFloat(balance.locked),
          total: Number.parseFloat(balance.free) + Number.parseFloat(balance.locked),
        }))
    } catch (error) {
      console.error("Failed to get balances:", error)
      throw error
    }
  }

  /**
   * Setup heartbeat to keep connection alive
   */
  private setupHeartbeat(): void {
    // Clear existing interval if any
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Ping the API every 5 minutes to keep the connection alive
    this.heartbeatInterval = setInterval(
      async () => {
        try {
          await axios.get(`${this.baseUrl}/v3/ping`)
        } catch (error) {
          console.error("Heartbeat failed:", error)
          this.isConnected = false
        }
      },
      5 * 60 * 1000,
    )
  }

  /**
   * Get exchange name
   */
  getExchangeName(): string {
    return "Binance"
  }

  /**
   * Get exchange status
   */
  async getExchangeStatus(): Promise<{
    status: "ok" | "error" | "maintenance"
    message?: string
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/v3/system/status`)

      if (response.data.status === 0) {
        return { status: "ok" }
      } else {
        return {
          status: "maintenance",
          message: "System maintenance",
        }
      }
    } catch (error) {
      return {
        status: "error",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }
}

/**
 * Exchange connector factory
 */
export class ExchangeConnectorFactory {
  /**
   * Create exchange connector
   */
  static createConnector(exchange: string, credentials?: ExchangeCredentials): ExchangeConnector {
    switch (exchange.toLowerCase()) {
      case "binance":
        return new BinanceConnector(credentials)
      // Add more exchanges as needed
      default:
        throw new Error(`Unsupported exchange: ${exchange}`)
    }
  }
}
