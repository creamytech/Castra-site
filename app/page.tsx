"use client";

import Link from "next/link";
import Section from "@/components/Section";
import FAQ from "@/components/FAQ";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const features = [
  {
    icon: "📧",
    title: "Email + Tone",
    description: "Drafts you would actually send."
  },
  {
    icon: "📅",
    title: "Scheduling",
    description: "Suggest times and place holds in one click."
  },
  {
    icon: "👥",
    title: "CRM & Deals",
    description: "Find, tag, and move deals with chat."
  },
  {
    icon: "🏠",
    title: "MLS Content",
    description: "Property blurbs and social snippets from specs."
  },
  {
    icon: "📄",
    title: "Docs",
    description: "Prepare DocuSign packets with merge fields."
  },
  {
    icon: "📊",
    title: "Reporting",
    description: "Pipeline, commissions, comps at a glance."
  }
];

const pricingTiers = [
  {
    name: "Starter",
    price: "$99",
    period: "/mo",
    description: "Perfect for individual agents",
    features: [
      "Inbox summaries",
      "Basic email drafts",
      "CRM basics",
      "Email support"
    ],
    highlighted: false
  },
  {
    name: "Pro",
    price: "$199",
    period: "/mo",
    description: "Most popular for growing teams",
    features: [
      "Everything in Starter",
      "Calendar holds",
      "MLS blurbs",
      "Doc prep",
      "Chat co-pilot",
      "Priority support"
    ],
    highlighted: true
  },
  {
    name: "Team",
    price: "$399",
    period: "/mo",
    description: "For brokerages and large teams",
    features: [
      "Everything in Pro",
      "Admin dashboard",
      "Role-based access",
      "Team analytics",
      "Dedicated support",
      "Custom integrations"
    ],
    highlighted: false
  }
];

const faqItems = [
  {
    question: "Does Castra send automatically?",
    answer: "No, Castra only creates drafts that require your approval before sending. You maintain full control over all communications."
  },
  {
    question: "Will this work with my brokerage tech?",
    answer: "We integrate with Gmail and Outlook first, with DocuSign and MLS partners coming soon. Contact us for specific integration needs."
  },
  {
    question: "Is my data private?",
    answer: "Absolutely. Your data stays in your account and is never shared. We use enterprise-grade security and comply with all privacy regulations."
  },
  {
    question: "How does the AI understand my tone?",
    answer: "Castra learns from your existing emails and writing style. You can also provide examples and feedback to refine the AI's understanding of your voice."
  },
  {
    question: "What if I need to cancel?",
    answer: "You can cancel anytime with no penalties. We'll help you export your data and ensure a smooth transition."
  },
  {
    question: "Do you offer training?",
    answer: "Yes! We provide onboarding sessions, video tutorials, and ongoing support to help you get the most out of Castra."
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <Section className="py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              The AI Co-Pilot for Real Estate
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8">
              Castra drafts emails in your tone, schedules meetings, updates your CRM, preps MLS content—so you can focus on clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/demo"
                className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-lg font-semibold"
              >
                Try Demo
              </Link>
              <Link
                href="/app/dashboard"
                className="px-8 py-4 border-2 border-purple-600 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-lg font-semibold"
              >
                Get Started
              </Link>
            </div>
          </div>
        </Section>

        {/* Features Section */}
        <Section className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">
              Everything you need to close more deals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Pricing Section */}
        <Section className="py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">
              Simple, transparent pricing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingTiers.map((tier, index) => (
                <div
                  key={index}
                  className={`bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg ${
                    tier.highlighted
                      ? "ring-2 ring-purple-600 transform scale-105"
                      : ""
                  }`}
                >
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-gray-600 dark:text-gray-300">{tier.period}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">{tier.description}</p>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/demo"
                    className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                      tier.highlighted
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500"
                    }`}
                  >
                    Get Started
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* FAQ Section */}
        <Section className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <FAQ items={faqItems} />
          </div>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
