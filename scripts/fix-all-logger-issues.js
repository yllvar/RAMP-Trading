#!/usr/bin/env node

/**
 * Fix all remaining Logger syntax issues
 */

const fs = require('fs')
const path = require('path')

function fixLoggerCalls(filePath) {
  console.log(`Fixing: ${filePath}`)
  
  let content = fs.readFileSync(filePath, 'utf8')
  let changes = 0
  
  // Fix all unquoted Logger calls
  const patterns = [
    /Logger\.info\(([^)]+)\)/g,
    /Logger\.error\(([^)]+)\)/g,
    /Logger\.warn\(([^)]+)\)/g,
    /Logger\.debug\(([^)]+)\)/g
  ]
  
  patterns.forEach(pattern => {
    content = content.replace(pattern, (match, params) => {
      // Check if it's already quoted
      if (params.startsWith("'") || params.startsWith('"')) {
        return match
      }
      
      // Check if it's a simple string without quotes
      if (!params.includes(',') && !params.includes('undefined') && !params.includes('this.')) {
        changes++
        return `Logger.info('${params}')`
      }
      
      return match
    })
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

console.log('🔧 Fixing all Logger syntax issues...')
console.log(`Found ${files.length} files to process`)

let totalChanges = 0
files.forEach(file => {
  totalChanges += fixLoggerCalls(file)
})

console.log(`✅ Completed! Total fixes: ${totalChanges}`)
