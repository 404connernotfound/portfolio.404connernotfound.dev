import { createHash } from 'node:crypto';

export const reviewFingerprint = (input: {
	name: string;
	quote: string;
	clientAddress: string;
}): string =>
	createHash('sha256')
		.update(`${input.name.toLowerCase()}\n${input.quote.toLowerCase()}\n${input.clientAddress}`)
		.digest('hex');
