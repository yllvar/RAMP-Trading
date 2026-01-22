import { Logger } from "../utils/logger"
export interface SentimentData {
  timestamp: Date
  source: string
  sentiment: "bullish" | "bearish" | "neutral"
  score: number // -1 to 1
  confidence: number // 0 to 1
  volume: number // number of mentions/posts
  keywords: string[]
  asset: string
}

export interface OnChainMetrics {
  timestamp: Date
  asset: string
  activeAddresses: number
  transactionCount: number
  transactionVolume: number
  networkValue: number
  hashRate?: number
  stakingRatio?: number
  exchangeInflows: number
  exchangeOutflows: number
  whaleActivity: number
  hodlerRatio: number
}

export interface NewsEvent {
  timestamp: Date
  title: string
  content: string
  source: string
  sentiment: "positive" | "negative" | "neutral"
  relevanceScore: number
  impactScore: number
  assets: string[]
  categories: string[]
}

export interface MarketRegimeIndicators {
  timestamp: Date
  volatilityRegime: "low" | "medium" | "high"
  liquidityRegime: "abundant" | "normal" | "scarce"
  riskRegime: "risk-on" | "risk-off" | "neutral"
  correlationRegime: "high" | "low" | "normal"
  sentimentRegime: "euphoria" | "fear" | "greed" | "neutral"
  overallRegime: "bull" | "bear" | "sideways" | "transition"
  confidence: number
}

export interface AlternativeDataConfig {
  sentimentSources: {
    twitter: boolean
    reddit: boolean
    news: boolean
    telegram: boolean
  }
  onChainSources: {
    glassnode: boolean
    chainalysis: boolean
    coinmetrics: boolean
  }
  newsSources: {
    cryptonews: boolean
    coindesk: boolean
    cointelegraph: boolean
  }
  updateFrequency: number // minutes
  lookbackPeriod: number // days
  apiKeys: {
    [source: string]: string
  }
}

/**
 * Alternative data integration and processing
 */
export class AlternativeDataIntegrator {
  private config: AlternativeDataConfig
  private sentimentHistory: Map<string, SentimentData[]> = new Map()
  private onChainHistory: Map<string, OnChainMetrics[]> = new Map()
  private newsHistory: NewsEvent[] = []
  private regimeHistory: MarketRegimeIndicators[] = []

  constructor(config: AlternativeDataConfig) {
    this.config = config
  }

  /**
   * Collect sentiment data from various sources
   */
  async collectSentimentData(assets: string[]): Promise<SentimentData[]> {
    const sentimentData: SentimentData[] = []

    for (const asset of assets) {
      // Twitter sentiment
      if (this.config.sentimentSources.twitter) {
        const twitterSentiment = await this.getTwitterSentiment(asset)
        if (twitterSentiment) sentimentData.push(twitterSentiment)
      }

      // Reddit sentiment
      if (this.config.sentimentSources.reddit) {
        const redditSentiment = await this.getRedditSentiment(asset)
        if (redditSentiment) sentimentData.push(redditSentiment)
      }

      // News sentiment
      if (this.config.sentimentSources.news) {
        const newsSentiment = await this.getNewsSentiment(asset)
        if (newsSentiment) sentimentData.push(newsSentiment)
      }
    }

    // Store in history
    for (const data of sentimentData) {
      if (!this.sentimentHistory.has(data.asset)) {
        this.sentimentHistory.set(data.asset, [])
      }
      this.sentimentHistory.get(data.asset)!.push(data)

      // Limit history size
      const history = this.sentimentHistory.get(data.asset)!
      if (history.length > 1000) {
        history.shift()
      }
    }

    return sentimentData
  }

