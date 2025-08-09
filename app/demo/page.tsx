'use client'

import Link from 'next/link'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            See Castra in Action
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Experience how Castra transforms your real estate workflow with AI-powered email drafting, 
            smart scheduling, and intelligent CRM management.
          </p>
        </div>

        {/* Demo Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-lg">C</span>
                </div>
                <span className="text-white font-semibold">Castra Demo</span>
              </div>
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                <div className="w-3 h-3 bg-white/30 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Inbox Preview */}
            <div className="p-6 border-r border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📧 Smart Inbox
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">John Smith</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Interested in 3-bedroom homes</p>
                    </div>
                    <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      Hot Lead
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Sarah Johnson</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Scheduling showing for tomorrow</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Mike Wilson</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Offer letter ready for review</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Preview */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💬 AI Assistant
              </h3>
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg max-w-xs">
                    <p className="text-sm">Schedule a showing with John for tomorrow at 2pm</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg max-w-xs">
                    <p className="text-sm">✅ Showing scheduled for tomorrow at 2:00 PM</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calendar event created • Email sent to John
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg max-w-xs">
                    <p className="text-sm">Draft a follow-up email for Sarah</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg max-w-xs">
                    <p className="text-sm">📧 Email draft created</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tone: Professional • Ready for review
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Ready to experience the magic yourself?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/api/auth/signin"
              className="inline-flex items-center px-8 py-3 text-base font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </Link>
            <Link
              href="/api/auth/signin"
              className="inline-flex items-center px-8 py-3 text-base font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
