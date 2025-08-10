type Listing = { address: string; city: string; price: number; beds: number; baths: number }

export const buyerTemplates = {
  buyerFirstContact: ({ name }: any) => `Hi ${name || ''} — thanks for reaching out! To tailor options for you, what price range and neighborhoods are you considering? Are you available for a quick call later today or tomorrow?`,
  buyerDay1Followup: ({ name, oneProp }: any) => `Quick follow-up${name ? `, ${name}` : ''}. I found one you may like: ${oneProp?.address || 'a place nearby'} at $${oneProp?.price?.toLocaleString?.() || ''}. Want me to send 2-3 similar options?`,
  buyerDay3Matches: ({ list = [] as Listing[] }: any) => {
    const lines = list.map((item: Listing, i: number) => {
      return `${i + 1}. ${item.address}, ${item.city} — $${item.price.toLocaleString()} (${item.beds}bd/${item.baths}ba)`
    }).join('\n')
    return `Here are 3 homes that match your criteria:\n${lines}\nWould you like to see any of these? I can set up showings.`
  },
  buyerWeek1Checkin: () => `Just checking in — still looking? I can refine the search and line up showings for this week.`,
}
