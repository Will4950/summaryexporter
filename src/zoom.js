import {writeFile} from 'node:fs/promises';

const zoomOAuth = 'https://zoom.us/oauth';
const zoomAPI = 'https://api.zoom.us/v2';

async function getAccessToken(accountId, clientId, clientSecret) {
	const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
	const req = await fetch(
		`${zoomOAuth}/token?grant_type=account_credentials&account_id=${accountId}`,
		{method: 'POST', headers: {Authorization: `Basic ${token}`}}
	);
	try {
		const data = await req.json();
		return data.access_token;
	} catch {
		return null;
	}
}

async function getPastMeetingParticipants(
	accessToken,
	meetingId,
	participants,
	token
) {
	const req = await fetch(
		`${zoomAPI}/past_meetings/${meetingId}/participants?page_size=300${token ? '?next_page_token=' + token : ''}`,
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			}
		}
	);
	try {
		const data = await req.json();
		participants = participants.concat(data.participants);
		if (data.next_page_token) {
			return await getPastMeetingParticipants(
				accessToken,
				meetingId,
				participants,
				data.next_page_token
			);
		} else {
			return participants;
		}
	} catch {
		return null;
	}
}

export async function processWebhook(webhook) {
	const meeting = new Object();

	if (webhook.data.event === 'meeting.summary_completed') {
		meeting.summary = webhook.data.payload.object;
		const accessToken = await getAccessToken(
			process.env.ACCOUNT_ID,
			process.env.CLIENT_ID,
			process.env.CLIENT_SECRET
		);

		let uuid = meeting.summary.meeting_uuid;
		if (uuid.includes('/')) uuid = encodeURIComponent(uuid);
		const encodedUUID = encodeURIComponent(uuid);

		meeting.participants = await getPastMeetingParticipants(
			accessToken,
			encodedUUID,
			[]
		);

		const data = JSON.stringify(meeting, null, 2);
		await writeFile(`output/${uuid}.json`, data, {encoding: 'utf8'});
	}
}
