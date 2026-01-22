#!/usr/bin/env node

/**
 * Script to fix Logger calls with proper string quoting
 */

const fs = require('fs')
const path = require('path')

function fixFile(filePath) {
  console.log(`Fixing: ${filePath}`)
  
  let content = fs.readFileSync(filePath, 'utf8')
  let changes = 0
  
  // Fix Logger.info calls - properly quote strings
  content = content.replace(
    /Logger\.info\(([^,)]+), undefined, "MODULE"\)/g,
    (match, p1) => {
      changes++
      return `Logger.info(${p1})`
    }
  )
  
  // Fix Logger.error calls
  content = content.replace(
    /Logger\.error\(([^,)]+), undefined, "MODULE"\)/g,
    (match, p1) => {
      changes++
      return `Logger.error(${p1})`
    }
  )
  
  // Fix Logger.warn calls
  content = content.replace(
    /Logger\.warn\(([^,)]+), undefined, "MODULE"\)/g,
    (match, p1) => {
      changes++
      return `Logger.warn(${p1})`
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

console.log('🔧 Fixing Logger call syntax...')
console.log(`Found ${files.length} files to process`)

let totalChanges = 0
files.forEach(file => {
  totalChanges += fixFile(file)
})

console.log(`✅ Completed! Total fixes: ${totalChanges}`)
