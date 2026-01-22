#!/usr/bin/env node

/**
 * Script to fix all Logger syntax issues
 */

const fs = require('fs')
const path = require('path')

function fixFile(filePath) {
  console.log(`Fixing: ${filePath}`)
  
  let content = fs.readFileSync(filePath, 'utf8')
  let changes = 0
  
  // Fix Logger.info calls with unquoted strings
  content = content.replace(
    /Logger\.info\(([^,)]+)\)/g,
    (match, p1) => {
      // Check if the parameter is an unquoted string
      if (p1.includes('Running ') || p1.includes('Starting ') || p1.includes('Connected')) {
        changes++
        return `Logger.info('${p1.replace(/'/g, "\\'")}')`
      }
      return match
    }
  )
  
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

console.log('🔧 Fixing remaining Logger syntax issues...')
console.log(`Found ${files.length} files to process`)

let totalChanges = 0
files.forEach(file => {
  totalChanges += fixFile(file)
})

console.log(`✅ Completed! Total fixes: ${totalChanges}`)
