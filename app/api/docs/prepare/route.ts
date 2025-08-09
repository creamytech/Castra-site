import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const emailTemplate = 
  '<!DOCTYPE html>' +
  '<html>' +
  '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Listing Cover Email</title>' +
    '<style>' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }' +
      '.header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }' +
      '.content { padding: 20px; }' +
      '.property-details { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }' +
      '.footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }' +
      '.highlight { color: #007bff; font-weight: bold; }' +
    '</style>' +
  '</head>' +
  '<body>' +
    '<div class="container">' +
      '<div class="header">' +
        '<h2 style="margin: 0; color: #007bff;">Property Listing Cover</h2>' +
      '</div>' +
      '<div class="content">' +
        '<p>Dear <span class="highlight">{{CLIENT_NAME}}</span>,</p>' +
        '<p>I\'m excited to share this new listing with you that I believe matches your criteria perfectly.</p>' +
        '<div class="property-details">' +
          '<h3 style="margin-top: 0;">Property Details</h3>' +
          '<p><strong>Address:</strong> <span class="highlight">{{ADDRESS}}</span></p>' +
          '<p><strong>List Price:</strong> <span class="highlight">${{PRICE}}</span></p>' +
          '<p><strong>Close Date:</strong> <span class="highlight">{{CLOSE_DATE}}</span></p>' +
        '</div>' +
        '<p>This property offers excellent value and is located in a desirable neighborhood. I\'d be happy to schedule a showing at your convenience.</p>' +
        '<p>Please let me know if you\'d like to see this property or if you have any questions about the listing.</p>' +
        '<p>Best regards,<br>Your Realtor</p>' +
      '</div>' +
      '<div class="footer">' +
        '<p>This email was prepared by Castra, your AI-powered realtor assistant.</p>' +
      '</div>' +
    '</div>' +
  '</body>' +
  '</html>'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { clientName, address, price, closeDate } = await request.json()

    if (!clientName || !address || !price || !closeDate) {
      return NextResponse.json(
        { error: 'All fields are required: clientName, address, price, closeDate' },
        { status: 400 }
      )
    }

    // Format price as currency
    const formattedPrice = typeof price === 'number'
      ? price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
      : price

    // Format close date
    const formattedCloseDate = new Date(closeDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Replace template variables
    let htmlContent = emailTemplate
      .replace(/{{CLIENT_NAME}}/g, clientName)
      .replace(/{{ADDRESS}}/g, address)
      .replace(/{{PRICE}}/g, formattedPrice)
      .replace(/{{CLOSE_DATE}}/g, formattedCloseDate)

    return NextResponse.json({
      html: htmlContent,
      preview: true
    })
  } catch (error) {
    console.error('Document prepare error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
