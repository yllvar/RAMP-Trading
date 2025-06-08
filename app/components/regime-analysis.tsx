"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"

interface RegimeAnalysisProps {
  currentRegime: "high-correlation" | "low-correlation" | "transition"
}

const regimeHistory = [
  { date: "2024-01-01", regime: "high-correlation", duration: 15, performance: 5.2 },
  { date: "2024-01-16", regime: "transition", duration: 3, performance: -1.1 },
  { date: "2024-01-19", regime: "low-correlation", duration: 8, performance: 12.8 },
  { date: "2024-01-27", regime: "high-correlation", duration: 12, performance: 3.7 },
  { date: "2024-02-08", regime: "transition", duration: 2, performance: -0.5 },
  { date: "2024-02-10", regime: "low-correlation", duration: 6, performance: 8.9 },
]

const regimeStats = [
  { regime: "High Correlation", count: 145, avgDuration: 8.5, avgReturn: 4.2, winRate: 72 },
  { regime: "Low Correlation", count: 89, avgDuration: 5.2, avgReturn: 9.8, winRate: 58 },
  { regime: "Transition", count: 67, avgDuration: 2.1, avgReturn: -0.8, winRate: 45 },
]

const correlationDistribution = [
  { range: "0.0-0.2", count: 23, color: "#ef4444" },
  { range: "0.2-0.4", count: 45, color: "#f97316" },
  { range: "0.4-0.6", count: 67, color: "#eab308" },
  { range: "0.6-0.8", count: 89, color: "#22c55e" },
  { range: "0.8-1.0", count: 76, color: "#16a34a" },
]

const regimeTransitions = [
  { from: "High Correlation", to: "Transition", probability: 0.25 },
  { from: "High Correlation", to: "Low Correlation", probability: 0.15 },
  { from: "Low Correlation", to: "Transition", probability: 0.35 },
  { from: "Low Correlation", to: "High Correlation", probability: 0.2 },
  { from: "Transition", to: "High Correlation", probability: 0.45 },
  { from: "Transition", to: "Low Correlation", probability: 0.4 },
]

export default function RegimeAnalysis({ currentRegime }: RegimeAnalysisProps) {
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
    <div className="space-y-6">
      {/* Current Regime Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Current Regime Analysis</span>
            <Badge className={`${getRegimeColor(currentRegime)} text-white`}>
              {getRegimeIcon(currentRegime)}
              <span className="ml-1 capitalize">{currentRegime.replace("-", " ")}</span>
            </Badge>
          </CardTitle>
          <CardDescription>Real-time regime detection and characteristics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">30-Day Correlation</h4>
              <div className="text-2xl font-bold">0.45</div>
              <Progress value={45} className="h-2" />
              <p className="text-xs text-gray-500">Threshold: 0.3 - 0.7</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Cointegration P-Value</h4>
              <div className="text-2xl font-bold">0.08</div>
              <Progress value={80} className="h-2" />
              <p className="text-xs text-gray-500">Significance: 0.05</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Volatility Percentile</h4>
              <div className="text-2xl font-bold">75%</div>
              <Progress value={75} className="h-2" />
              <p className="text-xs text-gray-500">High volatility regime</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Regime Confidence</h4>
              <div className="text-2xl font-bold">82%</div>
              <Progress value={82} className="h-2" />
              <p className="text-xs text-gray-500">Classification certainty</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regime Performance Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Regime Performance Statistics</CardTitle>
          <CardDescription>Historical performance by market regime</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regimeStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="regime" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="avgReturn" fill="#22c55e" name="Avg Return %" />
              <Bar yAxisId="right" dataKey="winRate" fill="#3b82f6" name="Win Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Regime History and Transitions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Regime History</CardTitle>
            <CardDescription>Last 6 regime periods and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regimeHistory.map((period, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={`${getRegimeColor(period.regime as any)} text-white`}>
                      {getRegimeIcon(period.regime)}
                    </Badge>
                    <div>
                      <p className="font-semibold text-sm capitalize">{period.regime.replace("-", " ")}</p>
                      <p className="text-xs text-gray-500">
                        {period.date} • {period.duration} days
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${period.performance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {period.performance >= 0 ? "+" : ""}
                    {period.performance}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Correlation Distribution</CardTitle>
            <CardDescription>Historical correlation ranges and frequency</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={correlationDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  label={({ range, count }) => `${range}: ${count}`}
                >
                  {correlationDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Regime Transition Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Regime Transition Probabilities</CardTitle>
          <CardDescription>Likelihood of transitioning between different market regimes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["High Correlation", "Low Correlation", "Transition"].map((fromRegime) => (
              <div key={fromRegime} className="space-y-3">
                <h4 className="font-semibold text-sm">From {fromRegime}</h4>
                {regimeTransitions
                  .filter((t) => t.from === fromRegime)
                  .map((transition, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>To {transition.to}</span>
                        <span className="font-semibold">{(transition.probability * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={transition.probability * 100} className="h-2" />
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Warnings */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <span>Regime Risk Warnings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-800">
          <div className="space-y-2 text-sm">
            <p>
              • <strong>Transition Regime:</strong> Reduced position sizes recommended due to uncertainty
            </p>
            <p>
              • <strong>High Volatility:</strong> Increased risk of regime misclassification
            </p>
            <p>
              • <strong>Correlation Instability:</strong> Monitor for potential regime shifts
            </p>
            <p>
              • <strong>Model Risk:</strong> Historical patterns may not predict future regime behavior
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
