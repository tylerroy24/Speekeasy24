const fs = require('fs')

let c = fs.readFileSync('src/pages/Landing.jsx', 'utf8')

// 1. Remove the plans array (not needed anymore)
c = c.replace(/\nconst plans = \[[\s\S]*?\]\n/, '\n')

// 2. Remove the entire Pricing section
c = c.replace(/\n      \{\/\* Pricing \*\/\}\n      <section id="pricing"[\s\S]*?<\/section>\n/, '\n')

// 3. Update hero primary CTA - "Start for free" -> "Book a demo" -> /contact
c = c.replace(
  `            <Link
              to="/register"
              className="group flex items-center gap-2 bg-lime text-ink font-display font-bold text-base px-8 py-4 rounded-xl hover:bg-lime-dim transition-all lime-glow"
            >
              Start for free
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>`,
  `            <Link
              to="/contact"
              className="group flex items-center gap-2 bg-lime text-ink font-display font-bold text-base px-8 py-4 rounded-xl hover:bg-lime-dim transition-all lime-glow"
            >
              Book a demo
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>`
)

// 4. Update bottom CTA section - "Start for free -- no card required" -> "Book a demo" -> /contact
c = c.replace(
  `          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-lime text-ink font-display font-bold text-lg px-10 py-5 rounded-xl hover:bg-lime-dim transition-all lime-glow"
          >
            Start for free -- no card required
            <ChevronRight size={18} />
          </Link>`,
  `          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-lime text-ink font-display font-bold text-lg px-10 py-5 rounded-xl hover:bg-lime-dim transition-all lime-glow"
          >
            Book a demo
            <ChevronRight size={18} />
          </Link>`
)

// 5. Remove the plans import reference from useSEO FAQ (pricing question)
c = c.replace(
  `          { q: 'How much does Speekeasy cost?', a: 'Speekeasy offers a Starter plan at $49/month (200 minutes), a Growth plan at $199/month (1,000 minutes), and custom Enterprise pricing for unlimited usage.' },\n`,
  ``
)

// 6. Remove Check from imports if plans removed (Check still used in useCases so keep it)
// Check is still used in useCases so leave it

fs.writeFileSync('src/pages/Landing.jsx', c)
console.log('Landing.jsx updated')

// Verify
const updated = fs.readFileSync('src/pages/Landing.jsx', 'utf8')
console.log('Has pricing section:', updated.includes('id="pricing"'))
console.log('Has "Start for free":', updated.includes('Start for free'))
console.log('Has "Book a demo":', updated.includes('Book a demo'))
console.log('CTAs point to /contact:', (updated.match(/to="\/contact"/g) || []).length, 'occurrences')
