/**
 * Reinforcement Learning Engine for Strategy Adaptation
 * Uses Q-Learning and Deep Q-Networks for dynamic strategy optimization
 */

export interface RLState {
  marketRegime: "bull" | "bear" | "sideways" | "volatile"
  correlation: number
  volatility: number
  momentum: number
  meanReversion: number
  volume: number
  spread: number
  timeOfDay: number
  dayOfWeek: number
  portfolioDrawdown: number
  recentPerformance: number
}

export interface RLAction {
  type: "position_size" | "entry_threshold" | "exit_threshold" | "leverage" | "hold"
  parameter: string
  value: number
  confidence: number
}

export interface RLReward {
  immediate: number
  risk_adjusted: number
  sharpe_contribution: number
  drawdown_penalty: number
  transaction_cost: number
  total: number
}

export interface RLExperience {
  state: RLState
  action: RLAction
  reward: RLReward
  nextState: RLState
  done: boolean
  timestamp: Date
}

export interface RLConfig {
  learningRate: number
  discountFactor: number
  explorationRate: number
  explorationDecay: number
  minExplorationRate: number
  memorySize: number
  batchSize: number
  targetUpdateFrequency: number
  rewardWindow: number
  stateNormalization: boolean
}

/**
 * Deep Q-Network for strategy optimization
 */
export class DeepQNetwork {
  private weights: { [layer: string]: number[][] } = {}
  private biases: { [layer: string]: number[] } = {}
  private architecture: number[]

  constructor(inputSize: number, hiddenSizes: number[], outputSize: number) {
    this.architecture = [inputSize, ...hiddenSizes, outputSize]
    this.initializeWeights()
  }

  /**
   * Initialize network weights
   */
  private initializeWeights(): void {
    for (let i = 0; i < this.architecture.length - 1; i++) {
      const layerName = `layer_${i}`
      const inputSize = this.architecture[i]
      const outputSize = this.architecture[i + 1]

      // Xavier initialization
      const scale = Math.sqrt(2.0 / (inputSize + outputSize))

      this.weights[layerName] = Array(outputSize)
        .fill(0)
        .map(() =>
          Array(inputSize)
            .fill(0)
            .map(() => (Math.random() - 0.5) * 2 * scale),
        )

      this.biases[layerName] = Array(outputSize).fill(0)
    }
  }

  /**
   * Forward pass through network
   */
  forward(input: number[]): number[] {
    let activation = [...input]

    for (let i = 0; i < this.architecture.length - 1; i++) {
      const layerName = `layer_${i}`
      const weights = this.weights[layerName]
      const biases = this.biases[layerName]

      const newActivation: number[] = []

      for (let j = 0; j < weights.length; j++) {
        let sum = biases[j]
        for (let k = 0; k < activation.length; k++) {
          sum += weights[j][k] * activation[k]
        }

        // Apply activation function (ReLU for hidden layers, linear for output)
        if (i < this.architecture.length - 2) {
          newActivation.push(Math.max(0, sum)) // ReLU
        } else {
          newActivation.push(sum) // Linear output
        }
      }

      activation = newActivation
    }

    return activation
  }

  /**
   * Backward pass (simplified gradient descent)
   */
  backward(input: number[], target: number[], learningRate: number): void {
    // Simplified backpropagation
    // In practice, you'd use a proper deep learning framework

    const output = this.forward(input)
    const outputError = output.map((o, i) => target[i] - o)

    // Update output layer weights
    const outputLayerName = `layer_${this.architecture.length - 2}`
    const outputWeights = this.weights[outputLayerName]
    const outputBiases = this.biases[outputLayerName]

    for (let i = 0; i < outputWeights.length; i++) {
      outputBiases[i] += learningRate * outputError[i]
      for (let j = 0; j < outputWeights[i].length; j++) {
        outputWeights[i][j] += learningRate * outputError[i] * input[j]
      }
    }
  }

  /**
   * Copy weights from another network
   */
  copyFrom(other: DeepQNetwork): void {
    for (const layerName in other.weights) {
      this.weights[layerName] = other.weights[layerName].map((row) => [...row])
      this.biases[layerName] = [...other.biases[layerName]]
    }
  }

  /**
   * Get network parameters
   */
  getParameters(): { weights: any; biases: any } {
    return {
      weights: JSON.parse(JSON.stringify(this.weights)),
      biases: JSON.parse(JSON.stringify(this.biases)),
    }
  }

  /**
   * Set network parameters
   */
  setParameters(params: { weights: any; biases: any }): void {
    this.weights = JSON.parse(JSON.stringify(params.weights))
    this.biases = JSON.parse(JSON.stringify(params.biases))
  }
}

/**
 * Reinforcement Learning Engine
 */
