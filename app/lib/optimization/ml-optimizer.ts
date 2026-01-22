import { Logger } from "../utils/logger"
/**
 * Machine learning-based parameter optimization
 */
import type { BacktestingEngine } from "../backtesting/backtesting-engine"

export interface OptimizationConfig {
  parameterRanges: {
    [param: string]: number[] | string[]
  }
  objectiveFunction: "sharpe" | "sortino" | "calmar" | "return" | "custom"
  customObjective?: (metrics: any) => number
  constraints?: {
    minTrades: number
    maxDrawdown: number
    minWinRate: number
    minProfitFactor: number
  }
  crossValidation: boolean
  walkForward: boolean
  trainTestSplit: number // 0.7 = 70% train, 30% test
  populationSize?: number
  generations?: number
  randomSeed?: number
}

export interface OptimizationResult {
  bestParameters: { [param: string]: number | string }
  bestScore: number
  bestMetrics: any
  allResults: Array<{
    parameters: { [param: string]: number | string }
    score: number
    metrics: any
    isValid: boolean
  }>
  convergenceHistory: number[]
  validationScore?: number
  validationMetrics?: any
  overfittingScore?: number
}

/**
 * Base optimizer class
 */
export abstract class Optimizer {
  protected config: OptimizationConfig
  protected engine: BacktestingEngine
  protected marketData: any

  constructor(config: OptimizationConfig, engine: BacktestingEngine, marketData: any) {
    this.config = config
    this.engine = engine
    this.marketData = marketData
  }

  /**
   * Run optimization
   */
  abstract optimize(): Promise<OptimizationResult>

  /**
   * Evaluate parameters
   */
  protected async evaluateParameters(parameters: { [param: string]: number | string }): Promise<{
    score: number
    metrics: any
    isValid: boolean
  }> {
    try {
      // Update engine parameters
      this.updateEngineParameters(parameters)

      // Run backtest
      const result = await this.engine.runBacktest(this.marketData)

      // Calculate score
      const score = this.calculateScore(result.performance)

      // Check constraints
      const isValid = this.checkConstraints(result.performance)

      return {
        score: isValid ? score : -999999,
        metrics: result.performance,
        isValid,
      }
    } catch (error) {
      console.error("Error evaluating parameters:", error)
      return {
        score: -999999,
        metrics: {},
        isValid: false,
      }
    }
  }

  /**
   * Update engine parameters
   */
  protected updateEngineParameters(parameters: { [param: string]: number | string }): void {
    // This method should be implemented by the specific engine
    // For now, we'll assume the engine has a method to update parameters
    ;(this.engine as any).updateParameters(parameters)
  }

  /**
   * Calculate score based on objective function
   */
  protected calculateScore(metrics: any): number {
    switch (this.config.objectiveFunction) {
      case "sharpe":
        return metrics.sharpeRatio
      case "sortino":
        return metrics.sortinoRatio
      case "calmar":
        return metrics.calmarRatio
      case "return":
        return metrics.totalReturn
      case "custom":
        if (!this.config.customObjective) {
          throw new Error("Custom objective function is not defined.")
        }
        return this.config.customObjective(metrics)
      default:
        throw new Error(`Unsupported objective function: ${this.config.objectiveFunction}`)
    }
  }

  /**
   * Check constraints
   */
  protected checkConstraints(metrics: any): boolean {
    if (!this.config.constraints) return true

    const constraints = this.config.constraints

    if (constraints.minTrades && metrics.totalTrades < constraints.minTrades) {
      return false
    }

    if (constraints.maxDrawdown && metrics.maxDrawdown > constraints.maxDrawdown) {
      return false
    }

    if (constraints.minWinRate && metrics.winRate < constraints.minWinRate) {
      return false
    }

    if (constraints.minProfitFactor && metrics.profitFactor < constraints.minProfitFactor) {
      return false
    }

    return true
  }

  /**
   * Generate random parameters
   */
  protected generateRandomParameters(): { [param: string]: number | string } {
    const parameters: { [param: string]: number | string } = {}

    for (const [param, range] of Object.entries(this.config.parameterRanges)) {
      if (typeof range[0] === "number") {
        // Numeric parameter
        const min = range[0] as number
        const max = range[range.length - 1] as number
        parameters[param] = min + Math.random() * (max - min)
      } else {
        // Categorical parameter
        const randomIndex = Math.floor(Math.random() * range.length)
        parameters[param] = range[randomIndex]
      }
    }

    return parameters
  }
}

/**
 * Genetic Algorithm Optimizer
 */
export class GeneticOptimizer extends Optimizer {
  private populationSize: number
  private generations: number
  private mutationRate = 0.1
  private crossoverRate = 0.8
  private elitismRate = 0.1

