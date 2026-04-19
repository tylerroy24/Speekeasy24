import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'

const LAST_UPDATED = 'April 19, 2026'
const COMPANY = 'Speekeasy, Inc.'
const EMAIL = 'legal@speekeasy.io'
const ADDRESS = 'Atlanta, GA, United States'

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="font-display font-bold text-xl text-cream mb-4">{title}</h2>
      <div className="text-ghost leading-relaxed space-y-4 text-sm">
        {children}
      </div>
    </div>
  )
}

function P({ children }) {
  return <p className="leading-relaxed">{children}</p>
}

function UL({ items }) {
  return (
    <ul className="space-y-2 pl-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-lime mt-1.5 flex-shrink-0">--</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Terms() {
  useEffect(() => {
    document.title = 'Terms of Service -- Speekeasy'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-ink">
      <Nav />
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="mb-12">
          <Link to="/" className="text-xs font-mono text-lime hover:text-lime-dim transition-colors mb-6 inline-block">
            Back to home
          </Link>
          <h1 className="font-display font-extrabold text-4xl text-cream mb-4">Terms of Service</h1>
          <p className="text-sm text-subtle font-mono">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="p-5 rounded-2xl bg-lime/5 border border-lime/20 mb-10">
          <p className="text-sm text-cream font-medium mb-1">Please read these terms carefully.</p>
          <p className="text-sm text-ghost leading-relaxed">
            By accessing or using Speekeasy, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our Services.
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <Section title="1. Acceptance of Terms">
            <P>
              These Terms of Service ("Terms") constitute a legally binding agreement between you and {COMPANY} ("Speekeasy", "we", "us", or "our") governing your access to and use of the Speekeasy platform, including our website, web application, APIs, and all related services (collectively, the "Services").
            </P>
            <P>
              If you are using the Services on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these Terms, in which case "you" refers to that entity.
            </P>
          </Section>

          <Section title="2. Description of Services">
            <P>
              Speekeasy provides an AI-powered voice agent platform that enables users to create, deploy, and manage automated voice agents for inbound and outbound telephone communications. Our Services include:
            </P>
            <UL items={[
              'AI voice agent creation and management tools',
              'Outbound calling capabilities',
              'Inbound call routing and handling',
              'Bulk calling campaign management',
              'Call analytics, transcription, and reporting',
              'Telephony integration via third-party providers',
            ]} />
          </Section>

          <Section title="3. Account Registration">
            <P>
              To use our Services, you must create an account. You agree to:
            </P>
            <UL items={[
              'Provide accurate, current, and complete information during registration',
              'Maintain and promptly update your account information',
              'Keep your password confidential and not share it with third parties',
              'Notify us immediately of any unauthorized use of your account',
              'Accept responsibility for all activities that occur under your account',
            ]} />
            <P>
              We reserve the right to terminate accounts, remove content, or cancel subscriptions at our sole discretion, with or without notice, for any violation of these Terms.
            </P>
          </Section>

          <Section title="4. Acceptable Use">
            <P>You agree to use the Services only for lawful purposes and in accordance with these Terms. You agree NOT to:</P>
            <UL items={[
              'Use the Services to make calls that violate the TCPA, FTC Telemarketing Sales Rule, or any other applicable law or regulation',
              'Make calls without proper consent from recipients where required by law',
              'Use the Services to harass, threaten, defraud, or harm any person',
              'Impersonate any person or entity or misrepresent your affiliation with any person or entity',
              'Use the Services to transmit spam, unsolicited commercial communications, or bulk messaging without proper consent',
              'Scrape, harvest, or collect personal data about call recipients without authorization',
              'Reverse engineer, decompile, or disassemble any part of the Services',
              'Attempt to gain unauthorized access to any part of the Services or related systems',
              'Use the Services in any manner that could damage, disable, or impair the Services',
              'Resell, sublicense, or otherwise transfer your rights to use the Services without our written consent',
              'Use the Services to make robocalls to emergency numbers or healthcare facilities in violation of applicable law',
            ]} />
          </Section>

          <Section title="5. Compliance with Calling Laws">
            <P>
              You bear sole and exclusive responsibility for ensuring your use of Speekeasy complies with all applicable laws and regulations governing telephone communications, including without limitation:
            </P>
            <UL items={[
              'The Telephone Consumer Protection Act (TCPA) and FCC regulations thereunder',
              'The FTC Telemarketing Sales Rule (TSR)',
              'State and local do-not-call laws and regulations',
              'State telemarketing registration requirements',
              'The National Do Not Call Registry requirements',
              'All applicable international laws if calling outside the United States',
              'Any industry-specific regulations applicable to your business',
            ]} />
            <P>
              You are responsible for obtaining all required consents, maintaining do-not-call lists, calling only during permitted hours, providing required disclosures, and ensuring your AI agents comply with all AI disclosure requirements where applicable.
            </P>
            <P>
              Speekeasy is a technology platform and is not responsible for your compliance or non-compliance with applicable laws. You agree to indemnify and hold Speekeasy harmless from any claims, damages, or penalties arising from your non-compliance.
            </P>
          </Section>

          <Section title="6. Subscription and Payment">
            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Billing</h3>
            <P>
              Speekeasy offers subscription plans billed on a monthly or annual basis. By selecting a paid plan, you authorize us to charge your payment method on a recurring basis. All fees are due in advance and non-refundable except as expressly stated in these Terms.
            </P>

            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Usage-based charges</h3>
            <P>
              Certain features, including calling minutes, may be subject to usage-based charges in addition to your subscription fee. You are responsible for all charges incurred under your account.
            </P>

            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Price changes</h3>
            <P>
              We reserve the right to change our pricing at any time. We will provide at least 30 days notice before any price increase takes effect for existing subscribers.
            </P>

            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Cancellation and refunds</h3>
            <P>
              You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. We do not provide refunds for partial periods. We may offer refunds at our sole discretion in exceptional circumstances.
            </P>
          </Section>

          <Section title="7. Intellectual Property">
            <P>
              The Services, including all software, text, graphics, logos, and other content, are owned by or licensed to Speekeasy and are protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
            </P>
            <P>
              You retain ownership of all content you create using our Services, including agent scripts, prompts, and configurations. By using our Services, you grant us a limited license to process and store your content solely to provide the Services.
            </P>
          </Section>

          <Section title="8. Third-Party Services">
            <P>
              Our Services integrate with third-party providers including voice AI providers and telephony providers. Your use of these third-party services is subject to their respective terms of service and privacy policies. We are not responsible for the acts or omissions of third-party providers.
            </P>
            <P>
              You are responsible for obtaining any necessary accounts and API credentials with third-party providers and for complying with their terms of service.
            </P>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <P>
              THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </P>
            <P>
              We do not warrant that the Services will be uninterrupted, error-free, or completely secure. We do not warrant that any defects will be corrected or that the Services are free of viruses or other harmful components.
            </P>
          </Section>

          <Section title="10. Limitation of Liability">
            <P>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SPEEKEASY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO YOUR USE OF OR INABILITY TO USE THE SERVICES.
            </P>
            <P>
              IN NO EVENT SHALL SPEEKEASY'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICES EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO SPEEKEASY IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) $100.
            </P>
          </Section>

          <Section title="11. Indemnification">
            <P>
              You agree to indemnify, defend, and hold harmless Speekeasy and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or relating to:
            </P>
            <UL items={[
              'Your use of the Services in violation of these Terms',
              'Your violation of any applicable law or regulation, including calling laws',
              'Your infringement of any third-party rights',
              'Any claims by call recipients arising from calls you made using the Services',
              'Your AI agent content, scripts, or communications',
            ]} />
          </Section>

          <Section title="12. Termination">
            <P>
              Either party may terminate this agreement at any time. We may suspend or terminate your access to the Services immediately, without prior notice, if we believe you have violated these Terms.
            </P>
            <P>
              Upon termination, your right to use the Services ceases immediately. Sections relating to intellectual property, disclaimer of warranties, limitation of liability, indemnification, and governing law shall survive termination.
            </P>
          </Section>

          <Section title="13. Governing Law and Dispute Resolution">
            <P>
              These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, United States, without regard to conflict of law provisions.
            </P>
            <P>
              Any dispute arising from these Terms shall first be subject to informal negotiation. If not resolved within 30 days, disputes shall be resolved by binding arbitration in Atlanta, Georgia, under the rules of the American Arbitration Association, except that either party may seek injunctive relief in any court of competent jurisdiction.
            </P>
            <P>
              YOU WAIVE YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
            </P>
          </Section>

          <Section title="14. Changes to Terms">
            <P>
              We reserve the right to modify these Terms at any time. We will notify you of material changes by email or by posting a notice in the Services. Your continued use of the Services after the effective date of the revised Terms constitutes your acceptance of the changes.
            </P>
          </Section>

          <Section title="15. Contact">
            <P>If you have questions about these Terms, please contact us at:</P>
            <div className="mt-4 p-5 rounded-xl bg-panel border border-border">
              <p className="text-cream font-medium">{COMPANY}</p>
              <p className="text-ghost mt-1">{ADDRESS}</p>
              <p className="text-ghost mt-1">
                Email: <a href={`mailto:${EMAIL}`} className="text-lime hover:underline">{EMAIL}</a>
              </p>
            </div>
          </Section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Link to="/" className="font-display font-bold text-cream">speekeasy</Link>
          <div className="flex gap-6">
            <Link to="/terms" className="text-sm text-lime">Terms</Link>
            <Link to="/privacy" className="text-sm text-subtle hover:text-cream transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
