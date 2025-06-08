"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown } from "lucide-react"

interface StrategyDashboardProps {
  isRunning: boolean
  currentRegime: "high-correlation" | "low-correlation" | "transition"
  portfolioValue: number
}

// Mock data for demonstration
const priceData = [
  { date: "2024-01-01", btc: 42000, xrp: 0.62, spread: -0.5 },
  { date: "2024-01-02", btc: 43200, xrp: 0.65, spread: -0.3 },
  { date: "2024-01-03", btc: 41800, xrp: 0.61, spread: -0.8 },
  { date: "2024-01-04", btc: 44500, xrp: 0.68, spread: 0.2 },
  { date: "2024-01-05", btc: 45200, xrp: 0.71, spread: 0.5 },
  { date: "2024-01-06", btc: 43800, xrp: 0.66, spread: -0.1 },
  { date: "2024-01-07", btc: 46100, xrp: 0.73, spread: 0.8 },
]

const correlationData = [
  { date: "2024-01-01", correlation: 0.85, regime: "high" },
  { date: "2024-01-02", correlation: 0.82, regime: "high" },
  { date: "2024-01-03", correlation: 0.78, regime: "high" },
  { date: "2024-01-04", correlation: 0.65, regime: "transition" },
  { date: "2024-01-05", correlation: 0.45, regime: "transition" },
  { date: "2024-01-06", correlation: 0.28, regime: "low" },
  { date: "2024-01-07", correlation: 0.25, regime: "low" },
]

const performanceData = [
  { date: "2024-01-01", portfolio: 100000, benchmark: 100000 },
  { date: "2024-01-02", portfolio: 101200, benchmark: 100800 },
  { date: "2024-01-03", portfolio: 99800, benchmark: 99200 },
  { date: "2024-01-04", portfolio: 103500, benchmark: 101500 },
  { date: "2024-01-05", portfolio: 105800, benchmark: 102200 },
  { date: "2024-01-06", portfolio: 104200, benchmark: 101800 },
  { date: "2024-01-07", portfolio: 107500, benchmark: 103000 },
]

export default function StrategyDashboard({ isRunning, currentRegime, portfolioValue }: StrategyDashboardProps) {
  const currentPositions = [
    {
      pair: "BTC/XRP",
      side: "Long BTC, Short XRP",
      size: "2.5 BTC / 8,500 XRP",
      pnl: 2.3,
      entry: "2024-01-06 14:30",
      regime: "momentum",
    },
    {
      pair: "BTC/XRP",
      side: "Mean Reversion",
      size: "1.8 BTC / 6,200 XRP",
      pnl: -0.8,
      entry: "2024-01-07 09:15",
      regime: "mean-reversion",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Price Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Price Movement & Spread</CardTitle>
            <CardDescription>BTCUSDT vs XRPUSDT with cointegration spread</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="btc" stroke="#f59e0b" name="BTC Price" />
                <Line yAxisId="right" type="monotone" dataKey="xrp" stroke="#3b82f6" name="XRP Price" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="spread"
                  stroke="#ef4444"
                  name="Spread Z-Score"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rolling Correlation & Regime</CardTitle>
            <CardDescription>30-day rolling correlation with regime detection</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Area type="monotone" dataKey="correlation" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                <Line type="monotone" dataKey={0.7} stroke="#22c55e" strokeDasharray="3 3" />
                <Line type="monotone" dataKey={0.3} stroke="#ef4444" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Performance</CardTitle>
          <CardDescription>Portfolio value vs benchmark comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="portfolio" stroke="#22c55e" strokeWidth={3} name="Strategy Portfolio" />
              <Line type="monotone" dataKey="benchmark" stroke="#6b7280" strokeWidth={2} name="Buy & Hold Benchmark" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Current Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Current Positions</CardTitle>
          <CardDescription>Active trades and their performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentPositions.map((position, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{position.pair}</h3>
                    <Badge variant={position.regime === "momentum" ? "destructive" : "default"}>
                      {position.regime}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{position.side}</p>
                  <p className="text-xs text-gray-500">Size: {position.size}</p>
                  <p className="text-xs text-gray-500">Entry: {position.entry}</p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center ${position.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {position.pnl >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    <span className="font-semibold ml-1">
                      {position.pnl >= 0 ? "+" : ""}
                      {position.pnl}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategy Signals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Z-Score:</span>
                <span className="font-semibold text-red-600">-2.8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Correlation:</span>
                <span className="font-semibold text-yellow-600">0.45</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Volatility:</span>
                <span className="font-semibold text-green-600">High</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Portfolio Risk:</span>
                <span className="font-semibold">45%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Max Drawdown:</span>
                <span className="font-semibold text-red-600">-8.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Sharpe Ratio:</span>
                <span className="font-semibold text-green-600">1.85</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trade Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Win Rate:</span>
                <span className="font-semibold text-green-600">68%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Avg Hold Time:</span>
                <span className="font-semibold">4.2 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Trades:</span>
                <span className="font-semibold">47</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
