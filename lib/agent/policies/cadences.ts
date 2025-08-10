export const buyerCadence = [
  { delayHrs: 0,   action: 'REPLY_EMAIL',   template: 'buyerFirstContact' },
  { delayHrs: 24,  action: 'FOLLOWUP',      template: 'buyerDay1Followup' },
  { delayHrs: 72,  action: 'SEND_LISTINGS', template: 'buyerDay3Matches' },
  { delayHrs: 168, action: 'FOLLOWUP',      template: 'buyerWeek1Checkin' },
]

export const sellerCadence = [
  { delayHrs: 0,   action: 'REPLY_EMAIL', template: 'sellerFirstContact' },
  { delayHrs: 24,  action: 'FOLLOWUP',    template: 'sellerDay1Followup' },
  { delayHrs: 72,  action: 'SEND_CMA',    template: 'sellerDay3CMA' },
  { delayHrs: 168, action: 'FOLLOWUP',    template: 'sellerWeek1Checkin' },
]
