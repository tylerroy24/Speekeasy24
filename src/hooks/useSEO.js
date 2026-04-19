import { useEffect } from 'react'

const SITE_NAME = 'Speekeasy'
const SITE_URL = 'https://speekeasy.io'
const SITE_DESCRIPTION = 'AI-powered voice agents for inbound and outbound calls. Deploy human-sounding AI phone agents in minutes. Automate lead qualification, appointment reminders, and sales outreach 24/7.'
const TWITTER_HANDLE = '@speekeasyai'
const OG_IMAGE = `${SITE_URL}/og-image.png`

export function useSEO({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage,
  noIndex = false,
  structuredData,
} = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} -- AI Voice Agents That Close`
    const metaDesc = description || SITE_DESCRIPTION
    const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : null
    const imageUrl = ogImage || OG_IMAGE

    // ── Title ──────────────────────────────────────────────────
    document.title = fullTitle

    // ── Helper ─────────────────────────────────────────────────
    const setMeta = (selector, value, attr = 'content') => {
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        const [attrName, attrVal] = selector.replace('meta[', '').replace(']', '').split('=')
        el.setAttribute(attrName.trim(), attrVal.replace(/"/g, '').trim())
        document.head.appendChild(el)
      }
      el.setAttribute(attr, value)
    }

    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`)
      if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', rel)
        document.head.appendChild(el)
      }
      el.setAttribute('href', href)
    }

    const removeEl = (selector) => {
      const el = document.querySelector(selector)
      if (el) el.remove()
    }

    // ── Standard meta ──────────────────────────────────────────
    setMeta('meta[name="description"]', metaDesc)
    setMeta('meta[name="author"]', SITE_NAME)

    // ── Robots ─────────────────────────────────────────────────
    if (noIndex) {
      setMeta('meta[name="robots"]', 'noindex, nofollow')
    } else {
      setMeta('meta[name="robots"]', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1')
    }

    // ── Canonical ──────────────────────────────────────────────
    if (canonicalUrl) {
      setLink('canonical', canonicalUrl)
    }

    // ── Open Graph ─────────────────────────────────────────────
    setMeta('meta[property="og:title"]', fullTitle)
    setMeta('meta[property="og:description"]', metaDesc)
    setMeta('meta[property="og:type"]', ogType)
    setMeta('meta[property="og:image"]', imageUrl)
    setMeta('meta[property="og:image:width"]', '1200')
    setMeta('meta[property="og:image:height"]', '630')
    setMeta('meta[property="og:site_name"]', SITE_NAME)
    if (canonicalUrl) setMeta('meta[property="og:url"]', canonicalUrl)

    // ── Twitter Card ───────────────────────────────────────────
    setMeta('meta[name="twitter:card"]', 'summary_large_image')
    setMeta('meta[name="twitter:site"]', TWITTER_HANDLE)
    setMeta('meta[name="twitter:title"]', fullTitle)
    setMeta('meta[name="twitter:description"]', metaDesc)
    setMeta('meta[name="twitter:image"]', imageUrl)

    // ── Structured data (JSON-LD) ──────────────────────────────
    const existingJsonLd = document.querySelector('script[type="application/ld+json"]')
    if (existingJsonLd) existingJsonLd.remove()

    if (structuredData) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(structuredData)
      document.head.appendChild(script)
    }

    // Cleanup on unmount
    return () => {
      // Reset to defaults when navigating away
      document.title = `${SITE_NAME} -- AI Voice Agents That Close`
    }
  }, [title, description, canonical, ogType, ogImage, noIndex])
}

// ── Structured data generators ─────────────────────────────────

export const schema = {
  organization: () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: SITE_DESCRIPTION,
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@speekeasy.io',
      contactType: 'customer support',
    },
    sameAs: [],
  }),

  softwareApp: () => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '49',
        priceCurrency: 'USD',
        billingIncrement: 'month',
      },
      {
        '@type': 'Offer',
        name: 'Growth',
        price: '199',
        priceCurrency: 'USD',
        billingIncrement: 'month',
      },
    ],
  }),

  faqPage: (faqs) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }),

  breadcrumb: (items) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }),

  webPage: (name, description, path) => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  }),
}

export const SITE_URL_CONST = SITE_URL
export const SITE_NAME_CONST = SITE_NAME
