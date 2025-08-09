'use client'

import Link from 'next/link'
import Section from '@/components/Section'
import FAQ from '@/components/FAQ'

export const dynamic = 'force-dynamic'

const features = [
  {
    icon: '📧',
    title: 'Email + Tone',
    description: 'Drafts you would actually send.'
  },
  {
    icon: '📅',
    title: 'Scheduling',
    description: 'Suggest times and place holds in one click.'
  },
  {
    icon: '👥',
    title: 'CRM & Deals',
    description: 'Find, tag, and move deals with chat.'
  },
  {
    icon: '🏠',
    title: 'MLS Content',
    description: 'Property blurbs and social snippets from specs.'
  },
  {
    icon: '📄',
    title: 'Docs',
    description: 'Prepare DocuSign packets with merge fields.'
  },
  {
    icon: '📊',
    title: 'Reporting',
    description: 'Pipeline, commissions, comps at a glance.'
  }
]

const pricingTiers = [
  {
    name: 'Starter',
    price: '$99',
    period: '/mo',
    description: 'Perfect for individual agents',
    features: [
      'Inbox summaries',
      'Basic email drafts',
      'CRM basics',
      'Email support'
    ],
    highlighted: false
  },
  {
    name: 'Pro',
    price: '$199',
    period: '/mo',
    description: 'Most popular for growing teams',
    features: [
      'Everything in Starter',
      'Calendar holds',
      'MLS blurbs',
      'Doc prep',
      'Chat co-pilot',
      'Priority support'
    ],
    highlighted: true
  },
  {
    name: 'Team',
    price: '$399',
    period: '/mo',
    description: 'For brokerages and large teams',
    features: [
      'Everything in Pro',
      'Admin dashboard',
      'Role-based access',
      'Team analytics',
      'Dedicated support',
      'Custom integrations'
    ],
    highlighted: false
  }
]

const faqItems = [
  {
    question: 'Does Castra send automatically?',
    answer: 'No, Castra only creates drafts that require your approval before sending. You maintain full control over all communications.'
  },
  {
    question: 'Will this work with my brokerage tech?',
    answer: 'We integrate with Gmail and Outlook first, with DocuSign and MLS partners coming soon. Contact us for specific integration needs.'
  },
  {
    question: 'Is my data private?',
    answer: 'Absolutely. Your data stays in your account and is never shared. We use enterprise-grade security and comply with all privacy regulations.'
  },
  {
    question: 'Do you support Outlook?',
    answer: 'Yes! We support both Gmail and Outlook, with the same powerful features for both platforms.'
  },
  {
    question: 'How does pricing work?',
    answer: 'Simple flat monthly pricing per seat. No hidden fees, no usage limits. Cancel anytime with no penalties.'
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees.'
  }
]

export default function HomePage() {
  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <Section className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6">
            The magical co-pilot for{' '}
            <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              real estate.
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-8">
            Castra drafts emails in your tone, schedules meetings, updates your CRM, 
            preps MLS content—so you can focus on clients.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Try Demo
            </Link>
            <Link
              href="/api/auth/signin"
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </Section>

      {/* Social Proof */}
      <Section className="bg-white dark:bg-gray-800">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider mb-4">
            Trusted by top agents
          </p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="text-gray-400 text-sm">Keller Williams</div>
            <div className="text-gray-400 text-sm">RE/MAX</div>
            <div className="text-gray-400 text-sm">Coldwell Banker</div>
            <div className="text-gray-400 text-sm">Berkshire Hathaway</div>
          </div>
        </div>
      </Section>

      {/* Features Overview */}
      <Section id="features" className="bg-gray-50 dark:bg-gray-900">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need to succeed
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            From email drafting to deal management, Castra handles the busywork so you can focus on what matters.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Deep Feature Highlights */}
      <Section className="bg-white dark:bg-gray-800">
        <div className="space-y-24">
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                AI that speaks your language
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Castra learns your tone and style, so every email draft sounds like you wrote it. 
                No more generic templates—just authentic communication that converts.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <span className="text-green-500 mr-3">✓</span>
                  Personalized tone matching
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <span className="text-green-500 mr-3">✓</span>
                  Context-aware responses
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <span className="text-green-500 mr-3">✓</span>
                  Brand voice consistency
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">C</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Castra AI</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  "I'll draft a warm, professional follow-up email for Sarah that matches your usual tone. 
                  Should I include the new listing details we discussed?"
                </p>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl p-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Pipeline Status</span>
                      <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Active
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">New Leads</span>
                        <span className="font-medium text-gray-900 dark:text-white">12</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">In Progress</span>
                        <span className="font-medium text-gray-900 dark:text-white">8</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Closing</span>
                        <span className="font-medium text-gray-900 dark:text-white">3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Smart CRM that works for you
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Let AI handle the busywork while you focus on relationships. Castra automatically 
                updates your CRM, scores leads, and keeps your pipeline moving.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <span className="text-green-500 mr-3">✓</span>
                  Automatic lead scoring
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <span className="text-green-500 mr-3">✓</span>
                  Pipeline management
                </li>
                <li className="flex items-center text-gray-600 dark:text-gray-300">
                  <span className="text-green-500 mr-3">✓</span>
                  Activity tracking
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing" className="bg-gray-50 dark:bg-gray-900">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg ${
                tier.highlighted
                  ? 'ring-2 ring-purple-500 relative transform scale-105'
                  : ''
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {tier.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {tier.period}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  {tier.description}
                </p>
                <ul className="space-y-3 mb-8 text-left">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-gray-600 dark:text-gray-300">
                      <span className="text-green-500 mr-3">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/api/auth/signin"
                  className={`w-full inline-flex justify-center items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    tier.highlighted
                      ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-700 hover:to-blue-600 shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="bg-white dark:bg-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Everything you need to know about Castra. Can't find the answer you're looking for? 
            Contact our support team.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <FAQ items={faqItems} />
        </div>
      </Section>

      {/* CTA Banner */}
      <Section className="bg-gradient-to-r from-purple-600 to-blue-500">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to lighten your workload?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto">
            Join thousands of real estate professionals who are already using Castra to 
            automate their workflow and close more deals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-purple-600 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Try Demo
            </Link>
            <Link
              href="/api/auth/signin"
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-white border border-white hover:bg-white hover:text-purple-600 rounded-lg transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </Section>
    </div>
  )
}