export class ReinforcementLearningEngine {
  private config: RLConfig
  private qNetwork: DeepQNetwork
  private targetNetwork: DeepQNetwork
  private replayMemory: RLExperience[] = []
  private currentState?: RLState
  private episodeRewards: number[] = []
  private trainingStep = 0

  // State and action spaces
  private stateSize = 11 // Number of state features
  private actionSize = 20 // Number of possible actions

  // Performance tracking
  private performanceHistory: {
    episode: number
    totalReward: number
    averageReward: number
    explorationRate: number
    loss: number
  }[] = []

  constructor(config: Partial<RLConfig> = {}) {
    this.config = {
      learningRate: 0.001,
      discountFactor: 0.95,
      explorationRate: 1.0,
      explorationDecay: 0.995,
      minExplorationRate: 0.01,
      memorySize: 10000,
      batchSize: 32,
      targetUpdateFrequency: 100,
      rewardWindow: 50,
      stateNormalization: true,
      ...config,
    }

    // Initialize networks
    this.qNetwork = new DeepQNetwork(this.stateSize, [64, 32], this.actionSize)
    this.targetNetwork = new DeepQNetwork(this.stateSize, [64, 32], this.actionSize)
    this.targetNetwork.copyFrom(this.qNetwork)
  }

  /**
   * Convert market data to RL state
   */
  createState(marketData: any, portfolio: any, recentPerformance: number[]): RLState {
    // Determine market regime
    const volatility = marketData.volatility || 0
    const correlation = marketData.correlation || 0
    const returns = recentPerformance.slice(-20) || []

    let marketRegime: "bull" | "bear" | "sideways" | "volatile"
    if (volatility > 0.5) {
      marketRegime = "volatile"
    } else {
      const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0
      if (avgReturn > 0.02) marketRegime = "bull"
      else if (avgReturn < -0.02) marketRegime = "bear"
      else marketRegime = "sideways"
    }

    // Calculate momentum and mean reversion indicators
    const momentum = this.calculateMomentum(returns)
    const meanReversion = this.calculateMeanReversion(returns)

    // Time features
    const now = new Date()
    const timeOfDay = now.getHours() / 24
    const dayOfWeek = now.getDay() / 7

    // Portfolio features
    const portfolioDrawdown = this.calculateDrawdown(portfolio.equity || [])
    const recentPerf = returns.length > 0 ? returns.slice(-5).reduce((sum, r) => sum + r, 0) : 0

    const state: RLState = {
      marketRegime,
      correlation: Math.abs(correlation),
      volatility,
      momentum,
      meanReversion,
      volume: marketData.volume || 0,
      spread: marketData.spread || 0,
      timeOfDay,
      dayOfWeek,
      portfolioDrawdown,
      recentPerformance: recentPerf,
    }

    return state
  }

  /**
   * Calculate momentum indicator
   */
  private calculateMomentum(returns: number[]): number {
    if (returns.length < 10) return 0

    const recent = returns.slice(-5)
    const older = returns.slice(-10, -5)

    const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length
    const olderAvg = older.reduce((sum, r) => sum + r, 0) / older.length

    return recentAvg - olderAvg
  }

  /**
   * Calculate mean reversion indicator
   */
  private calculateMeanReversion(returns: number[]): number {
    if (returns.length < 20) return 0

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const recent = returns.slice(-5)
    const recentMean = recent.reduce((sum, r) => sum + r, 0) / recent.length

    return mean - recentMean
  }

  /**
   * Calculate portfolio drawdown
   */
  private calculateDrawdown(equity: number[]): number {
    if (equity.length === 0) return 0

    let peak = equity[0]
    let maxDrawdown = 0

    for (const value of equity) {
      if (value > peak) peak = value
      const drawdown = (peak - value) / peak
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }

    return maxDrawdown
  }

  /**
   * Normalize state for neural network
   */
  private normalizeState(state: RLState): number[] {
    if (!this.config.stateNormalization) {
      return this.stateToVector(state)
    }

    const vector = this.stateToVector(state)

    // Apply normalization (z-score or min-max)
    const normalized = vector.map((value, index) => {
      switch (index) {
        case 0:
          return value // market regime (already categorical)
        case 1:
          return Math.tanh(value * 2) // correlation
        case 2:
          return Math.tanh(value * 4) // volatility
        case 3:
          return Math.tanh(value * 10) // momentum
        case 4:
          return Math.tanh(value * 10) // mean reversion
        case 5:
          return Math.tanh(value / 1000000) // volume
        case 6:
          return Math.tanh(value * 100) // spread
        case 7:
          return value // time of day (already 0-1)
        case 8:
          return value // day of week (already 0-1)
        case 9:
          return Math.tanh(value * 5) // drawdown
        case 10:
          return Math.tanh(value * 20) // recent performance
        default:
          return value
      }
    })

    return normalized
  }

