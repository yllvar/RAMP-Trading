"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Settings,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"

// Import trading engine and related components
import { TradingEngine, type TradingEngineConfig, type TradingEngineStatus } from "../lib/live-trading/trading-engine"
import type { TradingPair } from "../lib/multi-pair/pair-manager"
import type { MarketRegimeIndicators } from "../lib/alternative-data/data-integrator"

interface LiveTradingDashboardProps {
  initialConfig?: Partial<TradingEngineConfig>
}

export default function LiveTradingDashboard({ initialConfig }: LiveTradingDashboardProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isTrading, setIsTrading] = useState(false)
  const [engineStatus, setEngineStatus] = useState<TradingEngineStatus | null>(null)
  const [activePairs, setActivePairs] = useState<TradingPair[]>([])
  const [marketRegime, setMarketRegime] = useState<MarketRegimeIndicators | null>(null)
  const [alerts, setAlerts] = useState<Array<{ id: string; type: "info" | "warning" | "error"; message: string }>>([])

  // Trading engine instance
  const [tradingEngine, setTradingEngine] = useState<TradingEngine | null>(null)

  // Default configuration
  const defaultConfig: TradingEngineConfig = {
    exchange: "binance",
    testMode: true, // Start in test mode
    symbols: ["BTCUSDT", "XRPUSDT", "ETHUSDT", "ADAUSDT"],
    baseCurrency: "BTC",
    quoteCurrency: "USDT",
    initialCapital: 10000,
    maxPositions: 3,
    maxLeverage: 3.0,
    riskPerTrade: 0.02,
    correlationWindow: 30,
    highCorrelationThreshold: 0.7,
    lowCorrelationThreshold: 0.3,
    zscoreEntryThreshold: 2.5,
    zscoreExitThreshold: 1.0,
    stopLossPercentage: 5.0,
    takeProfitPercentage: 10.0,
    rebalanceInterval: 60000, // 1 minute
    ...initialConfig,
  }

  // Initialize trading engine
  useEffect(() => {
    const engine = new TradingEngine(defaultConfig)

    // Set up event listeners
    engine.on("started", () => {
      setIsTrading(true)
      addAlert("info", "Trading engine started successfully")
    })

    engine.on("stopped", () => {
      setIsTrading(false)
      addAlert("info", "Trading engine stopped")
    })

    engine.on("marketUpdate", (data) => {
      // Update market data
      console.log("Market update:", data)
    })

    engine.on("signal", (signal) => {
      addAlert("info", `New signal: ${signal.type} ${signal.direction} (strength: ${signal.strength.toFixed(2)})`)
    })

    engine.on("positionOpened", (position) => {
      addAlert("info", `Position opened: ${position.side} ${position.symbol}`)
    })

    engine.on("positionClosed", (data) => {
      const pnl = data.position.pnl || 0
      const alertType = pnl >= 0 ? "info" : "warning"
      addAlert(alertType, `Position closed: ${data.position.symbol} | P&L: $${pnl.toFixed(2)}`)
    })

    engine.on("portfolioUpdate", (portfolio) => {
      // Update portfolio state
      console.log("Portfolio update:", portfolio)
    })

    setTradingEngine(engine)

    return () => {
      if (engine) {
        engine.stop()
      }
    }
  }, [])

  // Update engine status periodically
  useEffect(() => {
    if (!tradingEngine) return

    const updateStatus = () => {
      const status = tradingEngine.getStatus()
      setEngineStatus(status)
      setIsConnected(status.isConnected)
    }

    updateStatus()
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [tradingEngine])

  const addAlert = (type: "info" | "warning" | "error", message: string) => {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
    }

    setAlerts((prev) => [alert, ...prev.slice(0, 9)]) // Keep last 10 alerts

    // Auto-remove info alerts after 5 seconds
    if (type === "info") {
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id))
      }, 5000)
    }
  }

  const handleStartTrading = async () => {
    if (!tradingEngine) return

    try {
      const success = await tradingEngine.start()
      if (!success) {
        addAlert("error", "Failed to start trading engine")
      }
    } catch (error) {
      addAlert("error", `Error starting trading: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleStopTrading = async () => {
    if (!tradingEngine) return

    try {
      await tradingEngine.stop()
    } catch (error) {
      addAlert("error", `Error stopping trading: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "running":
        return "text-green-600"
      case "disconnected":
      case "stopped":
        return "text-red-600"
      default:
        return "text-yellow-600"
    }
  }

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case "bull":
      case "high-correlation":
        return "bg-green-500"
      case "bear":
      case "low-correlation":
        return "bg-red-500"
      case "sideways":
      case "transition":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Activity className="h-6 w-6 mr-2" />
              Live Trading Dashboard
            </span>
            <div className="flex items-center space-x-2">
              <Badge className={`${isConnected ? "bg-green-500" : "bg-red-500"} text-white`}>
                {isConnected ? <Wifi className="h-4 w-4 mr-1" /> : <WifiOff className="h-4 w-4 mr-1" />}
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Badge className={`${isTrading ? "bg-blue-500" : "bg-gray-500"} text-white`}>
                {isTrading ? "Trading" : "Stopped"}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>Real-time trading with regime-adaptive pairs strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                onClick={handleStartTrading}
                disabled={isTrading || !isConnected}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Trading
              </Button>
              <Button onClick={handleStopTrading} disabled={!isTrading} variant="destructive">
                <Pause className="h-4 w-4 mr-2" />
                Stop Trading
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              Mode: <span className="font-semibold">{defaultConfig.testMode ? "Test" : "Live"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <Alert
              key={alert.id}
              className={
                alert.type === "error"
                  ? "border-red-500"
                  : alert.type === "warning"
                    ? "border-yellow-500"
                    : "border-blue-500"
              }
            >
              {alert.type === "error" && <AlertTriangle className="h-4 w-4" />}
              {alert.type === "warning" && <AlertTriangle className="h-4 w-4" />}
              {alert.type === "info" && <CheckCircle className="h-4 w-4" />}
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Dashboard */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="pairs">Pairs</TabsTrigger>
          <TabsTrigger value="regime">Regime</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Portfolio Value */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Portfolio Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${engineStatus?.portfolio.totalValue.toLocaleString() || "0"}</div>
                <p className="text-xs text-gray-500">
                  P&L: {engineStatus?.portfolio.pnl >= 0 ? "+" : ""}${engineStatus?.portfolio.pnl.toFixed(2) || "0"}
                </p>
              </CardContent>
            </Card>

            {/* Active Positions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engineStatus?.portfolio.positions.length || 0}</div>
                <p className="text-xs text-gray-500">Max: {defaultConfig.maxPositions}</p>
              </CardContent>
            </Card>

            {/* Available Cash */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Available Cash</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${engineStatus?.portfolio.availableCash.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-gray-500">
                  {engineStatus?.portfolio.totalValue > 0
                    ? ((engineStatus.portfolio.availableCash / engineStatus.portfolio.totalValue) * 100).toFixed(1)
                    : "0"}
                  % of portfolio
                </p>
              </CardContent>
            </Card>

            {/* Current Regime */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Market Regime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Badge className={`${getRegimeColor(engineStatus?.market.regime || "transition")} text-white mr-2`}>
                    {engineStatus?.market.regime.replace("-", " ") || "Unknown"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Correlation: {(engineStatus?.market.correlation || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Market Data Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>Real-time price data and correlation</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="btcPrice" stroke="#f7931a" name="BTC Price" />
                  <Line type="monotone" dataKey="xrpPrice" stroke="#23292f" name="XRP Price" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions">
          <Card>
            <CardHeader>
              <CardTitle>Active Positions</CardTitle>
              <CardDescription>Current open positions and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              {engineStatus?.portfolio.positions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No active positions</div>
              ) : (
                <div className="space-y-4">
                  {engineStatus?.portfolio.positions.map((position) => (
                    <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge variant={position.side === "long" ? "default" : "destructive"}>
                          {position.side.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-semibold">{position.symbol}</p>
                          <p className="text-sm text-gray-500">
                            Entry: ${position.entryPrice.toFixed(4)} | Amount: {position.amount.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-semibold ${(position.pnl || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {(position.pnl || 0) >= 0 ? "+" : ""}${(position.pnl || 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(((position.pnl || 0) / (position.amount * position.entryPrice)) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pairs">
          <Card>
            <CardHeader>
              <CardTitle>Trading Pairs</CardTitle>
              <CardDescription>Available and active trading pairs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defaultConfig.symbols.map((symbol) => (
                  <div key={symbol} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{symbol}</h4>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Price:</span>
                        <span>${engineStatus?.market.lastPrice[symbol]?.toFixed(4) || "0.0000"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>24h Volume:</span>
                        <span>${(engineStatus?.market.volume24h[symbol] || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spread:</span>
                        <span>
                          {engineStatus?.market.bidPrice[symbol] && engineStatus?.market.askPrice[symbol]
                            ? (
                                ((engineStatus.market.askPrice[symbol] - engineStatus.market.bidPrice[symbol]) /
                                  engineStatus.market.bidPrice[symbol]) *
                                100
                              ).toFixed(3)
                            : "0.000"}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regime">
          <div className="space-y-6">
            {/* Current Regime */}
            <Card>
              <CardHeader>
                <CardTitle>Market Regime Analysis</CardTitle>
                <CardDescription>Current market conditions and regime classification</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-white ${getRegimeColor(engineStatus?.market.regime || "transition")}`}
                    >
                      {engineStatus?.market.regime === "high-correlation" && <TrendingUp className="h-4 w-4 mr-1" />}
                      {engineStatus?.market.regime === "low-correlation" && <TrendingDown className="h-4 w-4 mr-1" />}
                      {engineStatus?.market.regime === "transition" && <Activity className="h-4 w-4 mr-1" />}
                      {engineStatus?.market.regime.replace("-", " ") || "Unknown"}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Current Regime</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(engineStatus?.market.correlation || 0).toFixed(3)}</div>
                    <p className="text-sm text-gray-500">Correlation</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(engineStatus?.market.volatility * 100 || 0).toFixed(1)}%</div>
                    <p className="text-sm text-gray-500">Volatility</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Z-Score Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Z-Score Analysis</CardTitle>
                <CardDescription>Current spread z-score and trading thresholds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span>Current Z-Score:</span>
                    <span className="font-bold text-lg">{(engineStatus?.market.zscore || 0).toFixed(2)}</span>
                  </div>
                  <div className="relative">
                    <Progress value={Math.min(100, Math.abs(engineStatus?.market.zscore || 0) * 20)} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>-5</span>
                      <span>0</span>
                      <span>+5</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Entry Threshold:</span>
                    <span className="ml-2 font-semibold">±{defaultConfig.zscoreEntryThreshold}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Exit Threshold:</span>
                    <span className="ml-2 font-semibold">±{defaultConfig.zscoreExitThreshold}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Return</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${(engineStatus?.portfolio.pnl || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {(engineStatus?.portfolio.pnl || 0) >= 0 ? "+" : ""}
                    {(((engineStatus?.portfolio.pnl || 0) / defaultConfig.initialCapital) * 100).toFixed(2)}%
                  </div>
                  <p className="text-xs text-gray-500">Since start</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0.0%</div>
                  <p className="text-xs text-gray-500">0 / 0 trades</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Trade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$0.00</div>
                  <p className="text-xs text-gray-500">Per trade</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Max Drawdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">0.0%</div>
                  <p className="text-xs text-gray-500">Peak to trough</p>
                </CardContent>
              </Card>
            </div>

            {/* Equity Curve */}
            <Card>
              <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
                <CardDescription>Portfolio value over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={[]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="equity" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk">
          <div className="space-y-6">
            {/* Risk Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Position Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(
                      (1 - (engineStatus?.portfolio.availableCash || 0) / (engineStatus?.portfolio.totalValue || 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <p className="text-xs text-gray-500">Capital allocated</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Leverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1.0x</div>
                  <p className="text-xs text-gray-500">Max: {defaultConfig.maxLeverage}x</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Risk Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Low</div>
                  <p className="text-xs text-gray-500">Current risk level</p>
                </CardContent>
              </Card>
            </div>

            {/* Risk Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Breakdown</CardTitle>
                <CardDescription>Risk allocation by position and asset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Portfolio Risk</span>
                      <span>Low</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Correlation Risk</span>
                      <span>Medium</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Volatility Risk</span>
                      <span>Low</span>
                    </div>
                    <Progress value={30} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
