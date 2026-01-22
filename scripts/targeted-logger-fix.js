#!/usr/bin/env node

/**
 * Targeted fix for remaining Logger issues
 */

const fs = require('fs')
const path = require('path')

const fixes = [
  {
    file: 'app/components/data-analyzer.tsx',
    line: 1,
    old: '"use client"',
    new: '"use client"\n\nimport { Logger } from "../utils/logger"'
  },
  {
    file: 'app/lib/backtesting/backtesting-engine.ts',
    pattern: /Logger\.info\(([^)]+)\)/g,
    replacement: (match, params) => {
      if (params.includes('Backtest completed') || params.includes('completed!')) {
        return `Logger.info('${params.replace(/'/g, "\\'")}')`
      }
      return match
    }
  },
  {
    file: 'app/lib/live-trading/trading-engine.ts',
    pattern: /Logger\.info\(([^)]+)\)/g,
    replacement: (match, params) => {
      if (params.includes('Trading engine started') || params.includes('already running')) {
        return `Logger.info('${params.replace(/'/g, "\\'")}')`
      }
      return match
    }
  }
]

function applyFix(filePath, fix) {
  let content = fs.readFileSync(filePath, 'utf8')
  let changed = false
  
  if (fix.line) {
    const lines = content.split('\n')
    lines[fix.line - 1] = fix.new
    content = lines.join('\n')
    changed = true
  } else if (fix.pattern) {
    const originalContent = content
    content = content.replace(fix.pattern, fix.replacement)
    changed = content !== originalContent
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content)
    console.log(`  ✓ Fixed ${filePath}`)
  }
  
  return changed
}

// Apply fixes
fixes.forEach(fix => {
  if (fs.existsSync(fix.file)) {
    applyFix(fix.file, fix)
  }
})

console.log('✅ Applied targeted Logger fixes')