  constructor(config: OptimizationConfig, engine: BacktestingEngine, marketData: any) {
    super(config, engine, marketData)
    this.populationSize = config.populationSize || 50
    this.generations = config.generations || 100
  }

  /**
   * Run genetic algorithm optimization
   */
  async optimize(): Promise<OptimizationResult> {
    Logger.info('Starting genetic algorithm optimization...')

    // Initialize population
    let population = await this.initializePopulation()

    const convergenceHistory: number[] = []
    const allResults: Array<{
      parameters: { [param: string]: number | string }
      score: number
      metrics: any
      isValid: boolean
    }> = []

    let bestIndividual = population[0]

    // Evolution loop
    for (let generation = 0; generation < this.generations; generation++) {
      console.log(`Generation ${generation + 1}/${this.generations}`)

      // Evaluate population
      const evaluatedPopulation = await this.evaluatePopulation(population)

      // Sort by fitness (score)
      evaluatedPopulation.sort((a, b) => b.score - a.score)

      // Track best individual
      if (evaluatedPopulation[0].score > bestIndividual.score) {
        bestIndividual = evaluatedPopulation[0]
      }

      // Record convergence
      convergenceHistory.push(bestIndividual.score)

      // Add to all results
      allResults.push(...evaluatedPopulation)

      // Create next generation
      population = await this.createNextGeneration(evaluatedPopulation)

      // Log progress
      console.log(`Best score: ${bestIndividual.score.toFixed(4)}`)
    }

    // Validation if enabled
    let validationScore: number | undefined
    let validationMetrics: any | undefined
    let overfittingScore: number | undefined

    if (this.config.crossValidation) {
      const validationResult = await this.validateParameters(bestIndividual.parameters)
      validationScore = validationResult.score
      validationMetrics = validationResult.metrics
      overfittingScore = bestIndividual.score - validationScore
    }

    return {
      bestParameters: bestIndividual.parameters,
      bestScore: bestIndividual.score,
      bestMetrics: bestIndividual.metrics,
      allResults,
      convergenceHistory,
      validationScore,
      validationMetrics,
      overfittingScore,
    }
  }

  /**
   * Initialize population
   */
  private async initializePopulation(): Promise<
    Array<{
      parameters: { [param: string]: number | string }
      score: number
      metrics: any
      isValid: boolean
    }>
  > {
    const population = []

    for (let i = 0; i < this.populationSize; i++) {
      const parameters = this.generateRandomParameters()
      const evaluation = await this.evaluateParameters(parameters)

      population.push({
        parameters,
        ...evaluation,
      })
    }

    return population
  }

  /**
   * Evaluate population
   */
  private async evaluatePopulation(
    population: Array<{
      parameters: { [param: string]: number | string }
      score?: number
      metrics?: any
      isValid?: boolean
    }>,
  ): Promise<
    Array<{
      parameters: { [param: string]: number | string }
      score: number
      metrics: any
      isValid: boolean
    }>
  > {
    const evaluatedPopulation = []

    for (const individual of population) {
      if (individual.score === undefined) {
        const evaluation = await this.evaluateParameters(individual.parameters)
        evaluatedPopulation.push({
          parameters: individual.parameters,
          ...evaluation,
        })
      } else {
        evaluatedPopulation.push(individual as any)
      }
    }

    return evaluatedPopulation
  }

  /**
   * Create next generation
   */
  private async createNextGeneration(
    population: Array<{
      parameters: { [param: string]: number | string }
      score: number
      metrics: any
      isValid: boolean
    }>,
  ): Promise<
    Array<{
      parameters: { [param: string]: number | string }
    }>
  > {
    const nextGeneration = []

    // Elitism - keep best individuals
    const eliteCount = Math.floor(this.populationSize * this.elitismRate)
    for (let i = 0; i < eliteCount; i++) {
      nextGeneration.push({ parameters: population[i].parameters })
    }

    // Generate offspring
    while (nextGeneration.length < this.populationSize) {
      // Selection
      const parent1 = this.tournamentSelection(population)
      const parent2 = this.tournamentSelection(population)

      // Crossover
      let offspring1, offspring2
      if (Math.random() < this.crossoverRate) {
        ;[offspring1, offspring2] = this.crossover(parent1.parameters, parent2.parameters)
      } else {
        offspring1 = parent1.parameters
        offspring2 = parent2.parameters
      }

      // Mutation
      offspring1 = this.mutate(offspring1)
      offspring2 = this.mutate(offspring2)

      nextGeneration.push({ parameters: offspring1 })
      if (nextGeneration.length < this.populationSize) {
        nextGeneration.push({ parameters: offspring2 })
      }
    }

    return nextGeneration
  }

