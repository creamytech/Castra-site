// ts-node compatible wipe script
const { prisma } = require('../lib/prisma')

async function main() {
	const provider = process.argv[2] || 'google'
	if (!['google', 'azure-ad'].includes(provider)) {
		console.error('Usage: node -r ts-node/register/transpile-only scripts/wipe_google_data.ts [google|azure-ad]')
		process.exit(1)
	}

	console.log('Wiping provider data:', provider)

	// Delete provider-specific accounts
	const a = await prisma.account.deleteMany({ where: { provider } })
	console.log('Deleted accounts:', a.count)

	// Delete email related data (threads/messages/logs)
	const logs = await prisma.emailLog.deleteMany({})
	console.log('Deleted email logs:', logs.count)
	const emsg = await prisma.emailMessage.deleteMany({})
	console.log('Deleted email messages:', emsg.count)
	const ethreads = await prisma.emailThread.deleteMany({})
	console.log('Deleted email threads:', ethreads.count)
	const msg = await prisma.message.deleteMany({})
	console.log('Deleted legacy messages:', msg.count)
	const cache = await prisma.emailThreadCache.deleteMany({})
	console.log('Deleted email thread cache:', cache.count)
	const sr = await prisma.smartReply.deleteMany({})
	console.log('Deleted smart replies:', sr.count)
	const es = await prisma.eventSuggestion.deleteMany({})
	console.log('Deleted event suggestions:', es.count)

	console.log('Done.')
}

main().catch((e)=>{
	console.error(e)
	process.exit(1)
}).finally(async ()=>{
	await prisma.$disconnect()
})


