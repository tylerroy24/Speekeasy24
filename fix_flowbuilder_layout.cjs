const fs = require('fs')
let c = fs.readFileSync('src/pages/FlowBuilder.jsx', 'utf8')

// 1. Fix the outer wrapper - remove the extra unclosed div layer, 
//    use a single full-height flex container
c = c.replace(
  '      <div className="flex flex-col" style={{minHeight: \'calc(100vh - 56px)\'}}>\n      <div className="flex flex-1 flex-col overflow-hidden">',
  '      <div className="flex flex-col" style={{height: \'calc(100vh - 56px)\', overflow: \'hidden\'}}>'
)

// 2. Make the canvas area flex-1 so it fills remaining space
c = c.replace(
  '<div className="flex flex-1 overflow-hidden">',
  '<div className="flex flex-1 min-h-0">'
)

// 3. Make the SVG canvas take full available height
c = c.replace(
  'className="flex-1 relative overflow-hidden bg-ink"',
  'className="flex-1 relative bg-ink"'
)

// 4. Make the SVG element fill its container fully
c = c.replace(
  'width="100%" height="100%"',
  'width="100%" height="100%" style={{display: "block", minHeight: "2000px"}}'
)

// 5. Make left toolbar scrollable so node types don't get clipped
c = c.replace(
  'className="w-48 border-r border-border bg-surface flex flex-col gap-1 p-3 flex-shrink-0"',
  'className="w-48 border-r border-border bg-surface flex flex-col gap-1 p-3 flex-shrink-0 overflow-y-auto"'
)

// 6. Make right inspector panel scrollable
c = c.replace(
  'className="w-64 border-l border-border bg-surface flex-shrink-0"',
  'className="w-64 border-l border-border bg-surface flex-shrink-0 overflow-y-auto"'
)

// 7. Fix closing tags - replace the broken double-div close before showDeploy
//    with correct single-div close
c = c.replace(
  '      </div>\n      </div>\n      {showDeploy',
  '      </div>\n      {showDeploy'
)

// Also handle case where it only has one close
const hasDoubleClose = c.includes('      </div>\n      </div>\n      {showDeploy')
if (!hasDoubleClose) {
  // Check if single close exists before showDeploy, if not add it
  if (!c.includes('      </div>\n      {showDeploy')) {
    c = c.replace(
      '      {showDeploy',
      '      </div>\n      {showDeploy'
    )
  }
}

fs.writeFileSync('src/pages/FlowBuilder.jsx', c)
console.log('Done')

// Report structure
const lines = c.split('\n')
const returnLine = lines.findIndex(l => l.includes('return ('))
console.log('\nReturn block structure (lines ' + returnLine + ' onwards):')
lines.slice(returnLine, returnLine + 10).forEach((l, i) => {
  console.log((returnLine + i + 1) + ': ' + l)
})
console.log('\nLast 8 lines:')
lines.slice(-8).forEach((l, i) => {
  console.log((lines.length - 8 + i + 1) + ': ' + l)
})