  /**
   * Tournament selection
   */
  private tournamentSelection(
    population: Array<{
      parameters: { [param: string]: number | string }
      score: number
      metrics: any
      isValid: boolean
    }>,
    tournamentSize = 3,
  ): {
    parameters: { [param: string]: number | string }
    score: number
    metrics: any
    isValid: boolean
  } {
    const tournament = []

    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length)
      tournament.push(population[randomIndex])
    }

    // Return best individual from tournament
    tournament.sort((a, b) => b.score - a.score)
    return tournament[0]
  }

  /**
   * Crossover
   */
  private crossover(
    parent1: { [param: string]: number | string },
    parent2: { [param: string]: number | string },
  ): [{ [param: string]: number | string }, { [param: string]: number | string }] {
    const offspring1: { [param: string]: number | string } = {}
    const offspring2: { [param: string]: number | string } = {}

    for (const param of Object.keys(parent1)) {
      if (typeof parent1[param] === "number") {
        // Arithmetic crossover for numeric parameters
        const alpha = Math.random()
        offspring1[param] = alpha * (parent1[param] as number) + (1 - alpha) * (parent2[param] as number)
        offspring2[param] = (1 - alpha) * (parent1[param] as number) + alpha * (parent2[param] as number)
      } else {
        // Random selection for categorical parameters
        offspring1[param] = Math.random() < 0.5 ? parent1[param] : parent2[param]
        offspring2[param] = Math.random() < 0.5 ? parent1[param] : parent2[param]
      }
    }

    return [offspring1, offspring2]
  }

  /**
   * Mutation
   */
  private mutate(individual: { [param: string]: number | string }): { [param: string]: number | string } {
    const mutated = { ...individual }

    for (const [param, value] of Object.entries(mutated)) {
      if (Math.random() < this.mutationRate) {
        const range = this.config.parameterRanges[param]

        if (typeof value === "number") {
          // Gaussian mutation for numeric parameters
          const min = range[0] as number
          const max = range[range.length - 1] as number
          const stdDev = (max - min) * 0.1 // 10% of range

          let newValue = (value as number) + this.gaussianRandom() * stdDev
          newValue = Math.max(min, Math.min(max, newValue)) // Clamp to range

          mutated[param] = newValue
        } else {
          // Random selection for categorical parameters
          const randomIndex = Math.floor(Math.random() * range.length)
          mutated[param] = range[randomIndex]
        }
      }
    }

    return mutated
  }

  /**
   * Generate Gaussian random number
   */
  private gaussianRandom(): number {
    let u = 0,
      v = 0
    while (u === 0) u = Math.random() // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  /**
   * Validate parameters on out-of-sample data
   */
  private async validateParameters(parameters: { [param: string]: number | string }): Promise<{
    score: number
    metrics: any
  }> {
    // Split data for validation
    const splitIndex = Math.floor(this.marketData.dates.length * this.config.trainTestSplit)

    const validationData = {
      dates: this.marketData.dates.slice(splitIndex),
      btcPrices: this.marketData.btcPrices.slice(splitIndex),
      xrpPrices: this.marketData.xrpPrices.slice(splitIndex),
      btcReturns: this.marketData.btcReturns.slice(splitIndex),
      xrpReturns: this.marketData.xrpReturns.slice(splitIndex),
    }

    // Update engine parameters
    this.updateEngineParameters(parameters)

    // Run backtest on validation data
    const result = await this.engine.runBacktest(validationData)

    // Calculate score
    const score = this.calculateScore(result.performance)

    return {
      score,
      metrics: result.performance,
    }
  }
}

/**
 * Bayesian Optimization
 */
export class BayesianOptimizer extends Optimizer {
  private acquisitionFunction: "ei" | "ucb" | "poi" = "ei"
  private iterations: number
  private initialSamples: number

  constructor(config: OptimizationConfig, engine: BacktestingEngine, marketData: any) {
    super(config, engine, marketData)
    this.iterations = config.generations || 50
    this.initialSamples = Math.min(10, this.iterations / 5)
  }

