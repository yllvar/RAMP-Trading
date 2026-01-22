#!/usr/bin/env node

/**
 * Script to replace console.log statements with Logger calls
 */

const fs = require('fs')
const path = require('path')

const replacements = [
  {
    pattern: /console\.log\("([^"]+)"\)/g,
    replacement: 'Logger.info($1, undefined, "MODULE")'
  },
  {
    pattern: /console\.log\('([^']+)'\)/g,
    replacement: 'Logger.info($1, undefined, "MODULE")'
  },
  {
    pattern: /console\.error\("([^"]+)"\)/g,
    replacement: 'Logger.error($1, undefined, "MODULE")'
  },
  {
    pattern: /console\.error\('([^']+)'\)/g,
    replacement: 'Logger.error($1, undefined, "MODULE")'
  },
  {
    pattern: /console\.warn\("([^"]+)"\)/g,
    replacement: 'Logger.warn($1, undefined, "MODULE")'
  },
  {
    pattern: /console\.warn\('([^']+)'\)/g,
    replacement: 'Logger.warn($1, undefined, "MODULE")'
  }
]

function processFile(filePath) {
  console.log(`Processing: ${filePath}`)
  
  let content = fs.readFileSync(filePath, 'utf8')
  let changes = 0
  
  // Add Logger import if not present
  if (!content.includes('import { Logger }')) {
    content = 'import { Logger } from "../utils/logger"\n' + content
    changes++
  }
  
  // Apply replacements
  replacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern)
    if (matches) {
      content = content.replace(pattern, replacement)
      changes += matches.length
    }
  })
  
  // Write back if changes were made
  if (changes > 0) {
    fs.writeFileSync(filePath, content)
    console.log(`  ✓ Updated ${changes} console statements`)
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

console.log('🔄 Replacing console.log statements with Logger calls...')
console.log(`Found ${files.length} files to process`)

let totalChanges = 0
files.forEach(file => {
  totalChanges += processFile(file)
})

console.log(`✅ Completed! Total changes: ${totalChanges}`)
console.log('\n📝 Manual review required:')
console.log('- Update "MODULE" to actual module names')
console.log('- Add context data where appropriate')
console.log('- Test functionality after changes')