  /**
   * Convert state to vector
   */
  private stateToVector(state: RLState): number[] {
    // Convert market regime to one-hot encoding
    const regimeVector = [0, 0, 0, 0]
    switch (state.marketRegime) {
      case "bull":
        regimeVector[0] = 1
        break
      case "bear":
        regimeVector[1] = 1
        break
      case "sideways":
        regimeVector[2] = 1
        break
      case "volatile":
        regimeVector[3] = 1
        break
    }

    return [
      ...regimeVector,
      state.correlation,
      state.volatility,
      state.momentum,
      state.meanReversion,
      state.volume,
      state.spread,
      state.timeOfDay,
      state.dayOfWeek,
      state.portfolioDrawdown,
      state.recentPerformance,
    ]
  }

  /**
   * Select action using epsilon-greedy policy
   */
  selectAction(state: RLState): RLAction {
    // Epsilon-greedy exploration
    if (Math.random() < this.config.explorationRate) {
      return this.getRandomAction()
    }

    // Get Q-values from network
    const stateVector = this.normalizeState(state)
    const qValues = this.qNetwork.forward(stateVector)

    // Select action with highest Q-value
    const actionIndex = qValues.indexOf(Math.max(...qValues))
    return this.indexToAction(actionIndex, qValues[actionIndex])
  }

  /**
   * Get random action for exploration
   */
  private getRandomAction(): RLAction {
    const actionTypes = ["position_size", "entry_threshold", "exit_threshold", "leverage", "hold"]
    const type = actionTypes[Math.floor(Math.random() * actionTypes.length)] as any

    if (type === "hold") {
      return {
        type: "hold",
        parameter: "none",
        value: 0,
        confidence: 0.1,
      }
    }

    const parameters = {
      position_size: ["basePositionSize", "maxPositionSize"],
      entry_threshold: ["zscoreEntryThreshold"],
      exit_threshold: ["zscoreExitThreshold"],
      leverage: ["meanReversionLeverage", "momentumLeverage"],
    }

    const paramList = parameters[type as keyof typeof parameters]
    const parameter = paramList[Math.floor(Math.random() * paramList.length)]

    // Generate random value within reasonable bounds
    let value: number
    switch (type) {
      case "position_size":
        value = 0.1 + Math.random() * 0.4 // 0.1 to 0.5
        break
      case "entry_threshold":
        value = 1.5 + Math.random() * 2.0 // 1.5 to 3.5
        break
      case "exit_threshold":
        value = 0.5 + Math.random() * 1.5 // 0.5 to 2.0
        break
      case "leverage":
        value = 1.0 + Math.random() * 3.0 // 1.0 to 4.0
        break
      default:
        value = 0
    }

    return {
      type,
      parameter,
      value,
      confidence: Math.random(),
    }
  }

  /**
   * Convert action index to action object
   */
  private indexToAction(index: number, qValue: number): RLAction {
    // Map index to specific actions
    const actionMap = [
      { type: "position_size", parameter: "basePositionSize", valueRange: [0.1, 0.5] },
      { type: "position_size", parameter: "maxPositionSize", valueRange: [0.3, 0.7] },
      { type: "entry_threshold", parameter: "zscoreEntryThreshold", valueRange: [1.5, 3.5] },
      { type: "exit_threshold", parameter: "zscoreExitThreshold", valueRange: [0.5, 2.0] },
      { type: "leverage", parameter: "meanReversionLeverage", valueRange: [1.0, 4.0] },
      { type: "leverage", parameter: "momentumLeverage", valueRange: [1.0, 5.0] },
      { type: "hold", parameter: "none", valueRange: [0, 0] },
    ]

    // Repeat actions to fill action space
    const actionIndex = index % actionMap.length
    const action = actionMap[actionIndex]

    const [minVal, maxVal] = action.valueRange
    const value = minVal + (maxVal - minVal) * (index / this.actionSize)

    return {
      type: action.type as any,
      parameter: action.parameter,
      value,
      confidence: Math.tanh(Math.abs(qValue)),
    }
  }

  /**
   * Calculate reward based on performance and risk
   */
  calculateReward(
    action: RLAction,
    previousPortfolioValue: number,
    currentPortfolioValue: number,
    riskMetrics: any,
    transactionCosts: number,
  ): RLReward {
    // Immediate return
    const returnPct = (currentPortfolioValue - previousPortfolioValue) / previousPortfolioValue
    const immediate = returnPct * 100

    // Risk adjustment
    const volatility = riskMetrics.volatility || 0.2
    const riskAdjusted = immediate / Math.max(volatility, 0.01)

    // Sharpe contribution (simplified)
    const sharpeContribution = riskAdjusted

    // Drawdown penalty
    const drawdown = riskMetrics.currentDrawdown || 0
    const drawdownPenalty = -Math.pow(drawdown, 2) * 10

    // Transaction cost penalty
    const transactionCostPenalty = -transactionCosts * 100

    const total = immediate + riskAdjusted + sharpeContribution + drawdownPenalty + transactionCostPenalty

    return {
      immediate,
      risk_adjusted: riskAdjusted,
      sharpe_contribution: sharpeContribution,
      drawdown_penalty: drawdownPenalty,
      transaction_cost: transactionCostPenalty,
      total,
    }
  }

