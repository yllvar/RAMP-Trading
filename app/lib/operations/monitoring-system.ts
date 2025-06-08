/**
 * Production Operations and Monitoring System
 * Enterprise-grade monitoring, alerting, and operational controls
 */

export interface SystemMetrics {
  timestamp: Date

  // Performance metrics
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_io: number

  // Application metrics
  active_connections: number
  requests_per_second: number
  response_time_avg: number
  response_time_p95: number
  response_time_p99: number

  // Trading metrics
  orders_per_second: number
  fills_per_second: number
  latency_to_exchange: number
  market_data_lag: number

  // Error metrics
  error_rate: number
  timeout_rate: number
  retry_rate: number

  // Business metrics
  pnl_realtime: number
  positions_count: number
  capital_utilization: number
  risk_score: number
}

export interface Alert {
  id: string
  timestamp: Date
  severity: "info" | "warning" | "error" | "critical"
  category: "system" | "trading" | "risk" | "compliance" | "business"
  title: string
  description: string
  source: string

  // Alert details
  metric_name?: string
  current_value?: number
  threshold_value?: number

  // Status
  status: "active" | "acknowledged" | "resolved"
  acknowledged_by?: string
  acknowledged_at?: Date
  resolved_at?: Date

  // Actions
  recommended_actions: string[]
  auto_actions_taken: string[]

  // Escalation
  escalation_level: number
  escalated_to?: string[]
  escalated_at?: Date
}

export interface HealthCheck {
  component: string
  status: "healthy" | "degraded" | "unhealthy"
  last_check: Date
  response_time: number
  error_message?: string
  dependencies: string[]
}

export interface PerformanceReport {
  period: "hourly" | "daily" | "weekly" | "monthly"
  start_date: Date
  end_date: Date

  // System performance
  avg_cpu_usage: number
  avg_memory_usage: number
  avg_response_time: number
  uptime_percentage: number

  // Trading performance
  total_trades: number
  successful_trades: number
  failed_trades: number
  avg_execution_time: number

  // Business performance
  total_pnl: number
  sharpe_ratio: number
  max_drawdown: number
  win_rate: number

  // Alerts summary
  total_alerts: number
  critical_alerts: number
  avg_resolution_time: number
}

/**
 * Production Monitoring System
 */
export class ProductionMonitoringSystem {
  private metrics: SystemMetrics[] = []
  private alerts: Map<string, Alert> = new Map()
  private healthChecks: Map<string, HealthCheck> = new Map()
  private alertRules: Map<string, AlertRule> = new Map()

  private monitoringInterval?: NodeJS.Timeout
  private isMonitoring = false

  // Configuration
  private config = {
    metricsRetentionDays: 30,
    alertRetentionDays: 90,
    monitoringFrequency: 5000, // 5 seconds
    healthCheckFrequency: 30000, // 30 seconds
    autoResolveTimeout: 300000, // 5 minutes
  }

  constructor() {
    this.initializeAlertRules()
    this.initializeHealthChecks()
  }

  /**
   * Initialize alert rules
   */
  private initializeAlertRules(): void {
    const rules: AlertRule[] = [
      // System alerts
      {
        id: "high_cpu_usage",
        name: "High CPU Usage",
        metric: "cpu_usage",
        threshold: 80,
        operator: ">",
        severity: "warning",
        category: "system",
        description: "CPU usage is above 80%",
        actions: ["Scale up instances", "Check for resource leaks"],
      },
      {
        id: "critical_cpu_usage",
        name: "Critical CPU Usage",
        metric: "cpu_usage",
        threshold: 95,
        operator: ">",
        severity: "critical",
        category: "system",
        description: "CPU usage is critically high",
        actions: ["Immediate scaling", "Emergency intervention"],
      },
      {
        id: "high_memory_usage",
        name: "High Memory Usage",
        metric: "memory_usage",
        threshold: 85,
        operator: ">",
        severity: "warning",
        category: "system",
        description: "Memory usage is above 85%",
        actions: ["Monitor for memory leaks", "Consider scaling"],
      },
      {
        id: "high_error_rate",
        name: "High Error Rate",
        metric: "error_rate",
        threshold: 5,
        operator: ">",
        severity: "error",
        category: "trading",
        description: "Error rate is above 5%",
        actions: ["Check logs", "Investigate root cause"],
      },
      {
        id: "high_latency",
        name: "High Exchange Latency",
        metric: "latency_to_exchange",
        threshold: 100,
        operator: ">",
        severity: "warning",
        category: "trading",
        description: "Latency to exchange is above 100ms",
        actions: ["Check network", "Consider failover"],
      },
      {
        id: "max_drawdown_breach",
        name: "Maximum Drawdown Breach",
        metric: "risk_score",
        threshold: 8,
        operator: ">",
        severity: "critical",
        category: "risk",
        description: "Risk score indicates potential drawdown breach",
        actions: ["Reduce positions", "Emergency risk review"],
      },
    ]

    rules.forEach((rule) => {
      this.alertRules.set(rule.id, rule)
    })
  }

