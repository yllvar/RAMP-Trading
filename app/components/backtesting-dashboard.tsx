import { Logger } from "../utils/logger"
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Download, TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react"
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
  BarChart,
  Bar,
} from "recharts"

// Import the backtesting engine
import { BacktestingEngine } from "../lib/backtesting/backtesting-engine"
import { PerformanceCalculator } from "../lib/backtesting/performance-metrics"
import { TradeJournal } from "../lib/backtesting/trade-journal"
import { WalkForwardTester } from "../lib/backtesting/walk-forward-tester"

interface BacktestingDashboardProps {
  marketData?: any
}

export default function BacktestingDashboard({ marketData }: BacktestingDashboardProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [backtestResult, setBacktestResult] = useState<any>(null)
  const [walkForwardResult, setWalkForwardResult] = useState<any>(null)
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState("")

  // Default strategy parameters
  const defaultStrategyParams = {
    correlationWindow: 30,
    highCorrelationThreshold: 0.7,
    lowCorrelationThreshold: 0.3,
    zscoreEntryThreshold: 2.5,
    zscoreExitThreshold: 1.0,
    stopLossZscore: 5.0,
    basePositionSize: 0.3,
    maxPositionSize: 0.5,
    kellyMultiplier: 0.5,
    meanReversionLeverage: 2.5,
    momentumLeverage: 4.0,
    transitionLeverage: 1.5,
    maxDrawdown: 15.0,
    correlationBreakdownThreshold: 0.1,
    volatilityScaling: true,
  }

  const defaultRiskParams = {
    maxPositionSize: 0.5,
    maxLeverage: 5.0,
    stopLossThreshold: 0.05,
    maxDrawdown: 15.0,
    correlationThreshold: 0.3,
    volatilityThreshold: 0.5,
  }

  const defaultConfig = {
    startDate: new Date("2023-01-01"),
    endDate: new Date("2024-01-01"),
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.0005,
    lookbackWindow: 30,
    rebalanceFrequency: 7,
    maxPositions: 3,
    enableWalkForward: false,
  }

  const runBacktest = async () => {
    if (!marketData) {
      alert("Please load market data first from the Data Analysis tab")
      return
    }

    setIsRunning(true)
    setProgress(0)
    setCurrentPhase("Initializing backtest...")

    try {
      // Create backtesting engine
      const engine = new BacktestingEngine(defaultConfig, defaultStrategyParams, defaultRiskParams)

      setProgress(20)
      setCurrentPhase("Running historical simulation...")

      // Run backtest
      const result = await engine.runBacktest(marketData)

      setProgress(80)
      setCurrentPhase("Calculating performance metrics...")

      // Calculate additional metrics
      const enhancedMetrics = PerformanceCalculator.calculateMetrics(result.trades, result.equityCurve, defaultConfig)

      setProgress(100)
      setCurrentPhase("Backtest completed!")

      setBacktestResult({
        ...result,
        performance: enhancedMetrics,
      })
    } catch (error) {
      console.error("Backtest failed:", error)
      alert(`Backtest failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsRunning(false)
      setProgress(0)
      setCurrentPhase("")
    }
  }

  const runWalkForward = async () => {
    if (!marketData) {
      alert("Please load market data first")
      return
    }

    setIsRunning(true)
    setProgress(0)
    setCurrentPhase("Starting walk-forward analysis...")

    try {
      const walkForwardTester = new WalkForwardTester(defaultConfig, defaultStrategyParams, defaultRiskParams)

      setProgress(20)
      setCurrentPhase("Running walk-forward windows...")

      const result = await walkForwardTester.runWalkForwardAnalysis(
        marketData,
        252, // 1 year in-sample
        63, // 3 months out-of-sample
        21, // 1 month step
      )

      setProgress(100)
      setCurrentPhase("Walk-forward analysis completed!")

      setWalkForwardResult(result)
    } catch (error) {
      console.error("Walk-forward analysis failed:", error)
      alert(`Walk-forward analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsRunning(false)
      setProgress(0)
      setCurrentPhase("")
    }
  }

  const downloadResults = () => {
    if (!backtestResult) return

    const journal = new TradeJournal()
    backtestResult.trades.forEach((trade: any) => journal.addTrade(trade))

    const csvData = journal.exportToCSV()
    const blob = new Blob([csvData], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "backtest_results.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Backtesting Engine</span>
            <div className="flex space-x-2">
              <Button onClick={runBacktest} disabled={isRunning}>
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </Button>
              <Button onClick={runWalkForward} disabled={isRunning} variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Walk-Forward
              </Button>
              {backtestResult && (
                <Button onClick={downloadResults} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>Comprehensive backtesting with real trade execution simulation</CardDescription>
        </CardHeader>
        {isRunning && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentPhase}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Display */}
      {backtestResult && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equity">Equity Curve</TabsTrigger>
            <TabsTrigger value="trades">Trade Analysis</TabsTrigger>
            <TabsTrigger value="regime">Regime Performance</TabsTrigger>
            <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Return</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${backtestResult.performance.totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {backtestResult.performance.totalReturn >= 0 ? "+" : ""}
                    {backtestResult.performance.totalReturn.toFixed(2)}%
                  </div>
                  <p className="text-xs text-gray-500">CAGR: {backtestResult.performance.cagr.toFixed(2)}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Sharpe Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{backtestResult.performance.sharpeRatio.toFixed(2)}</div>
                  <p className="text-xs text-gray-500">Sortino: {backtestResult.performance.sortinoRatio.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Max Drawdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    -{backtestResult.performance.maxDrawdown.toFixed(2)}%
                  </div>
                  <p className="text-xs text-gray-500">
                    Duration: {backtestResult.performance.maxDrawdownDuration} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{backtestResult.performance.winRate.toFixed(1)}%</div>
                  <p className="text-xs text-gray-500">{backtestResult.performance.totalTrades} trades</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-2">Return Metrics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Annualized Return:</span>
                        <span className="font-semibold">{backtestResult.performance.annualizedReturn.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Volatility:</span>
                        <span className="font-semibold">{backtestResult.performance.volatility.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Calmar Ratio:</span>
                        <span className="font-semibold">{backtestResult.performance.calmarRatio.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-2">Trade Metrics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Profit Factor:</span>
                        <span className="font-semibold">{backtestResult.performance.profitFactor.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expectancy:</span>
                        <span className="font-semibold">${backtestResult.performance.expectancy.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Win:</span>
                        <span className="font-semibold text-green-600">
                          ${backtestResult.performance.avgWin.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-2">Risk Metrics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>VaR (95%):</span>
                        <span className="font-semibold text-red-600">
                          {backtestResult.performance.var95.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expected Shortfall:</span>
                        <span className="font-semibold text-red-600">
                          {backtestResult.performance.expectedShortfall.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ulcer Index:</span>
                        <span className="font-semibold">{backtestResult.performance.ulcerIndex.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-2">Timing</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Avg Hold Period:</span>
                        <span className="font-semibold">
                          {backtestResult.performance.avgHoldingPeriod.toFixed(1)} days
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Trade Frequency:</span>
                        <span className="font-semibold">
                          {(backtestResult.performance.totalTrades / 252).toFixed(1)}/year
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Loss:</span>
                        <span className="font-semibold text-red-600">
                          -${backtestResult.performance.avgLoss.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equity">
            <Card>
              <CardHeader>
                <CardTitle>Equity Curve & Drawdown</CardTitle>
                <CardDescription>Portfolio performance over time with drawdown periods</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={backtestResult.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="equity"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Portfolio Value"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="drawdown"
                      fill="#ef4444"
                      fillOpacity={0.3}
                      name="Drawdown %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <div className="space-y-6">
              {/* Trade Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Trade Analysis</CardTitle>
                  <CardDescription>Detailed breakdown of all trades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">By Strategy Type</h4>
                      <div className="space-y-2">
                        {Object.entries(backtestResult.performance.regimePerformance).map(
                          ([regime, metrics]: [string, any]) => (
                            <div key={regime} className="flex justify-between items-center p-2 border rounded">
                              <span className="capitalize">{regime.replace("-", " ")}</span>
                              <div className="text-right">
                                <div className="font-semibold">{metrics.trades} trades</div>
                                <div className="text-sm text-gray-600">{metrics.winRate.toFixed(1)}% win rate</div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Performance Distribution</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={Object.entries(backtestResult.performance.regimePerformance).map(
                            ([regime, metrics]: [string, any]) => ({
                              regime: regime.replace("-", " "),
                              return: metrics.avgReturn,
                            }),
                          )}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="regime" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="return" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Risk by Regime</h4>
                      <div className="space-y-2">
                        {Object.entries(backtestResult.performance.regimePerformance).map(
                          ([regime, metrics]: [string, any]) => (
                            <div key={regime} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize">{regime.replace("-", " ")}</span>
                                <span>Max DD: {metrics.maxDrawdown.toFixed(1)}%</span>
                              </div>
                              <Progress value={Math.min(metrics.maxDrawdown, 20) * 5} className="h-1" />
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Trades */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Trades</CardTitle>
                  <CardDescription>Last 10 completed trades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {backtestResult.trades.slice(-10).map((trade: any, index: number) => (
                      <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={trade.strategy === "mean_reversion" ? "default" : "destructive"}>
                            {trade.strategy.replace("_", " ")}
                          </Badge>
                          <div>
                            <p className="font-semibold text-sm">{trade.regime.replace("-", " ")}</p>
                            <p className="text-xs text-gray-500">
                              {trade.entryDate} • {trade.holdingPeriod.toFixed(1)} days
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${trade.pnlDollar >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {trade.pnlDollar >= 0 ? "+" : ""}${trade.pnlDollar.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">{(trade.pnlPercent * 100).toFixed(2)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="regime">
            <Card>
              <CardHeader>
                <CardTitle>Regime Performance Analysis</CardTitle>
                <CardDescription>Performance attribution by market regime</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(backtestResult.performance.regimePerformance).map(
                    ([regime, metrics]: [string, any]) => (
                      <div key={regime} className="p-4 border rounded-lg">
                        <div className="flex items-center mb-3">
                          {regime === "high-correlation" && <TrendingUp className="h-5 w-5 text-green-600 mr-2" />}
                          {regime === "low-correlation" && <TrendingDown className="h-5 w-5 text-red-600 mr-2" />}
                          {regime === "transition" && <Activity className="h-5 w-5 text-yellow-600 mr-2" />}
                          <h4 className="font-semibold capitalize">{regime.replace("-", " ")}</h4>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Trades:</span>
                            <span className="font-semibold">{metrics.trades}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Win Rate:</span>
                            <span className="font-semibold">{metrics.winRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg Return:</span>
                            <span
                              className={`font-semibold ${metrics.avgReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {metrics.avgReturn.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sharpe Ratio:</span>
                            <span className="font-semibold">{metrics.sharpeRatio.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Max Drawdown:</span>
                            <span className="font-semibold text-red-600">{metrics.maxDrawdown.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Time in Regime:</span>
                            <span className="font-semibold">{metrics.timeInRegime.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk">
            <Card>
              <CardHeader>
                <CardTitle>Risk Analysis</CardTitle>
                <CardDescription>Comprehensive risk metrics and analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Value at Risk</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>VaR (95%):</span>
                        <span className="font-semibold text-red-600">
                          {backtestResult.performance.var95.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>VaR (99%):</span>
                        <span className="font-semibold text-red-600">
                          {backtestResult.performance.var99.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Expected Shortfall:</span>
                        <span className="font-semibold text-red-600">
                          {backtestResult.performance.expectedShortfall.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Drawdown Analysis</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Maximum Drawdown:</span>
                        <span className="font-semibold text-red-600">
                          {backtestResult.performance.maxDrawdown.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Drawdown Duration:</span>
                        <span className="font-semibold">{backtestResult.performance.maxDrawdownDuration} days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Ulcer Index:</span>
                        <span className="font-semibold">{backtestResult.performance.ulcerIndex.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Walk-Forward Results */}
      {walkForwardResult && (
        <Card>
          <CardHeader>
            <CardTitle>Walk-Forward Analysis Results</CardTitle>
            <CardDescription>Out-of-sample validation and parameter stability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">In-Sample Avg</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {walkForwardResult.aggregateMetrics.avgInSampleReturn.toFixed(2)}%
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">Out-of-Sample Avg</h4>
                <div className="text-2xl font-bold text-green-600">
                  {walkForwardResult.aggregateMetrics.avgOutOfSampleReturn.toFixed(2)}%
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">Degradation</h4>
                <div className="text-2xl font-bold text-red-600">
                  {walkForwardResult.aggregateMetrics.avgDegradation.toFixed(2)}%
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-2">Consistency</h4>
                <div className="text-2xl font-bold">{walkForwardResult.aggregateMetrics.consistency.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
