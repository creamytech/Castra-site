export const sellerTemplates = {
  sellerFirstContact: ({ name }: any) => `Hi ${name || ''} — thanks for reaching out about selling. I’ll share a quick pre-listing checklist to prepare. Do you have a target timeline?` ,
  sellerDay1Followup: () => `Could you send a few photos and any recent updates? That helps position the home.`,
  sellerDay3CMA: ({ address }: any) => `Attached is a quick market analysis for ${address || 'your home'}. Happy to walk you through comps and pricing strategy.`,
  sellerWeek1Checkin: () => `Checking in — would you like to discuss timing, pricing, or prep next steps?`,
}