  /**
   * Store experience in replay memory
   */
  storeExperience(experience: RLExperience): void {
    this.replayMemory.push(experience)

    // Limit memory size
    if (this.replayMemory.length > this.config.memorySize) {
      this.replayMemory.shift()
    }
  }

  /**
   * Train the Q-network
   */
  train(): number {
    if (this.replayMemory.length < this.config.batchSize) {
      return 0
    }

    // Sample random batch
    const batch = this.sampleBatch()
    let totalLoss = 0

    for (const experience of batch) {
      const stateVector = this.normalizeState(experience.state)
      const nextStateVector = this.normalizeState(experience.nextState)

      // Current Q-values
      const currentQValues = this.qNetwork.forward(stateVector)

      // Target Q-values
      const nextQValues = this.targetNetwork.forward(nextStateVector)
      const maxNextQ = Math.max(...nextQValues)

      // Calculate target
      const target = [...currentQValues]
      const actionIndex = this.actionToIndex(experience.action)

      if (experience.done) {
        target[actionIndex] = experience.reward.total
      } else {
        target[actionIndex] = experience.reward.total + this.config.discountFactor * maxNextQ
      }

      // Train network
      this.qNetwork.backward(stateVector, target, this.config.learningRate)

      // Calculate loss
      const loss = Math.pow(target[actionIndex] - currentQValues[actionIndex], 2)
      totalLoss += loss
    }

    this.trainingStep++

    // Update target network
    if (this.trainingStep % this.config.targetUpdateFrequency === 0) {
      this.targetNetwork.copyFrom(this.qNetwork)
    }

    // Decay exploration rate
    this.config.explorationRate = Math.max(
      this.config.minExplorationRate,
      this.config.explorationRate * this.config.explorationDecay,
    )

    return totalLoss / batch.length
  }

  /**
   * Sample random batch from replay memory
   */
  private sampleBatch(): RLExperience[] {
    const batch: RLExperience[] = []

    for (let i = 0; i < this.config.batchSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.replayMemory.length)
      batch.push(this.replayMemory[randomIndex])
    }

    return batch
  }

  /**
   * Convert action to index
   */
  private actionToIndex(action: RLAction): number {
    // Simplified mapping - in practice, you'd have a more sophisticated encoding
    if (action.type === "hold") return 0
    if (action.type === "position_size") return 1
    if (action.type === "entry_threshold") return 2
    if (action.type === "exit_threshold") return 3
    if (action.type === "leverage") return 4
    return 0
  }

  /**
   * Update current state
   */
  updateState(state: RLState): void {
    this.currentState = state
  }

  /**
   * Get current exploration rate
   */
  getExplorationRate(): number {
    return this.config.explorationRate
  }

  /**
   * Get training statistics
   */
  getTrainingStats(): {
    totalExperiences: number
    trainingSteps: number
    explorationRate: number
    averageReward: number
    recentPerformance: number[]
  } {
    const recentRewards = this.episodeRewards.slice(-this.config.rewardWindow)
    const averageReward =
      recentRewards.length > 0 ? recentRewards.reduce((sum, r) => sum + r, 0) / recentRewards.length : 0

    return {
      totalExperiences: this.replayMemory.length,
      trainingSteps: this.trainingStep,
      explorationRate: this.config.explorationRate,
      averageReward,
      recentPerformance: recentRewards,
    }
  }

  /**
   * Save model
   */
  saveModel(): any {
    return {
      qNetwork: this.qNetwork.getParameters(),
      targetNetwork: this.targetNetwork.getParameters(),
      config: this.config,
      trainingStep: this.trainingStep,
      explorationRate: this.config.explorationRate,
    }
  }

  /**
   * Load model
   */
  loadModel(modelData: any): void {
    this.qNetwork.setParameters(modelData.qNetwork)
    this.targetNetwork.setParameters(modelData.targetNetwork)
    this.config = { ...this.config, ...modelData.config }
    this.trainingStep = modelData.trainingStep || 0
    this.config.explorationRate = modelData.explorationRate || this.config.explorationRate
  }

  /**
   * Reset for new episode
   */
  resetEpisode(): void {
    this.currentState = undefined
  }

  /**
   * End episode and record reward
   */
  endEpisode(totalReward: number): void {
    this.episodeRewards.push(totalReward)

    // Limit episode history
    if (this.episodeRewards.length > 1000) {
      this.episodeRewards = this.episodeRewards.slice(-500)
    }
  }
}