  /**
   * Initialize health checks
   */
  private initializeHealthChecks(): void {
    const healthChecks = [
      "database",
      "exchange_api",
      "market_data_feed",
      "risk_engine",
      "order_management",
      "portfolio_service",
      "notification_service",
    ]

    healthChecks.forEach((component) => {
      this.healthChecks.set(component, {
        component,
        status: "healthy",
        last_check: new Date(),
        response_time: 0,
        dependencies: [],
      })
    })
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log("Monitoring already active")
      return
    }

    this.isMonitoring = true

    // Start metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.evaluateAlertRules()
    }, this.config.monitoringFrequency)

    // Start health checks
    setInterval(() => {
      this.performHealthChecks()
    }, this.config.healthCheckFrequency)

    console.log("Production monitoring started")
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
    this.isMonitoring = false
    console.log("Production monitoring stopped")
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // In practice, these would come from actual system monitoring
      const metrics: SystemMetrics = {
        timestamp: new Date(),

        // Simulated system metrics
        cpu_usage: 20 + Math.random() * 60,
        memory_usage: 30 + Math.random() * 50,
        disk_usage: 40 + Math.random() * 30,
        network_io: Math.random() * 1000,

        // Simulated application metrics
        active_connections: 50 + Math.random() * 200,
        requests_per_second: 100 + Math.random() * 500,
        response_time_avg: 10 + Math.random() * 40,
        response_time_p95: 50 + Math.random() * 100,
        response_time_p99: 100 + Math.random() * 200,

        // Simulated trading metrics
        orders_per_second: Math.random() * 10,
        fills_per_second: Math.random() * 5,
        latency_to_exchange: 20 + Math.random() * 80,
        market_data_lag: Math.random() * 50,

        // Simulated error metrics
        error_rate: Math.random() * 10,
        timeout_rate: Math.random() * 5,
        retry_rate: Math.random() * 15,

        // Simulated business metrics
        pnl_realtime: -1000 + Math.random() * 2000,
        positions_count: Math.floor(Math.random() * 10),
        capital_utilization: 0.3 + Math.random() * 0.4,
        risk_score: 1 + Math.random() * 8,
      }

      this.metrics.push(metrics)

      // Limit metrics history
      const cutoffDate = new Date(Date.now() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000)
      this.metrics = this.metrics.filter((m) => m.timestamp >= cutoffDate)
    } catch (error) {
      console.error("Error collecting metrics:", error)
    }
  }

  /**
   * Evaluate alert rules
   */
  private evaluateAlertRules(): void {
    if (this.metrics.length === 0) return

    const latestMetrics = this.metrics[this.metrics.length - 1]

    for (const [ruleId, rule] of this.alertRules.entries()) {
      const metricValue = this.getMetricValue(latestMetrics, rule.metric)

      if (this.evaluateCondition(metricValue, rule.threshold, rule.operator)) {
        this.triggerAlert(rule, metricValue)
      }
    }
  }

  /**
   * Get metric value by name
   */
  private getMetricValue(metrics: SystemMetrics, metricName: string): number {
    return (metrics as any)[metricName] || 0
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case ">":
        return value > threshold
      case "<":
        return value < threshold
      case ">=":
        return value >= threshold
      case "<=":
        return value <= threshold
      case "==":
        return value === threshold
      case "!=":
        return value !== threshold
      default:
        return false
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, currentValue: number): void {
    // Check if alert already exists and is active
    const existingAlert = Array.from(this.alerts.values()).find(
      (alert) => alert.metric_name === rule.metric && alert.status === "active",
    )

    if (existingAlert) return // Don't create duplicate alerts

    const alert: Alert = {
      id: `alert_${rule.id}_${Date.now()}`,
      timestamp: new Date(),
      severity: rule.severity,
      category: rule.category,
      title: rule.name,
      description: rule.description,
      source: "monitoring_system",

      metric_name: rule.metric,
      current_value: currentValue,
      threshold_value: rule.threshold,

      status: "active",

      recommended_actions: rule.actions,
      auto_actions_taken: [],

      escalation_level: 0,
    }

    this.alerts.set(alert.id, alert)

    // Perform auto-actions if configured
    this.performAutoActions(alert, rule)

    // Send notifications
    this.sendAlertNotification(alert)

    console.log(`Alert triggered: ${alert.title} - ${alert.description}`)
  }

  /**
   * Perform automatic actions
   */
  private performAutoActions(alert: Alert, rule: AlertRule): void {
    const autoActions: string[] = []

    // Auto-scaling for high resource usage
    if (rule.metric === "cpu_usage" && alert.current_value! > 90) {
      autoActions.push("Auto-scaling triggered")
      // In practice, trigger actual auto-scaling
    }

    // Emergency position reduction for high risk
    if (rule.metric === "risk_score" && alert.current_value! > 8) {
      autoActions.push("Emergency position reduction initiated")
      // In practice, trigger actual position reduction
    }

    alert.auto_actions_taken = autoActions
  }

  /**
   * Send alert notification
   */
  private sendAlertNotification(alert: Alert): void {
    // In practice, send to Slack, email, SMS, etc.
    console.log(`🚨 ${alert.severity.toUpperCase()}: ${alert.title}`)
    console.log(`Description: ${alert.description}`)
    console.log(`Current Value: ${alert.current_value}`)
    console.log(`Threshold: ${alert.threshold_value}`)
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    for (const [component, healthCheck] of this.healthChecks.entries()) {
      try {
        const startTime = Date.now()

        // Simulate health check
        const isHealthy = await this.checkComponentHealth(component)

        const responseTime = Date.now() - startTime

        healthCheck.last_check = new Date()
        healthCheck.response_time = responseTime
        healthCheck.status = isHealthy ? "healthy" : "unhealthy"
        healthCheck.error_message = isHealthy ? undefined : "Component check failed"

        // Create alert for unhealthy components
        if (!isHealthy) {
          this.createHealthAlert(component, healthCheck)
        }
      } catch (error) {
        healthCheck.status = "unhealthy"
        healthCheck.error_message = error instanceof Error ? error.message : "Unknown error"
        this.createHealthAlert(component, healthCheck)
      }
    }
  }

  /**
   * Check individual component health
   */
  private async checkComponentHealth(component: string): Promise<boolean> {
    // Simulate health checks with random failures
    const failureRate = 0.05 // 5% failure rate

    // Add some delay to simulate real checks
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))

    return Math.random() > failureRate
  }

  /**
   * Create health alert
   */
  private createHealthAlert(component: string, healthCheck: HealthCheck): void {
    const alert: Alert = {
      id: `health_${component}_${Date.now()}`,
      timestamp: new Date(),
      severity: "error",
      category: "system",
      title: `${component} Health Check Failed`,
      description: `Component ${component} is unhealthy: ${healthCheck.error_message}`,
      source: "health_check",

      status: "active",

      recommended_actions: [`Check ${component} logs`, `Restart ${component} service`, "Investigate dependencies"],
      auto_actions_taken: [],

      escalation_level: 0,
    }

    this.alerts.set(alert.id, alert)
    this.sendAlertNotification(alert)
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert || alert.status !== "active") return false

    alert.status = "acknowledged"
    alert.acknowledged_by = acknowledgedBy
    alert.acknowledged_at = new Date()

    return true
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false

    alert.status = "resolved"
    alert.resolved_at = new Date()

    return true
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter((alert) => alert.status === "active")
      .sort((a, b) => {
        const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })
  }

  /**
   * Get alerts by category
   */
  getAlertsByCategory(category: Alert["category"]): Alert[] {
    return Array.from(this.alerts.values())
      .filter((alert) => alert.category === category)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    overall_status: "healthy" | "degraded" | "unhealthy"
    components: HealthCheck[]
    unhealthy_count: number
    last_updated: Date
  } {
    const components = Array.from(this.healthChecks.values())
    const unhealthyCount = components.filter((c) => c.status === "unhealthy").length
    const degradedCount = components.filter((c) => c.status === "degraded").length

    let overallStatus: "healthy" | "degraded" | "unhealthy"
    if (unhealthyCount > 0) {
      overallStatus = "unhealthy"
    } else if (degradedCount > 0) {
      overallStatus = "degraded"
    } else {
      overallStatus = "healthy"
    }

    return {
      overall_status: overallStatus,
      components,
      unhealthy_count: unhealthyCount,
      last_updated: new Date(),
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours = 24): SystemMetrics[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.metrics.filter((m) => m.timestamp >= cutoffTime)
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(
    period: "hourly" | "daily" | "weekly" | "monthly",
    startDate?: Date,
    endDate?: Date,
  ): PerformanceReport {
    const now = new Date()

    if (!startDate || !endDate) {
      switch (period) {
        case "hourly":
          startDate = new Date(now.getTime() - 60 * 60 * 1000)
          endDate = now
          break
        case "daily":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          endDate = now
          break
        case "weekly":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          endDate = now
          break
        case "monthly":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          endDate = now
          break
      }
    }

    const periodMetrics = this.metrics.filter((m) => m.timestamp >= startDate! && m.timestamp <= endDate!)

    const periodAlerts = Array.from(this.alerts.values()).filter(
      (a) => a.timestamp >= startDate! && a.timestamp <= endDate!,
    )

    // Calculate averages
    const avgCpuUsage = this.calculateAverage(periodMetrics, "cpu_usage")
    const avgMemoryUsage = this.calculateAverage(periodMetrics, "memory_usage")
    const avgResponseTime = this.calculateAverage(periodMetrics, "response_time_avg")

    // Calculate uptime
    const totalMinutes = (endDate!.getTime() - startDate!.getTime()) / (1000 * 60)
    const downtimeMinutes = periodAlerts.filter((a) => a.severity === "critical").length * 5 // Assume 5 min downtime per critical alert
    const uptimePercentage = Math.max(0, ((totalMinutes - downtimeMinutes) / totalMinutes) * 100)

    return {
      period,
      start_date: startDate!,
      end_date: endDate!,

      avg_cpu_usage: avgCpuUsage,
      avg_memory_usage: avgMemoryUsage,
      avg_response_time: avgResponseTime,
      uptime_percentage: uptimePercentage,

      total_trades: Math.floor((this.calculateSum(periodMetrics, "orders_per_second") * totalMinutes) / 60),
      successful_trades: Math.floor((this.calculateSum(periodMetrics, "fills_per_second") * totalMinutes) / 60),
      failed_trades: Math.floor((this.calculateSum(periodMetrics, "error_rate") * totalMinutes) / 60),
      avg_execution_time: this.calculateAverage(periodMetrics, "latency_to_exchange"),

      total_pnl: this.calculateSum(periodMetrics, "pnl_realtime"),
      sharpe_ratio: 1.5, // Placeholder
      max_drawdown: 5.0, // Placeholder
      win_rate: 65.0, // Placeholder

      total_alerts: periodAlerts.length,
      critical_alerts: periodAlerts.filter((a) => a.severity === "critical").length,
      avg_resolution_time: this.calculateAverageResolutionTime(periodAlerts),
    }
  }

  /**
   * Calculate average for metric
   */
  private calculateAverage(metrics: SystemMetrics[], field: keyof SystemMetrics): number {
    if (metrics.length === 0) return 0
    const sum = metrics.reduce((total, m) => total + (m[field] as number), 0)
    return sum / metrics.length
  }

  /**
   * Calculate sum for metric
   */
  private calculateSum(metrics: SystemMetrics[], field: keyof SystemMetrics): number {
    return metrics.reduce((total, m) => total + (m[field] as number), 0)
  }

  /**
   * Calculate average resolution time
   */
  private calculateAverageResolutionTime(alerts: Alert[]): number {
    const resolvedAlerts = alerts.filter((a) => a.resolved_at && a.timestamp)

    if (resolvedAlerts.length === 0) return 0

    const totalResolutionTime = resolvedAlerts.reduce((total, alert) => {
      const resolutionTime = alert.resolved_at!.getTime() - alert.timestamp.getTime()
      return total + resolutionTime
    }, 0)

    return totalResolutionTime / resolvedAlerts.length / 1000 / 60 // Convert to minutes
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    total_alerts: number
    active_alerts: number
    critical_alerts: number
    alerts_by_category: { [category: string]: number }
    alerts_by_severity: { [severity: string]: number }
    avg_resolution_time: number
  } {
    const allAlerts = Array.from(this.alerts.values())
    const activeAlerts = allAlerts.filter((a) => a.status === "active")
    const criticalAlerts = allAlerts.filter((a) => a.severity === "critical")

    const alertsByCategory: { [category: string]: number } = {}
    const alertsBySeverity: { [severity: string]: number } = {}

    allAlerts.forEach((alert) => {
      alertsByCategory[alert.category] = (alertsByCategory[alert.category] || 0) + 1
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1
    })

    return {
      total_alerts: allAlerts.length,
      active_alerts: activeAlerts.length,
      critical_alerts: criticalAlerts.length,
      alerts_by_category: alertsByCategory,
      alerts_by_severity: alertsBySeverity,
      avg_resolution_time: this.calculateAverageResolutionTime(allAlerts),
    }
  }
}

interface AlertRule {
  id: string
  name: string
  metric: string
  threshold: number
  operator: ">" | "<" | ">=" | "<=" | "==" | "!="
  severity: "info" | "warning" | "error" | "critical"
  category: "system" | "trading" | "risk" | "compliance" | "business"
  description: string
  actions: string[]
}
