# Regime-Adaptive Pairs Trading Platform

[![Build Status](https://img.shields.io/badge/build-successful-brightgreen.svg)](https://github.com/your-repo/regime-adaptive-pairs-trading)
[![Security](https://img.shields.io/badge/security-enterprise%20grade-blue.svg)](https://github.com/your-repo/regime-adaptive-pairs-trading)
[![TypeScript](https://img.shields.io/badge/typescript-strict%20mode-blue.svg)](https://github.com/your-repo/regime-adaptive-pairs-trading)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A sophisticated quantitative trading platform implementing regime-adaptive pairs trading strategies for cryptocurrency markets. Built with enterprise-grade security, production-ready logging, and comprehensive backtesting capabilities.

## 🎯 Current Status: Production Ready

- ✅ **Security**: Enterprise-grade with zero critical vulnerabilities
- ✅ **Code Quality**: Production-ready with structured logging
- ✅ **Build**: Successful compilation and deployment ready
- ✅ **Documentation**: Complete API and operational documentation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.20.2+
- pnpm 8.0.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/yllvar/regime-adaptive-pairs-trading.git
cd regime-adaptive-pairs-trading

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Start development server
pnpm dev
```

### Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Exchange API Configuration
EXCHANGE_API_KEY=your_binance_api_key_here
EXCHANGE_API_SECRET=your_binance_api_secret_here
EXCHANGE_TEST_MODE=true

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
PORT=3000

# Feature Flags
ENABLE_LIVE_TRADING=false
ENABLE_BACKTESTING=true
ENABLE_PAPER_TRADING=true
```

---

## 📊 Features

### Trading Strategy
- **Regime-Adaptive Pairs Trading**: Dynamic parameter adjustment based on market conditions
- **Statistical Arbitrage**: Engle-Granger cointegration testing with Z-score analysis
- **Multi-Timeframe Analysis**: Integration across multiple timeframes for signal quality
- **Risk Management**: Multi-layered risk controls and position sizing

### Technical Implementation
- **Real-Time Data Processing**: WebSocket connections for live market data
- **Backtesting Engine**: Comprehensive historical analysis with walk-forward testing
- **Performance Analytics**: Detailed metrics and regime attribution
- **Live Trading**: Production-ready execution infrastructure

### Enterprise Features
- **Structured Logging**: 4-level logging system with module-specific tracking
- **Security Hardening**: Automated vulnerability scanning and secret management
- **Dependency Management**: Pinned dependencies with reproducible builds
- **CI/CD Pipeline**: Automated security checks and build verification

---

## 🏗️ Architecture

### Core Components

```
app/
├── components/           # React UI components
├── lib/
│   ├── config/          # Environment configuration
│   ├── live-trading/    # Trading engine and exchange connectors
│   ├── backtesting/     # Backtesting framework
│   ├── strategy-engine/  # Strategy implementation
│   ├── utils/           # Utilities and logging
│   └── risk-management/  # Risk controls
└── page.tsx            # Main dashboard
```

### Data Flow

1. **Market Data Ingestion**: Real-time WebSocket connections
2. **Regime Detection**: Statistical analysis of market conditions
3. **Signal Generation**: Pairs trading signals based on regime
4. **Risk Assessment**: Position sizing and risk validation
5. **Trade Execution**: Automated or manual trade placement
6. **Performance Tracking**: Real-time P&L and analytics

---

## 🔒 Security & Quality

### Security Measures
- **Zero Critical Vulnerabilities**: All security issues resolved
- **Dependency Scanning**: Automated vulnerability detection
- **Secret Management**: Environment-based configuration
- **License Compliance**: Permissive licenses only (MIT/Apache/BSD)

### Code Quality
- **TypeScript Strict Mode**: Enhanced type safety
- **Structured Logging**: Enterprise-grade logging system
- **Automated Testing**: Build verification and security scanning
- **Documentation**: Complete API documentation

### Compliance
- **Financial Regulations**: Ready for trading compliance
- **Audit Trail**: Comprehensive logging for regulatory requirements
- **Risk Controls**: Multi-layered risk management
- **Data Privacy**: No sensitive data in source code

---

## 📈 Performance

### Backtesting Results
- **Historical Performance**: Consistent returns across market conditions
- **Risk-Adjusted Metrics**: Favorable Sharpe ratios and maximum drawdown control
- **Regime Analysis**: Performance attribution by market regime
- **Walk-Forward Validation**: Robust out-of-sample testing

### Live Trading
- **Low Latency**: Optimized for real-time execution
- **Scalable Architecture**: Support for multiple trading pairs
- **Error Handling**: Comprehensive error recovery and logging
- **Monitoring**: Real-time performance and system health

---

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Quality & Security
pnpm lint             # Run ESLint
pnpm security-check   # Security vulnerability scan
pnpm deps-check       # Check for outdated dependencies
pnpm license-check    # Verify license compliance

# Utilities
pnpm replace-logs     # Fix console.log statements
pnpm review-logging   # Review logging implementation
```

### Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run E2E tests
pnpm test:e2e
```

---

## 📚 Documentation

- **[ABSTRACT.md](./ABSTRACT.md)** - Complete project overview and technical details
- **[REFACTORING_PLAN.md](./REFACTORING_PLAN.md)** - Implementation plan and results
- **[DEPENDENCY_POLICY.md](./DEPENDENCY_POLICY.md)** - Dependency management procedures
- **[Phase Summaries](./PHASE1_COMPLETE.md)** - Implementation phase documentation

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use structured logging (no console.log)
- Ensure all dependencies are pinned
- Run security checks before commits
- Update documentation for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 Production Deployment

### Prerequisites
- All environment variables configured
- Security scan passed
- Build verification successful
- Risk management parameters set

### Deployment Steps

1. **Environment Setup**
   ```bash
   export NODE_ENV=production
   export LOG_LEVEL=info
   ```

2. **Security Verification**
   ```bash
   pnpm run security-check
   pnpm run license-check
   ```

3. **Build & Deploy**
   ```bash
   pnpm run build
   pnpm start
   ```

### Monitoring
- **Structured Logs**: Available via configured logging service
- **Performance Metrics**: Real-time trading and system metrics
- **Security Alerts**: Automated vulnerability notifications
- **Risk Monitoring**: Position and exposure tracking

---

## 📞 Support

For technical support or questions:
- Create an issue in the GitHub repository
- Review the documentation above
- Check the security and quality guidelines

---

**Built with ❤️ for quantitative trading excellence**

*Last Updated: January 2025*  
*Version: 1.0.0*  
*Status: Production Ready*
