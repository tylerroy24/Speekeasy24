import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'

const LAST_UPDATED = 'April 19, 2026'
const COMPANY = 'Speekeasy, Inc.'
const EMAIL = 'privacy@speekeasy.io'
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

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy -- Speekeasy'
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
          <h1 className="font-display font-extrabold text-4xl text-cream mb-4">Privacy Policy</h1>
          <p className="text-sm text-subtle font-mono">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-invert max-w-none">
          <Section title="Overview">
            <P>
              {COMPANY} ("Speekeasy", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered voice agent platform, including our website, web application, and related services (collectively, the "Services").
            </P>
            <P>
              Please read this policy carefully. By using our Services, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use our Services.
            </P>
          </Section>

          <Section title="Information We Collect">
            <P>We collect information you provide directly to us, information collected automatically, and information from third parties.</P>

            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Information You Provide</h3>
            <UL items={[
              'Account information: name, email address, password when you register',
              'Billing information: payment card details, billing address (processed by our payment provider)',
              'Profile information: workspace name, company details, preferences',
              'Communications: messages you send us via email or support channels',
              'Agent configuration: system prompts, agent names, voice selections, and call scripts you create',
            ]} />

            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Information Collected Automatically</h3>
            <UL items={[
              'Usage data: pages visited, features used, clicks, and interactions within the platform',
              'Device information: IP address, browser type and version, operating system',
              'Call metadata: call duration, timestamps, call direction (inbound/outbound), and call outcomes',
              'Log data: server logs, error reports, and performance data',
              'Cookies and similar tracking technologies (see Cookies section below)',
            ]} />

            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Information from Third Parties</h3>
            <UL items={[
              'Voice AI provider data: conversation transcripts, sentiment analysis, and call summaries from our voice AI provider',
              'Telephony data: call records, phone numbers, and call status from our telephony provider (Twilio)',
              'Payment processor data: transaction confirmations and fraud signals from our payment processor',
            ]} />
          </Section>

          <Section title="How We Use Your Information">
            <P>We use the information we collect to:</P>
            <UL items={[
              'Provide, operate, and maintain our Services',
              'Process transactions and send related information including confirmations and invoices',
              'Send administrative messages, updates, and security alerts',
              'Respond to your comments, questions, and requests',
              'Monitor and analyze usage patterns to improve our Services',
              'Detect, investigate, and prevent fraudulent transactions and other illegal activities',
              'Comply with legal obligations',
              'Send marketing communications where you have opted in (you may opt out at any time)',
            ]} />
          </Section>

          <Section title="Call Recording and Transcription">
            <P>
              Our Services enable AI-powered voice calls. You acknowledge and agree that:
            </P>
            <UL items={[
              'Calls made through Speekeasy may be recorded and transcribed',
              'It is your sole responsibility to comply with all applicable call recording notification and consent laws in your jurisdiction, including but not limited to the TCPA, state wiretapping laws, and international equivalents',
              'You must inform call recipients that they may be speaking with an AI agent where required by law',
              'Speekeasy is not responsible for your failure to obtain required consents from call recipients',
              'Call transcripts and recordings may be stored and processed by our voice AI provider',
            ]} />
          </Section>

          <Section title="Sharing Your Information">
            <P>We do not sell your personal information. We may share your information with:</P>

            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Service Providers</h3>
            <P>We share information with third-party vendors who assist us in providing the Services, including:</P>
            <UL items={[
              'ElevenLabs -- voice AI and conversational AI processing',
              'Twilio -- telephony infrastructure and call routing',
              'Cloud hosting providers -- infrastructure and data storage',
              'Payment processors -- billing and subscription management',
              'Analytics providers -- usage analytics and performance monitoring',
            ]} />

            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Legal Requirements</h3>
            <P>We may disclose your information if required to do so by law or in good faith belief that such action is necessary to comply with legal obligations, protect our rights, or protect the safety of our users or others.</P>

            <h3 className="font-display font-semibold text-base text-cream mt-6 mb-3">Business Transfers</h3>
            <P>If Speekeasy is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</P>
          </Section>

          <Section title="Data Retention">
            <P>
              We retain your personal information for as long as your account is active or as needed to provide you the Services. We retain call logs, transcripts, and recordings for up to 90 days unless you request earlier deletion or your plan includes extended retention. You may request deletion of your data at any time by contacting us at {EMAIL}.
            </P>
          </Section>

          <Section title="Cookies">
            <P>
              We use cookies and similar tracking technologies to track activity on our Services and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier.
            </P>
            <P>We use the following types of cookies:</P>
            <UL items={[
              'Essential cookies: required for the Services to function, including authentication and session management',
              'Preference cookies: remember your settings and preferences',
              'Analytics cookies: help us understand how users interact with our Services',
            ]} />
            <P>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. If you disable cookies, some parts of our Services may not function properly.</P>
          </Section>

          <Section title="Your Rights">
            <P>Depending on your location, you may have certain rights regarding your personal information:</P>
            <UL items={[
              'Access: request a copy of the personal information we hold about you',
              'Correction: request that we correct inaccurate or incomplete information',
              'Deletion: request that we delete your personal information',
              'Portability: request that we transfer your information to another service',
              'Objection: object to our processing of your information for certain purposes',
              'Restriction: request that we restrict our processing of your information',
              'Opt-out of marketing: unsubscribe from marketing emails at any time using the link in our emails',
            ]} />
            <P>To exercise any of these rights, please contact us at {EMAIL}. We will respond to your request within 30 days.</P>
          </Section>

          <Section title="Data Security">
            <P>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption of data in transit and at rest, access controls, and regular security reviews.
            </P>
            <P>
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
            </P>
          </Section>

          <Section title="Children's Privacy">
            <P>
              Our Services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you become aware that a child has provided us with personal information, please contact us at {EMAIL} and we will take steps to delete such information.
            </P>
          </Section>

          <Section title="International Data Transfers">
            <P>
              Your information may be transferred to and processed in countries other than your own. These countries may have data protection laws that differ from the laws of your country. By using our Services, you consent to the transfer of your information to the United States and other countries where we or our service providers operate.
            </P>
          </Section>

          <Section title="TCPA Compliance">
            <P>
              Speekeasy is a platform tool. You, as the user, are solely responsible for ensuring your use of our Services complies with the Telephone Consumer Protection Act (TCPA), the FTC's Telemarketing Sales Rule, and all other applicable federal, state, and local laws governing telephone communications and automated calling.
            </P>
            <P>This includes but is not limited to:</P>
            <UL items={[
              'Obtaining proper written consent before making automated calls or sending text messages',
              'Maintaining and honoring do-not-call lists',
              'Calling only during permitted hours',
              'Providing required call disclosures and opt-out mechanisms',
              'Ensuring AI agents identify themselves as automated systems where required',
            ]} />
          </Section>

          <Section title="Changes to This Policy">
            <P>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. For significant changes, we will provide additional notice such as an email notification.
            </P>
          </Section>

          <Section title="Contact Us">
            <P>If you have questions about this Privacy Policy or our privacy practices, please contact us at:</P>
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
            <Link to="/terms" className="text-sm text-subtle hover:text-cream transition-colors">Terms</Link>
            <Link to="/privacy" className="text-sm text-lime">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