  /**
   * Run Bayesian optimization
   */
  async optimize(): Promise<OptimizationResult> {
    Logger.info('Starting Bayesian optimization...')

    const allResults: Array<{
      parameters: { [param: string]: number | string }
      score: number
      metrics: any
      isValid: boolean
    }> = []

    const convergenceHistory: number[] = []
    let bestResult = { score: Number.NEGATIVE_INFINITY, parameters: {}, metrics: {} }

    // Initial random sampling
    Logger.info('Initial random sampling...')
    for (let i = 0; i < this.initialSamples; i++) {
      const parameters = this.generateRandomParameters()
      const evaluation = await this.evaluateParameters(parameters)

      allResults.push({
        parameters,
        ...evaluation,
      })

      if (evaluation.score > bestResult.score) {
        bestResult = {
          score: evaluation.score,
          parameters,
          metrics: evaluation.metrics,
        }
      }

      convergenceHistory.push(bestResult.score)
    }

    // Bayesian optimization iterations
    for (let i = this.initialSamples; i < this.iterations; i++) {
      console.log(`Iteration ${i + 1}/${this.iterations}`)

      // Find next point using acquisition function
      const nextParameters = await this.findNextPoint(allResults)

      // Evaluate next point
      const evaluation = await this.evaluateParameters(nextParameters)

      allResults.push({
        parameters: nextParameters,
        ...evaluation,
      })

      if (evaluation.score > bestResult.score) {
        bestResult = {
          score: evaluation.score,
          parameters: nextParameters,
          metrics: evaluation.metrics,
        }
      }

      convergenceHistory.push(bestResult.score)
      console.log(`Best score: ${bestResult.score.toFixed(4)}`)
    }

    return {
      bestParameters: bestResult.parameters,
      bestScore: bestResult.score,
      bestMetrics: bestResult.metrics,
      allResults,
      convergenceHistory,
    }
  }

  /**
   * Find next point using acquisition function
   */
  private async findNextPoint(
    history: Array<{
      parameters: { [param: string]: number | string }
      score: number
      metrics: any
      isValid: boolean
    }>,
  ): Promise<{ [param: string]: number | string }> {
    // Simplified acquisition function - in practice, you'd use a proper Gaussian Process
    // For now, we'll use a simple exploration-exploitation strategy

    let bestCandidate = this.generateRandomParameters()
    let bestAcquisition = Number.NEGATIVE_INFINITY

    // Sample multiple candidates and pick the best according to acquisition function
    for (let i = 0; i < 100; i++) {
      const candidate = this.generateRandomParameters()
      const acquisition = this.calculateAcquisition(candidate, history)

      if (acquisition > bestAcquisition) {
        bestAcquisition = acquisition
        bestCandidate = candidate
      }
    }

    return bestCandidate
  }

  /**
   * Calculate acquisition function value
   */
  private calculateAcquisition(
    candidate: { [param: string]: number | string },
    history: Array<{
      parameters: { [param: string]: number | string }
      score: number
      metrics: any
      isValid: boolean
    }>,
  ): number {
    // Simplified acquisition function
    // In practice, you'd use Expected Improvement, Upper Confidence Bound, etc.

    // Calculate distance to nearest evaluated point
    let minDistance = Number.POSITIVE_INFINITY
    for (const point of history) {
      const distance = this.calculateDistance(candidate, point.parameters)
      minDistance = Math.min(minDistance, distance)
    }

    // Encourage exploration of distant points
    const explorationBonus = minDistance

    // Encourage exploitation near good points
    const bestScore = Math.max(...history.map((h) => h.score))
    const exploitationBonus = bestScore * Math.exp(-minDistance)

    return explorationBonus + exploitationBonus
  }

  /**
   * Calculate distance between parameter sets
   */
  private calculateDistance(
    params1: { [param: string]: number | string },
    params2: { [param: string]: number | string },
  ): number {
    let distance = 0
    let count = 0

    for (const param of Object.keys(params1)) {
      if (typeof params1[param] === "number" && typeof params2[param] === "number") {
        const range = this.config.parameterRanges[param]
        const min = range[0] as number
        const max = range[range.length - 1] as number

        // Normalize to [0, 1]
        const norm1 = ((params1[param] as number) - min) / (max - min)
        const norm2 = ((params2[param] as number) - min) / (max - min)

        distance += Math.pow(norm1 - norm2, 2)
        count++
      } else if (params1[param] !== params2[param]) {
        distance += 1
        count++
      }
    }

    return count > 0 ? Math.sqrt(distance / count) : 0
  }
}

/**
 * Optimization factory
 */
export class OptimizerFactory {
  static createOptimizer(
    type: "genetic" | "bayesian" | "grid" | "random",
    config: OptimizationConfig,
    engine: BacktestingEngine,
    marketData: any,
  ): Optimizer {
    switch (type) {
      case "genetic":
        return new GeneticOptimizer(config, engine, marketData)
      case "bayesian":
        return new BayesianOptimizer(config, engine, marketData)
      default:
        throw new Error(`Unsupported optimizer type: ${type}`)
    }
  }
}
