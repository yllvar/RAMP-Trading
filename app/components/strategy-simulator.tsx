import { Logger } from "../utils/logger"
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface SimulationResult {
  finalCapital: number
  totalReturn: number
  totalTrades: number
  winRate: number
  maxDrawdown: number
  equityCurve: Array<{ day: number; capital: number; regime: string }>
  tradesByRegime: {
    highCorrelation: { trades: number; winRate: number; avgReturn: number }
    lowCorrelation: { trades: number; winRate: number; avgReturn: number }
    transition: { trades: number; winRate: number; avgReturn: number }
  }
}

export default function StrategySimulator() {
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)

  const runSimulation = async () => {
    setIsSimulating(true)

    // Simulate strategy with mock data
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate processing time

    // Mock simulation results
    const mockEquityCurve = []
    let capital = 100000
    const regimes = ["high-correlation", "low-correlation", "transition"]

    // Generate mock equity curve
    for (let day = 0; day < 252; day++) {
      // 1 year of trading
      const regime = regimes[Math.floor(Math.random() * regimes.length)]
      const dailyReturn = (Math.random() - 0.48) * 0.02 // Slight positive bias

      capital *= 1 + dailyReturn
      mockEquityCurve.push({
        day,
        capital: Math.round(capital),
        regime,
      })
    }

    const result: SimulationResult = {
      finalCapital: capital,
      totalReturn: ((capital - 100000) / 100000) * 100,
      totalTrades: 89,
      winRate: 64.2,
      maxDrawdown: 12.4,
      equityCurve: mockEquityCurve,
      tradesByRegime: {
        highCorrelation: { trades: 45, winRate: 72.1, avgReturn: 2.8 },
        lowCorrelation: { trades: 32, winRate: 58.3, avgReturn: 4.2 },
        transition: { trades: 12, winRate: 41.7, avgReturn: -0.8 },
      },
    }

    setSimulationResult(result)
    setIsSimulating(false)
  }

  return (
    <div className="space-y-6">
      {/* Simulation Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Strategy Simulation</span>
            <Button onClick={runSimulation} disabled={isSimulating}>
              <Play className="h-4 w-4 mr-2" />
              {isSimulating ? "Simulating..." : "Run Simulation"}
            </Button>
          </CardTitle>
          <CardDescription>
            Simulate the Regime-Adaptive Momentum Pairs strategy with historical patterns
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Simulation Results */}
      {simulationResult && (
        <>
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Final Capital</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${simulationResult.finalCapital.toLocaleString()}</div>
                <p className="text-xs text-gray-500">From $100,000</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Return</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${simulationResult.totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {simulationResult.totalReturn >= 0 ? "+" : ""}
                  {simulationResult.totalReturn.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">Annual return</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{simulationResult.winRate.toFixed(1)}%</div>
                <p className="text-xs text-gray-500">{simulationResult.totalTrades} trades</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Max Drawdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">-{simulationResult.maxDrawdown.toFixed(1)}%</div>
                <p className="text-xs text-gray-500">Peak to trough</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Sharpe Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.85</div>
                <p className="text-xs text-gray-500">Risk-adjusted</p>
              </CardContent>
            </Card>
          </div>

          {/* Equity Curve */}
          <Card>
            <CardHeader>
              <CardTitle>Equity Curve</CardTitle>
              <CardDescription>Portfolio value over time with regime indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={simulationResult.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="capital" stroke="#22c55e" strokeWidth={2} name="Portfolio Value" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance by Regime */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Regime</CardTitle>
              <CardDescription>Strategy performance breakdown by market regime</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                      <h4 className="font-semibold">High Correlation</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Trades:</span>
                        <span className="font-semibold">{simulationResult.tradesByRegime.highCorrelation.trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Win Rate:</span>
                        <span className="font-semibold text-green-600">
                          {simulationResult.tradesByRegime.highCorrelation.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Return:</span>
                        <span className="font-semibold">
                          {simulationResult.tradesByRegime.highCorrelation.avgReturn.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Badge className="mt-2 bg-green-100 text-green-800">Mean Reversion</Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center mb-2">
                      <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                      <h4 className="font-semibold">Low Correlation</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Trades:</span>
                        <span className="font-semibold">{simulationResult.tradesByRegime.lowCorrelation.trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Win Rate:</span>
                        <span className="font-semibold text-yellow-600">
                          {simulationResult.tradesByRegime.lowCorrelation.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Return:</span>
                        <span className="font-semibold">
                          {simulationResult.tradesByRegime.lowCorrelation.avgReturn.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Badge className="mt-2 bg-red-100 text-red-800">Momentum</Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center mb-2">
                      <Target className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="font-semibold">Transition</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Trades:</span>
                        <span className="font-semibold">{simulationResult.tradesByRegime.transition.trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Win Rate:</span>
                        <span className="font-semibold text-red-600">
                          {simulationResult.tradesByRegime.transition.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Return:</span>
                        <span className="font-semibold text-red-600">
                          {simulationResult.tradesByRegime.transition.avgReturn.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Badge className="mt-2 bg-yellow-100 text-yellow-800">Conservative</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strategy Insights */}
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              <strong>Strategy Insights:</strong> The simulation shows strong performance in high correlation regimes
              with mean reversion trades achieving 72% win rate. Low correlation momentum trades provide higher average
              returns but with lower consistency. Transition periods require conservative position sizing.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  )
}
