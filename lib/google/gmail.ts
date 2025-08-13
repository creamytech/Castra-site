import { google } from 'googleapis'
import { getAccessTokenForUser } from '@/lib/google/exchange'

export async function getGmailForUser(userId: string) {
	const { accessToken } = await getAccessTokenForUser(userId)
	const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
	oauth2.setCredentials({ access_token: accessToken })
	return google.gmail({ version: 'v1', auth: oauth2 })
}

export async function getCalendarForUser(userId: string) {
	const { accessToken } = await getAccessTokenForUser(userId)
	const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
	oauth2.setCredentials({ access_token: accessToken })
	return google.calendar({ version: 'v3', auth: oauth2 })
}


