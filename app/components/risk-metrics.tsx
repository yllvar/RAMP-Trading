"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AlertTriangle, Shield, TrendingDown, Activity } from "lucide-react"

interface RiskMetricsProps {
  portfolioValue: number
}

// Mock risk data
const varData = [
  { date: "2024-01-01", var95: -2.1, var99: -3.8, actualReturn: -1.2 },
  { date: "2024-01-02", var95: -2.3, var99: -4.1, actualReturn: 1.8 },
  { date: "2024-01-03", var95: -1.9, var99: -3.5, actualReturn: -2.8 },
  { date: "2024-01-04", var95: -2.5, var99: -4.3, actualReturn: 0.5 },
  { date: "2024-01-05", var95: -2.2, var99: -3.9, actualReturn: 2.1 },
  { date: "2024-01-06", var95: -2.0, var99: -3.6, actualReturn: -1.5 },
  { date: "2024-01-07", var95: -2.4, var99: -4.2, actualReturn: 1.3 },
]

const correlationRisk = [
  { asset: "BTC", correlation: 0.45, beta: 1.2, contribution: 35 },
  { asset: "XRP", correlation: 0.45, beta: 0.8, contribution: 25 },
  { asset: "Market", correlation: 0.62, beta: 1.0, contribution: 40 },
]

const stressTests = [
  { scenario: "2018 Crypto Crash", impact: -45.2, probability: "Low", recovery: "8 months" },
  { scenario: "COVID-19 Crash", impact: -32.1, probability: "Medium", recovery: "4 months" },
  { scenario: "Terra Luna Collapse", impact: -28.7, probability: "Medium", recovery: "3 months" },
  { scenario: "FTX Collapse", impact: -22.3, probability: "High", recovery: "2 months" },
]

const riskLimits = [
  { metric: "Portfolio VaR (95%)", current: 2.1, limit: 3.0, status: "safe" },
  { metric: "Max Position Size", current: 45, limit: 60, status: "warning" },
  { metric: "Correlation Risk", current: 0.62, limit: 0.75, status: "safe" },
  { metric: "Leverage Ratio", current: 2.8, limit: 4.0, status: "safe" },
  { metric: "Drawdown Limit", current: 8.2, limit: 15.0, status: "safe" },
]

export default function RiskMetrics({ portfolioValue }: RiskMetricsProps) {
  const currentVaR = 2.1
  const expectedShortfall = 3.2
  const portfolioVolatility = 24.6
  const sharpeRatio = 1.85

  const getRiskStatus = (status: string) => {
    switch (status) {
      case "safe":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "danger":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingDown className="h-4 w-4 mr-2" />
              Value at Risk (95%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{currentVaR}%</div>
            <p className="text-xs text-gray-500">
              ${((portfolioValue * currentVaR) / 100).toLocaleString()} potential loss
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Expected Shortfall
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{expectedShortfall}%</div>
            <p className="text-xs text-gray-500">Tail risk beyond VaR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Portfolio Volatility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioVolatility}%</div>
            <p className="text-xs text-gray-500">Annualized standard deviation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Risk-Adjusted Return
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{sharpeRatio}</div>
            <p className="text-xs text-gray-500">Sharpe ratio</p>
          </CardContent>
        </Card>
      </div>

      {/* VaR Backtesting */}
      <Card>
        <CardHeader>
          <CardTitle>Value at Risk Backtesting</CardTitle>
          <CardDescription>VaR model validation vs actual returns</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={varData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="var95" stroke="#ef4444" strokeDasharray="5 5" name="VaR 95%" />
              <Line type="monotone" dataKey="var99" stroke="#dc2626" strokeDasharray="3 3" name="VaR 99%" />
              <Line type="monotone" dataKey="actualReturn" stroke="#3b82f6" strokeWidth={2} name="Actual Return" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Limits Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Limits Monitoring</CardTitle>
          <CardDescription>Current risk metrics vs established limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskLimits.map((limit, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{limit.metric}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">
                      {limit.current} / {limit.limit}
                    </span>
                    <Badge className={`${getRiskStatus(limit.status)} text-white`}>{limit.status.toUpperCase()}</Badge>
                  </div>
                </div>
                <Progress value={(limit.current / limit.limit) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Correlation Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Correlation Risk Breakdown</CardTitle>
          <CardDescription>Portfolio correlation and beta analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {correlationRisk.map((risk, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-3 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{risk.asset}</h4>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Correlation</p>
                  <p className="font-semibold">{risk.correlation}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Beta</p>
                  <p className="font-semibold">{risk.beta}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Risk Contribution</p>
                  <p className="font-semibold">{risk.contribution}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stress Testing Results */}
      <Card>
        <CardHeader>
          <CardTitle>Stress Testing Scenarios</CardTitle>
          <CardDescription>Portfolio impact under extreme market conditions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stressTests.map((test, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{test.scenario}</h4>
                  <Badge
                    variant={
                      test.probability === "High"
                        ? "destructive"
                        : test.probability === "Medium"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {test.probability} Probability
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Portfolio Impact</p>
                  <p className="font-semibold text-red-600">{test.impact}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Dollar Impact</p>
                  <p className="font-semibold text-red-600">
                    -${Math.abs((portfolioValue * test.impact) / 100).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Recovery Time</p>
                  <p className="font-semibold">{test.recovery}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Alerts */}
      <div className="space-y-4">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-yellow-800">
            <strong>Warning:</strong> Position size approaching 50% limit. Consider reducing exposure or implementing
            additional hedging.
          </AlertDescription>
        </Alert>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            <strong>Info:</strong> Current correlation regime suggests increased monitoring of mean reversion signals.
          </AlertDescription>
        </Alert>
      </div>

      {/* Risk Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Risk Actions</CardTitle>
          <CardDescription>Suggested actions based on current risk profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-semibold">Reduce Position Size</h4>
                <p className="text-sm text-gray-600">Current exposure at 45% of capital</p>
              </div>
              <Badge variant="destructive">High Priority</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-semibold">Implement Stop Loss</h4>
                <p className="text-sm text-gray-600">Set portfolio stop at -10% drawdown</p>
              </div>
              <Badge variant="default">Medium Priority</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-semibold">Diversify Correlation Risk</h4>
                <p className="text-sm text-gray-600">Consider additional uncorrelated pairs</p>
              </div>
              <Badge variant="secondary">Low Priority</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