  /**
   * Get Twitter sentiment (mock implementation)
   */
  private async getTwitterSentiment(asset: string): Promise<SentimentData | null> {
    try {
      // Mock implementation - in practice, you'd use Twitter API v2
      // or a sentiment analysis service like LunarCrush, Santiment, etc.

      const mockSentiment: SentimentData = {
        timestamp: new Date(),
        source: "twitter",
        sentiment: Math.random() > 0.5 ? "bullish" : "bearish",
        score: (Math.random() - 0.5) * 2, // -1 to 1
        confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1
        volume: Math.floor(Math.random() * 10000) + 1000,
        keywords: [`$${asset}`, "crypto", "trading"],
        asset,
      }

      return mockSentiment
    } catch (error) {
      console.error(`Error fetching Twitter sentiment for ${asset}:`, error)
      return null
    }
  }

  /**
   * Get Reddit sentiment (mock implementation)
   */
  private async getRedditSentiment(asset: string): Promise<SentimentData | null> {
    try {
      // Mock implementation - in practice, you'd use Reddit API
      // and sentiment analysis on r/cryptocurrency, r/bitcoin, etc.

      const mockSentiment: SentimentData = {
        timestamp: new Date(),
        source: "reddit",
        sentiment: Math.random() > 0.6 ? "bullish" : Math.random() > 0.3 ? "bearish" : "neutral",
        score: (Math.random() - 0.5) * 1.5, // -0.75 to 0.75
        confidence: Math.random() * 0.4 + 0.4, // 0.4 to 0.8
        volume: Math.floor(Math.random() * 5000) + 500,
        keywords: [asset, "cryptocurrency", "hodl"],
        asset,
      }

      return mockSentiment
    } catch (error) {
      console.error(`Error fetching Reddit sentiment for ${asset}:`, error)
      return null
    }
  }

  /**
   * Get news sentiment (mock implementation)
   */
  private async getNewsSentiment(asset: string): Promise<SentimentData | null> {
    try {
      // Mock implementation - in practice, you'd use news APIs
      // and NLP sentiment analysis

      const mockSentiment: SentimentData = {
        timestamp: new Date(),
        source: "news",
        sentiment: Math.random() > 0.5 ? "bullish" : "bearish",
        score: (Math.random() - 0.5) * 1.8, // -0.9 to 0.9
        confidence: Math.random() * 0.3 + 0.6, // 0.6 to 0.9
        volume: Math.floor(Math.random() * 100) + 10,
        keywords: [asset, "blockchain", "adoption"],
        asset,
      }

      return mockSentiment
    } catch (error) {
      console.error(`Error fetching news sentiment for ${asset}:`, error)
      return null
    }
  }

  /**
   * Collect on-chain metrics
   */
  async collectOnChainMetrics(assets: string[]): Promise<OnChainMetrics[]> {
    const onChainData: OnChainMetrics[] = []

    for (const asset of assets) {
      // Glassnode data
      if (this.config.onChainSources.glassnode) {
        const glassnodeData = await this.getGlassnodeMetrics(asset)
        if (glassnodeData) onChainData.push(glassnodeData)
      }

      // Other on-chain sources would be added here
    }

    // Store in history
    for (const data of onChainData) {
      if (!this.onChainHistory.has(data.asset)) {
        this.onChainHistory.set(data.asset, [])
      }
      this.onChainHistory.get(data.asset)!.push(data)

      // Limit history size
      const history = this.onChainHistory.get(data.asset)!
      if (history.length > 1000) {
        history.shift()
      }
    }

    return onChainData
  }

  /**
   * Get Glassnode metrics (mock implementation)
   */
  private async getGlassnodeMetrics(asset: string): Promise<OnChainMetrics | null> {
    try {
      // Mock implementation - in practice, you'd use Glassnode API
      // https://docs.glassnode.com/

      const mockMetrics: OnChainMetrics = {
        timestamp: new Date(),
        asset,
        activeAddresses: Math.floor(Math.random() * 1000000) + 100000,
        transactionCount: Math.floor(Math.random() * 500000) + 50000,
        transactionVolume: Math.random() * 10000000000 + 1000000000,
        networkValue: Math.random() * 1000000000000 + 100000000000,
        hashRate: asset === "BTC" ? Math.random() * 200000000 + 150000000 : undefined,
        stakingRatio: asset === "ETH" ? Math.random() * 0.3 + 0.1 : undefined,
        exchangeInflows: Math.random() * 100000000 + 10000000,
        exchangeOutflows: Math.random() * 100000000 + 10000000,
        whaleActivity: Math.random() * 1000 + 100,
        hodlerRatio: Math.random() * 0.4 + 0.4, // 40-80%
      }

      return mockMetrics
    } catch (error) {
      console.error(`Error fetching Glassnode metrics for ${asset}:`, error)
      return null
    }
  }

