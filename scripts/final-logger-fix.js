#!/usr/bin/env node

/**
 * Comprehensive Logger syntax fix
 */

const fs = require('fs')
const path = require('path')

function fixFile(filePath) {
  console.log(`Fixing: ${filePath}`)
  
  let content = fs.readFileSync(filePath, 'utf8')
  let changes = 0
  
  // Fix all Logger calls with unquoted strings
  const loggerCallPattern = /Logger\.(info|error|warn|debug)\(([^)]+)\)/g
  
  content = content.replace(loggerCallPattern, (match, loggerType, params) => {
    // Check if params contains unquoted strings with common patterns
    if (params.includes('Running ') || params.includes('Starting ') || params.includes('Connected') || 
        params.includes('Warning:') || params.includes('completed!') ||
        params.includes('Calculating') || params.includes('analysis') ||
        params.includes('engine already') || params.includes('Walk-forward')) {
      changes++
      // Extract the string content and properly quote it
      const stringContent = params.match(/['"`]([^'"`]+)['"`]/)?.[1] || params
      return `Logger.${loggerType}('${stringContent.replace(/'/g, "\\'")}')`
    }
    return match
  })
  
  // Write back if changes were made
  if (changes > 0) {
    fs.writeFileSync(filePath, content)
    console.log(`  ✓ Fixed ${changes} Logger calls`)
  }
  
  return changes
}

function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = []
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        traverse(fullPath)
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath)
      }
    }
  }
  
  traverse(dir)
  return files
}

// Main execution
const appDir = path.join(__dirname, '../app')
const files = findFiles(appDir)

console.log('🔧 Final Logger syntax fix...')
console.log(`Found ${files.length} files to process`)

let totalChanges = 0
files.forEach(file => {
  totalChanges += fixFile(file)
})

console.log(`✅ Completed! Total fixes: ${totalChanges}`)
