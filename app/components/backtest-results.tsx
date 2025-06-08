"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Download, Play, Settings } from "lucide-react"

// Mock backtest data
const equityCurve = [
  { date: "2023-01-01", portfolio: 100000, benchmark: 100000, drawdown: 0 },
  { date: "2023-02-01", portfolio: 105200, benchmark: 102800, drawdown: -2.1 },
  { date: "2023-03-01", portfolio: 98500, benchmark: 98200, drawdown: -6.7 },
  { date: "2023-04-01", portfolio: 112300, benchmark: 105600, drawdown: 0 },
  { date: "2023-05-01", portfolio: 118900, benchmark: 108200, drawdown: 0 },
  { date: "2023-06-01", portfolio: 115600, benchmark: 106800, drawdown: -2.8 },
  { date: "2023-07-01", portfolio: 125400, benchmark: 112500, drawdown: 0 },
  { date: "2023-08-01", portfolio: 119800, benchmark: 109200, drawdown: -4.5 },
  { date: "2023-09-01", portfolio: 132100, benchmark: 115800, drawdown: 0 },
  { date: "2023-10-01", portfolio: 128700, benchmark: 113400, drawdown: -2.6 },
  { date: "2023-11-01", portfolio: 141500, benchmark: 120600, drawdown: 0 },
  { date: "2023-12-01", portfolio: 147300, benchmark: 125200, drawdown: 0 },
]

const monthlyReturns = [
  { month: "Jan", strategy: 5.2, benchmark: 2.8, regime: "high" },
  { month: "Feb", strategy: -6.4, benchmark: -4.5, regime: "transition" },
  { month: "Mar", strategy: 14.0, benchmark: 7.5, regime: "low" },
  { month: "Apr", strategy: 5.9, benchmark: 2.5, regime: "high" },
  { month: "May", strategy: -2.8, benchmark: 1.2, regime: "transition" },
  { month: "Jun", strategy: 8.5, benchmark: 4.8, regime: "low" },
  { month: "Jul", strategy: -4.5, benchmark: -2.1, regime: "transition" },
  { month: "Aug", strategy: 10.3, benchmark: 6.0, regime: "low" },
  { month: "Sep", strategy: -2.6, benchmark: 0.8, regime: "high" },
  { month: "Oct", strategy: 9.9, benchmark: 6.2, regime: "low" },
  { month: "Nov", strategy: 4.1, benchmark: 2.9, regime: "high" },
  { month: "Dec", strategy: 7.3, benchmark: 4.5, regime: "high" },
]

const tradeAnalysis = [
  { type: "Mean Reversion", trades: 156, winRate: 72, avgReturn: 2.8, avgDuration: 4.2 },
  { type: "Momentum", trades: 89, winRate: 58, avgReturn: 6.4, avgDuration: 3.1 },
  { type: "Transition", trades: 34, winRate: 44, avgReturn: -1.2, avgDuration: 2.8 },
]

export default function BacktestResults() {
  const backtestMetrics = {
    totalReturn: 47.3,
    annualizedReturn: 18.9,
    volatility: 24.6,
    sharpeRatio: 1.85,
    maxDrawdown: -12.4,
    calmarRatio: 1.52,
    winRate: 64.2,
    profitFactor: 2.31,
    totalTrades: 279,
    avgTradeDuration: 3.7,
  }

  return (
    <div className="space-y-6">
      {/* Backtest Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Backtest Configuration</span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <Button size="sm">
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </Button>
            </div>
          </CardTitle>
          <CardDescription>Period: Jan 2023 - Dec 2023 • Initial Capital: $100,000 • Commission: 0.1%</CardDescription>
        </CardHeader>
      </Card>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Return</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{backtestMetrics.totalReturn}%</div>
            <p className="text-xs text-gray-500">vs {(((125200 - 100000) / 100000) * 100).toFixed(1)}% benchmark</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sharpe Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backtestMetrics.sharpeRatio}</div>
            <p className="text-xs text-gray-500">Risk-adjusted return</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{backtestMetrics.maxDrawdown}%</div>
            <p className="text-xs text-gray-500">Peak to trough</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backtestMetrics.winRate}%</div>
            <p className="text-xs text-gray-500">{backtestMetrics.totalTrades} total trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backtestMetrics.profitFactor}</div>
            <p className="text-xs text-gray-500">Gross profit / loss</p>
          </CardContent>
        </Card>
      </div>

      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve & Drawdown</CardTitle>
          <CardDescription>Portfolio performance vs benchmark with drawdown periods</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="portfolio"
                stroke="#22c55e"
                strokeWidth={3}
                name="Strategy"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="benchmark"
                stroke="#6b7280"
                strokeWidth={2}
                name="Benchmark"
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

      {/* Monthly Returns */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Returns Analysis</CardTitle>
          <CardDescription>Strategy vs benchmark monthly performance by regime</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyReturns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="strategy" fill="#22c55e" name="Strategy %" />
              <Bar dataKey="benchmark" fill="#6b7280" name="Benchmark %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trade Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Analysis by Strategy Type</CardTitle>
          <CardDescription>Performance breakdown by mean reversion vs momentum trades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tradeAnalysis.map((analysis, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{analysis.type}</h4>
                  <Badge
                    variant={
                      analysis.type === "Mean Reversion"
                        ? "default"
                        : analysis.type === "Momentum"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {analysis.trades} trades
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Win Rate</p>
                  <p className="font-semibold">{analysis.winRate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Avg Return</p>
                  <p className={`font-semibold ${analysis.avgReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {analysis.avgReturn >= 0 ? "+" : ""}
                    {analysis.avgReturn}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Avg Duration</p>
                  <p className="font-semibold">{analysis.avgDuration} days</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Contribution</p>
                  <p className="font-semibold">{((analysis.trades / backtestMetrics.totalTrades) * 100).toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Detailed Risk Metrics</span>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-gray-600">Return Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Return:</span>
                  <span className="font-semibold text-green-600">+{backtestMetrics.totalReturn}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Annualized:</span>
                  <span className="font-semibold">{backtestMetrics.annualizedReturn}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Volatility:</span>
                  <span className="font-semibold">{backtestMetrics.volatility}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-gray-600">Risk Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Sharpe Ratio:</span>
                  <span className="font-semibold">{backtestMetrics.sharpeRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Calmar Ratio:</span>
                  <span className="font-semibold">{backtestMetrics.calmarRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Max Drawdown:</span>
                  <span className="font-semibold text-red-600">{backtestMetrics.maxDrawdown}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-gray-600">Trade Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Trades:</span>
                  <span className="font-semibold">{backtestMetrics.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Win Rate:</span>
                  <span className="font-semibold">{backtestMetrics.winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Profit Factor:</span>
                  <span className="font-semibold">{backtestMetrics.profitFactor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-gray-600">Efficiency</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Avg Trade:</span>
                  <span className="font-semibold">{backtestMetrics.avgTradeDuration} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Trades/Month:</span>
                  <span className="font-semibold">{Math.round(backtestMetrics.totalTrades / 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Alpha:</span>
                  <span className="font-semibold text-green-600">+12.8%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
