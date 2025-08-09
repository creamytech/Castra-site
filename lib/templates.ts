type Tone = "Professional" | "Friendly" | "High-energy" | "Luxury"

const formatSlot = (slot: string) => {
  const date = new Date(slot)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

const greet = (name: string) => `Hi ${name},`

const slotsLine = (slots: string[]) => slots.length ? `My next openings are ${formatSlot(slots[0])} or ${formatSlot(slots[1] || slots[0])}.` : ""

export const templates: Record<string, Record<Tone, (name: string, slots: string[]) => string>> = {
  tour: {
    Professional: (name, slots) => `${greet(name)}\n\nThank you for reaching out124 Oak St is available. ${slotsLine(slots)} Please let me know which time works best, and I will confirm the tour.\n\nBest regards,\nCastra (in your agents voice)`,
    Friendly: (name, slots) => `${greet(name)}\n\nGreat news124 Oak St is available. ${slotsLine(slots)} I can send a quick checklist and lock it in.\n\nThanks so much,\nCastra`,
    "High-energy": (name, slots) => `${greet(name)}\n\nLets do it124 Oak St is ready for a tour. ${slotsLine(slots)} Tell me what timing works and Ill confirm right away.\n\nLets make moves,\nCastra`,
    Luxury: (name, slots) => `${greet(name)}\n\nDelighted to assist124 Oak St is available. ${slotsLine(slots)} I will coordinate a seamless private showing.\n\nSincerely,\nCastra`
  },
  seller: {
    Professional: (name) => `${greet(name)}\n\nI will run a comparative market analysis for 88 Grove and send pricing and launch strategy today. Would you prefer a brief call or an in-person walkthrough?\n\nBest regards,\nCastra`,
    Friendly: (name) => `${greet(name)}\n\nIll pull comps for 88 Grove and map out a game plan. Would you like a quick call or a walkthrough?\n\nThanks,\nCastra`,
    "High-energy": (name) => `${greet(name)}\n\nOn itIll comp 88 Grove and outline a winning plan. Call or walkthroughwhats best?\n\nTalk soon,\nCastra`,
    Luxury: (name) => `${greet(name)}\n\nI will prepare a detailed valuation and a tailored launch plan for 88 Grove. Shall we schedule a private walkthrough?\n\nWarm regards,\nCastra`
  },
  info: {
    Professional: (name) => `${greet(name)}\n\nI will share school ratings, commute options, and nearby parks for 19 Seaview. Are evenings after 5 PM best for a quick call?\n\nBest regards,\nCastra`,
    Friendly: (name) => `${greet(name)}\n\nI will send school ratings and park recommendations for 19 Seaview. Are evenings after 5 PM good for a quick call?\n\nThanks,\nCastra`,
    "High-energy": (name) => `${greet(name)}\n\nI will round up schools, commute tips, and parks around 19 Seaviewwould you like to chat tonight?\n\nTalk soon,\nCastra`,
    Luxury: (name) => `${greet(name)}\n\nI will curate school insights and neighborhood highlights for 19 Seaview. Would this evening work for a brief call?\n\nSincerely,\nCastra`
  },
  openhouse: {
    Professional: (name) => `${greet(name)}\n\nThe open house for 52 Birch is Sunday from 12:002:00 PM. I can meet you beforehand for a private walkthrough.\n\nBest regards,\nCastra`,
    Friendly: (name) => `${greet(name)}\n\n52 Birch is open Sunday from 12:002:00 PM. I will be there a bit early if you would like a private tour first.\n\nThanks,\nCastra`,
    "High-energy": (name) => `${greet(name)}\n\n52 Birch is live Sunday from 12:002:00 PMcome through! I can do an early walkthrough as well.\n\nLets make moves,\nCastra`,
    Luxury: (name) => `${greet(name)}\n\n52 Birch hosts an open house Sunday from 12:002:00 PM. I am happy to arrange a private preview beforehand.\n\nWarm regards,\nCastra`
  }
}

export function nameFromEmail(email: string) {
  const base = (email?.split("@")[0] || "there").replace(/[^\w]/g, " ").trim()
  return base.replace(/\b\w/g, (c) => c.toUpperCase())
}