  /**
   * Collect news events
   */
  async collectNewsEvents(assets: string[]): Promise<NewsEvent[]> {
    const newsEvents: NewsEvent[] = []

    // Collect from various news sources
    if (this.config.newsSources.cryptonews) {
      const cryptoNewsEvents = await this.getCryptoNewsEvents(assets)
      newsEvents.push(...cryptoNewsEvents)
    }

    // Store in history
    this.newsHistory.push(...newsEvents)

    // Limit history size
    if (this.newsHistory.length > 1000) {
      this.newsHistory = this.newsHistory.slice(-1000)
    }

    return newsEvents
  }

  /**
   * Get crypto news events (mock implementation)
   */
  private async getCryptoNewsEvents(assets: string[]): Promise<NewsEvent[]> {
    try {
      // Mock implementation - in practice, you'd use news APIs
      // like CryptoNews API, NewsAPI, etc.

      const mockEvents: NewsEvent[] = []

      for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
        const asset = assets[Math.floor(Math.random() * assets.length)]

        const mockEvent: NewsEvent = {
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Last 24 hours
          title: `${asset} shows strong momentum amid market volatility`,
          content: `Recent developments in ${asset} ecosystem show promising signs...`,
          source: "cryptonews",
          sentiment: Math.random() > 0.5 ? "positive" : "negative",
          relevanceScore: Math.random() * 0.5 + 0.5, // 0.5 to 1
          impactScore: Math.random() * 0.8 + 0.2, // 0.2 to 1
          assets: [asset],
          categories: ["market", "technology", "adoption"],
        }

        mockEvents.push(mockEvent)
      }

      return mockEvents
    } catch (error) {
      console.error("Error fetching crypto news events:", error)
      return []
    }
  }

  /**
   * Analyze market regime using alternative data
   */
  analyzeMarketRegime(
    sentimentData: SentimentData[],
    onChainData: OnChainMetrics[],
    newsEvents: NewsEvent[],
    priceData: { volatility: number; correlation: number; volume: number },
  ): MarketRegimeIndicators {
    // Analyze volatility regime
    const volatilityRegime = this.analyzeVolatilityRegime(priceData.volatility)

    // Analyze liquidity regime
    const liquidityRegime = this.analyzeLiquidityRegime(priceData.volume, onChainData)

    // Analyze risk regime
    const riskRegime = this.analyzeRiskRegime(sentimentData, newsEvents)

    // Analyze correlation regime
    const correlationRegime = this.analyzeCorrelationRegime(priceData.correlation)

    // Analyze sentiment regime
    const sentimentRegime = this.analyzeSentimentRegime(sentimentData, newsEvents)

    // Determine overall regime
    const overallRegime = this.determineOverallRegime(
      volatilityRegime,
      liquidityRegime,
      riskRegime,
      correlationRegime,
      sentimentRegime,
    )

    // Calculate confidence
    const confidence = this.calculateRegimeConfidence(sentimentData, onChainData, newsEvents)

    const regimeIndicators: MarketRegimeIndicators = {
      timestamp: new Date(),
      volatilityRegime,
      liquidityRegime,
      riskRegime,
      correlationRegime,
      sentimentRegime,
      overallRegime,
      confidence,
    }

    // Store in history
    this.regimeHistory.push(regimeIndicators)

    // Limit history size
    if (this.regimeHistory.length > 1000) {
      this.regimeHistory.shift()
    }

    return regimeIndicators
  }

  /**
   * Analyze volatility regime
   */
  private analyzeVolatilityRegime(volatility: number): "low" | "medium" | "high" {
    if (volatility < 0.2) return "low"
    if (volatility < 0.5) return "medium"
    return "high"
  }

  /**
   * Analyze liquidity regime
   */
  private analyzeLiquidityRegime(volume: number, onChainData: OnChainMetrics[]): "abundant" | "normal" | "scarce" {
    // Simplified analysis based on volume and on-chain activity
    const avgExchangeFlow =
      onChainData.length > 0
        ? onChainData.reduce((sum, data) => sum + data.exchangeInflows + data.exchangeOutflows, 0) / onChainData.length
        : 0

    const liquidityScore = volume * 0.6 + avgExchangeFlow * 0.4

    if (liquidityScore > 1000000000) return "abundant"
    if (liquidityScore > 100000000) return "normal"
    return "scarce"
  }

  /**
   * Analyze risk regime
   */
  private analyzeRiskRegime(
    sentimentData: SentimentData[],
    newsEvents: NewsEvent[],
  ): "risk-on" | "risk-off" | "neutral" {
    // Calculate average sentiment
    const avgSentiment =
      sentimentData.length > 0 ? sentimentData.reduce((sum, data) => sum + data.score, 0) / sentimentData.length : 0

    // Calculate news impact
    const avgNewsImpact =
      newsEvents.length > 0
        ? newsEvents.reduce((sum, event) => sum + event.impactScore * (event.sentiment === "positive" ? 1 : -1), 0) /
          newsEvents.length
        : 0

    const riskScore = avgSentiment * 0.7 + avgNewsImpact * 0.3

    if (riskScore > 0.3) return "risk-on"
    if (riskScore < -0.3) return "risk-off"
    return "neutral"
  }

  /**
   * Analyze correlation regime
   */
  private analyzeCorrelationRegime(correlation: number): "high" | "low" | "normal" {
    if (Math.abs(correlation) > 0.7) return "high"
    if (Math.abs(correlation) < 0.3) return "low"
    return "normal"
  }

  /**
   * Analyze sentiment regime
   */
  private analyzeSentimentRegime(
    sentimentData: SentimentData[],
    newsEvents: NewsEvent[],
  ): "euphoria" | "fear" | "greed" | "neutral" {
    // Calculate sentiment extremes
    const avgSentiment =
      sentimentData.length > 0 ? sentimentData.reduce((sum, data) => sum + data.score, 0) / sentimentData.length : 0

    const sentimentVolatility =
      sentimentData.length > 1
        ? Math.sqrt(
            sentimentData.reduce((sum, data) => sum + Math.pow(data.score - avgSentiment, 2), 0) /
              (sentimentData.length - 1),
          )
        : 0

    // High positive sentiment with low volatility = euphoria
    if (avgSentiment > 0.5 && sentimentVolatility < 0.3) return "euphoria"

    // High negative sentiment = fear
    if (avgSentiment < -0.5) return "fear"

    // High positive sentiment with high volatility = greed
    if (avgSentiment > 0.3 && sentimentVolatility > 0.5) return "greed"

    return "neutral"
  }

  /**
   * Determine overall market regime
   */
  private determineOverallRegime(
    volatilityRegime: "low" | "medium" | "high",
    liquidityRegime: "abundant" | "normal" | "scarce",
    riskRegime: "risk-on" | "risk-off" | "neutral",
    correlationRegime: "high" | "low" | "normal",
    sentimentRegime: "euphoria" | "fear" | "greed" | "neutral",
  ): "bull" | "bear" | "sideways" | "transition" {
    let bullishSignals = 0
    let bearishSignals = 0

    // Volatility signals
    if (volatilityRegime === "low") bullishSignals++
    if (volatilityRegime === "high") bearishSignals++

    // Liquidity signals
    if (liquidityRegime === "abundant") bullishSignals++
    if (liquidityRegime === "scarce") bearishSignals++

    // Risk signals
    if (riskRegime === "risk-on") bullishSignals++
    if (riskRegime === "risk-off") bearishSignals++

    // Sentiment signals
    if (sentimentRegime === "euphoria") bullishSignals++
    if (sentimentRegime === "fear") bearishSignals++
    if (sentimentRegime === "greed") bearishSignals++ // Contrarian signal

    // Determine regime
    if (bullishSignals >= 3) return "bull"
    if (bearishSignals >= 3) return "bear"
    if (Math.abs(bullishSignals - bearishSignals) <= 1) return "sideways"
    return "transition"
  }

  /**
   * Calculate regime confidence
   */
  private calculateRegimeConfidence(
    sentimentData: SentimentData[],
    onChainData: OnChainMetrics[],
    newsEvents: NewsEvent[],
  ): number {
    let confidence = 0.5 // Base confidence

    // Data availability bonus
    if (sentimentData.length > 0) confidence += 0.1
    if (onChainData.length > 0) confidence += 0.1
    if (newsEvents.length > 0) confidence += 0.1

    // Data quality bonus
    const avgSentimentConfidence =
      sentimentData.length > 0
        ? sentimentData.reduce((sum, data) => sum + data.confidence, 0) / sentimentData.length
        : 0

    const avgNewsRelevance =
      newsEvents.length > 0 ? newsEvents.reduce((sum, event) => sum + event.relevanceScore, 0) / newsEvents.length : 0

    confidence += avgSentimentConfidence * 0.15
    confidence += avgNewsRelevance * 0.15

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Get aggregated sentiment for asset
   */
  getAggregatedSentiment(
    asset: string,
    lookbackHours = 24,
  ): {
    score: number
    confidence: number
    volume: number
    trend: "improving" | "deteriorating" | "stable"
  } {
    const history = this.sentimentHistory.get(asset) || []
    const cutoffTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)

    const recentData = history.filter((data) => data.timestamp >= cutoffTime)

    if (recentData.length === 0) {
      return { score: 0, confidence: 0, volume: 0, trend: "stable" }
    }

    // Calculate weighted average (more recent data has higher weight)
    let totalScore = 0
    let totalWeight = 0
    let totalVolume = 0

    for (let i = 0; i < recentData.length; i++) {
      const data = recentData[i]
      const age = (Date.now() - data.timestamp.getTime()) / (1000 * 60 * 60) // hours
      const weight = Math.exp(-age / 12) // Exponential decay with 12-hour half-life

      totalScore += data.score * weight * data.confidence
      totalWeight += weight * data.confidence
      totalVolume += data.volume
    }

    const aggregatedScore = totalWeight > 0 ? totalScore / totalWeight : 0
    const aggregatedConfidence = totalWeight / recentData.length

    // Calculate trend
    const halfPoint = Math.floor(recentData.length / 2)
    const firstHalf = recentData.slice(0, halfPoint)
    const secondHalf = recentData.slice(halfPoint)

    const firstHalfAvg =
      firstHalf.length > 0 ? firstHalf.reduce((sum, data) => sum + data.score, 0) / firstHalf.length : 0
    const secondHalfAvg =
      secondHalf.length > 0 ? secondHalf.reduce((sum, data) => sum + data.score, 0) / secondHalf.length : 0

    let trend: "improving" | "deteriorating" | "stable"
    const trendDiff = secondHalfAvg - firstHalfAvg

    if (trendDiff > 0.1) trend = "improving"
    else if (trendDiff < -0.1) trend = "deteriorating"
    else trend = "stable"

    return {
      score: aggregatedScore,
      confidence: aggregatedConfidence,
      volume: totalVolume,
      trend,
    }
  }

  /**
   * Get on-chain trend analysis
   */
  getOnChainTrends(
    asset: string,
    lookbackDays = 7,
  ): {
    addressGrowth: number
    transactionGrowth: number
    volumeGrowth: number
    whaleActivityTrend: "increasing" | "decreasing" | "stable"
    hodlerBehavior: "accumulating" | "distributing" | "stable"
  } {
    const history = this.onChainHistory.get(asset) || []
    const cutoffTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)

    const recentData = history.filter((data) => data.timestamp >= cutoffTime)

    if (recentData.length < 2) {
      return {
        addressGrowth: 0,
        transactionGrowth: 0,
        volumeGrowth: 0,
        whaleActivityTrend: "stable",
        hodlerBehavior: "stable",
      }
    }

    // Calculate growth rates
    const firstData = recentData[0]
    const lastData = recentData[recentData.length - 1]

    const addressGrowth = ((lastData.activeAddresses - firstData.activeAddresses) / firstData.activeAddresses) * 100
    const transactionGrowth =
      ((lastData.transactionCount - firstData.transactionCount) / firstData.transactionCount) * 100
    const volumeGrowth =
      ((lastData.transactionVolume - firstData.transactionVolume) / firstData.transactionVolume) * 100

    // Analyze whale activity trend
    const whaleActivities = recentData.map((data) => data.whaleActivity)
    const whaleActivitySlope = this.calculateTrendSlope(whaleActivities)

    let whaleActivityTrend: "increasing" | "decreasing" | "stable"
    if (whaleActivitySlope > 0.1) whaleActivityTrend = "increasing"
    else if (whaleActivitySlope < -0.1) whaleActivityTrend = "decreasing"
    else whaleActivityTrend = "stable"

    // Analyze hodler behavior
    const hodlerRatios = recentData.map((data) => data.hodlerRatio)
    const hodlerSlope = this.calculateTrendSlope(hodlerRatios)

    let hodlerBehavior: "accumulating" | "distributing" | "stable"
    if (hodlerSlope > 0.01) hodlerBehavior = "accumulating"
    else if (hodlerSlope < -0.01) hodlerBehavior = "distributing"
    else hodlerBehavior = "stable"

    return {
      addressGrowth,
      transactionGrowth,
      volumeGrowth,
      whaleActivityTrend,
      hodlerBehavior,
    }
  }

  /**
   * Calculate trend slope using linear regression
   */
  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0

    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = values

    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    return slope
  }

  /**
   * Get market regime history
   */
  getRegimeHistory(lookbackDays = 30): MarketRegimeIndicators[] {
    const cutoffTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    return this.regimeHistory.filter((regime) => regime.timestamp >= cutoffTime)
  }

  /**
   * Get data quality metrics
   */
  getDataQuality(): {
    sentimentCoverage: number
    onChainCoverage: number
    newsCoverage: number
    overallQuality: number
    lastUpdate: Date
  } {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Check recent data availability
    const recentSentiment = Array.from(this.sentimentHistory.values())
      .flat()
      .filter((data) => data.timestamp >= oneHourAgo)

    const recentOnChain = Array.from(this.onChainHistory.values())
      .flat()
      .filter((data) => data.timestamp >= oneHourAgo)

    const recentNews = this.newsHistory.filter((event) => event.timestamp >= oneHourAgo)

    const sentimentCoverage = Math.min(1, recentSentiment.length / 10) // Expect 10 sentiment updates per hour
    const onChainCoverage = Math.min(1, recentOnChain.length / 5) // Expect 5 on-chain updates per hour
    const newsCoverage = Math.min(1, recentNews.length / 2) // Expect 2 news updates per hour

    const overallQuality = (sentimentCoverage + onChainCoverage + newsCoverage) / 3

    return {
      sentimentCoverage,
      onChainCoverage,
      newsCoverage,
      overallQuality,
      lastUpdate: now,
    }
  }

  /**
   * Start automatic data collection
   */
  startDataCollection(assets: string[]): void {
    // Collect data at specified intervals
    setInterval(
      async () => {
        try {
          await this.collectSentimentData(assets)
          await this.collectOnChainMetrics(assets)
          await this.collectNewsEvents(assets)
          Logger.info('Alternative data collection completed')
        } catch (error) {
          console.error("Error in data collection:", error)
        }
      },
      this.config.updateFrequency * 60 * 1000,
    ) // Convert minutes to milliseconds
  }

  /**
   * Stop data collection
   */
  stopDataCollection(): void {
    // In a real implementation, you'd store interval IDs and clear them
    Logger.info('Data collection stopped')
  }
}
