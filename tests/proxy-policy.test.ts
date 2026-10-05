import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('proxy headers overwrite client claims and application port stays local', () => {
	const nginx = readFileSync('nginx/portfolio.conf.template', 'utf8');
	const compose = readFileSync('docker-compose.yml', 'utf8');
	const environment = readFileSync('deploy/portfolio.env.example', 'utf8');
	assert.equal((nginx.match(/proxy_set_header X-Real-IP \$remote_addr;/g) ?? []).length, 3);
	assert.equal((nginx.match(/proxy_set_header X-Forwarded-For \$remote_addr;/g) ?? []).length, 3);
	assert.doesNotMatch(nginx, /proxy_add_x_forwarded_for|proxy_set_header X-Real-IP \$http_/);
	assert.match(compose, /127\.0\.0\.1:\$\{HOST_APP_PORT:-3000\}:3000/);
	assert.match(environment, /^ADDRESS_HEADER=X-Real-IP$/m);
	assert.match(environment, /^XFF_DEPTH=$/m);
});

test('Cloudflare real-IP trust is generated from official CIDRs only', () => {
	const script = readFileSync('scripts/refresh-cloudflare-real-ip.sh', 'utf8');
	assert.match(script, /https:\/\/www\.cloudflare\.com\/ips-v4/);
	assert.match(script, /https:\/\/www\.cloudflare\.com\/ips-v6/);
	assert.match(script, /set_real_ip_from %s;/);
	assert.match(script, /real_ip_header CF-Connecting-IP;/);
	assert.match(script, /real_ip_recursive on;/);
	assert.doesNotMatch(script, /set_real_ip_from (?:0\.0\.0\.0\/0|::\/0)/);
});

test('static upload locations explicitly retain nosniff despite Nginx header inheritance', () => {
	const nginx = readFileSync('nginx/portfolio.conf.template', 'utf8');
	for (const location of ['/uploads/', '/assets/work/']) {
		const start = nginx.indexOf(`location ^~ ${location} {`);
		const nextLocation = nginx.indexOf('\n\tlocation ', start + 1);
		assert.ok(start >= 0);
		assert.match(nginx.slice(start, nextLocation), /add_header X-Content-Type-Options "nosniff" always;/);
	}
	assert.match(nginx, /types \{ application\/pdf pdf; \}/);
});
