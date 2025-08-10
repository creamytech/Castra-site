import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { getMlsProvider } from '@/lib/agent/skills/mls'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json()
  const provider = getMlsProvider()
  const result = await provider.getComps(body)
  const { subjectEstimate, comps } = result

  const chunks: Buffer[] = []
  const doc = new PDFDocument({ margin: 36 })
  doc.on('data', (c) => chunks.push(c))
  doc.on('end', () => {})
  doc.fontSize(18).text('Comparative Market Analysis', { align: 'center' })
  doc.moveDown()
    .fontSize(12)
    .text(`Suggested Price: $${subjectEstimate.suggestedPrice.toLocaleString()}`)
    .text(`Price/Sqft: $${subjectEstimate.pricePerSqft}`)
    .text(`Range: $${subjectEstimate.range.low.toLocaleString()} - $${subjectEstimate.range.high.toLocaleString()}`)
    .moveDown()
    .text(subjectEstimate.methodology)
    .moveDown()

  comps.forEach((c, i) => {
    doc.fontSize(12).text(`Comp ${i + 1}: ${c.address}, ${c.city}, ${c.state} ${c.zipcode}`)
    doc.text(`Status: ${c.status}  |  Closed: ${c.closedDate?.slice(0, 10)}  |  ${c.beds}bd/${c.baths}ba  |  ${c.sqft} sqft`)
    doc.text(`Distance: ${c.distanceMiles} mi  |  Adjusted Price: $${c.price.toLocaleString()}  |  $/sqft ~ $${c.pricePerSqft}`)
    if (c.adjustments) {
      const a = c.adjustments
      doc.text(`Adjustments: sqft ${a.sqftAdj >= 0 ? '+' : ''}${a.sqftAdj}, beds ${a.bedsAdj >= 0 ? '+' : ''}${a.bedsAdj}, baths ${a.bathsAdj >= 0 ? '+' : ''}${a.bathsAdj}, total ${a.totalAdj >= 0 ? '+' : ''}${a.totalAdj}`)
    }
    doc.moveDown(0.5)
  })

  doc.end()
  const pdf = Buffer.concat(chunks)
  return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf' } })
}
