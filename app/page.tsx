import { Logger } from "../utils/logger"
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Play, Pause, RotateCcw } from "lucide-react"
import StrategyDashboard from "./components/strategy-dashboard"
import BacktestResults from "./components/backtest-results"
import RiskMetrics from "./components/risk-metrics"
import RegimeAnalysis from "./components/regime-analysis"
import DataAnalyzer from "./components/data-analyzer"
import StrategySimulator from "./components/strategy-simulator"
import BacktestingDashboard from "./components/backtesting-dashboard"
import LiveTradingDashboard from "./components/live-trading-dashboard"

export default function TradingStrategy() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentRegime, setCurrentRegime] = useState<"high-correlation" | "low-correlation" | "transition">(
    "high-correlation",
  )
  const [portfolioValue, setPortfolioValue] = useState(100000)
  const [totalReturn, setTotalReturn] = useState(0)

  const handleStartStop = () => {
    setIsRunning(!isRunning)
  }

  const handleReset = () => {
    setIsRunning(false)
    setPortfolioValue(100000)
    setTotalReturn(0)
  }

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case "high-correlation":
        return "bg-green-500"
      case "low-correlation":
        return "bg-red-500"
      case "transition":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getRegimeIcon = (regime: string) => {
    switch (regime) {
      case "high-correlation":
        return <TrendingUp className="h-4 w-4" />
      case "low-correlation":
        return <TrendingDown className="h-4 w-4" />
      case "transition":
        return <Minus className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Regime-Adaptive Momentum Pairs</h1>
            <p className="text-gray-600">Statistical Arbitrage: BTCUSDT vs XRPUSDT</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className={`${getRegimeColor(currentRegime)} text-white`}>
              {getRegimeIcon(currentRegime)}
              <span className="ml-1 capitalize">{currentRegime.replace("-", " ")} Regime</span>
            </Badge>
            <div className="flex space-x-2">
              <Button onClick={handleStartStop} variant={isRunning ? "destructive" : "default"}>
                {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isRunning ? "Stop" : "Start"} Strategy
              </Button>
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${portfolioValue.toLocaleString()}</div>
              <p className="text-xs text-gray-500">Initial: $100,000</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Return</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                {totalReturn >= 0 ? "+" : ""}
                {totalReturn.toFixed(2)}%
              </div>
              <p className="text-xs text-gray-500">Since inception</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Current Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-gray-500">Active pairs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Strategy Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isRunning ? "text-green-600" : "text-gray-600"}`}>
                {isRunning ? "ACTIVE" : "STOPPED"}
              </div>
              <p className="text-xs text-gray-500">Current state</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="analyzer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="analyzer">Data Analysis</TabsTrigger>
            <TabsTrigger value="simulator">Strategy Sim</TabsTrigger>
            <TabsTrigger value="backtesting">Backtesting</TabsTrigger>
            <TabsTrigger value="live-trading">Live Trading</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="regime">Regime Analysis</TabsTrigger>
            <TabsTrigger value="backtest">Backtest Results</TabsTrigger>
            <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="analyzer">
            <DataAnalyzer />
          </TabsContent>

          <TabsContent value="simulator">
            <StrategySimulator />
          </TabsContent>

          <TabsContent value="backtesting">
            <BacktestingDashboard />
          </TabsContent>

          <TabsContent value="live-trading">
            <LiveTradingDashboard />
          </TabsContent>

          <TabsContent value="dashboard">
            <StrategyDashboard isRunning={isRunning} currentRegime={currentRegime} portfolioValue={portfolioValue} />
          </TabsContent>

          <TabsContent value="regime">
            <RegimeAnalysis currentRegime={currentRegime} />
          </TabsContent>

          <TabsContent value="backtest">
            <BacktestResults />
          </TabsContent>

          <TabsContent value="risk">
            <RiskMetrics portfolioValue={portfolioValue} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
