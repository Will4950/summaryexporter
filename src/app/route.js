import {processWebhook} from '@/zoom';
import {createHmac} from 'node:crypto';

export async function POST(req) {
	const webhook = new Object();

	try {
		webhook.data = await req.json();
	} catch {
		return new Response(JSON.stringify({error: 'Invalid JSON'}), {
			status: 400
		});
	}

	if (!webhook.data.event) return new Response(null, {status: 400});
	if (!webhook.data.event_ts) return new Response(null, {status: 400});

	if (webhook.data.event === 'endpoint.url_validation') {
		const hashForPlainToken = createHmac('sha256', process.env.SECRET)
			.update(webhook.data.payload.plainToken)
			.digest('hex');

		const challengeResponse = JSON.stringify({
			plainToken: webhook.data.payload.plainToken,
			encryptedToken: hashForPlainToken
		});

		return new Response(challengeResponse, {status: 200});
	}

	console.log(webhook.data.event);
	processWebhook(webhook);
	return new Response(null, {status: 200});
}
