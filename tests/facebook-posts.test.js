const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/facebook-posts');

const token = 'EAA_TEST_SECRET+/= credential';
const publicError = { error: 'Facebook posts are temporarily unavailable.' };

async function invoke(t, fetchImpl, method = 'GET') {
  const previous = { ...process.env };
  process.env.FACEBOOK_PAGE_ID = '123456789';
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN = token;
  process.env.FACEBOOK_GRAPH_API_VERSION = 'v26.0';
  t.after(() => {
    for (const name of ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN', 'FACEBOOK_GRAPH_API_VERSION']) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  t.mock.method(global, 'fetch', fetchImpl);
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  await handler({ method }, response);
  const serialized = JSON.stringify(logs);
  for (const secret of [token, encodeURIComponent(token), '123456789']) {
    assert(!serialized.includes(secret), 'logs must not contain configured values');
  }
  assert(!serialized.includes('https://'), 'logs must not contain request URLs');
  if (response.statusCode === 502) {
    assert.deepEqual(response.body, publicError);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
  return { response, logs: logs.map(([entry]) => JSON.parse(entry)) };
}

for (const status of [400, 200]) {
  test(`logs sanitized Graph errors with HTTP ${status}`, async t => {
    const { logs, response } = await invoke(t, async () => new Response(JSON.stringify({
      error: {
        code: 190, error_subcode: 463,
        message: `Session expired. ${token} ${encodeURIComponent(token)} ${new URLSearchParams({v:token}).toString().slice(2)} https://graph.facebook.com/posts?access_token=OTHER_SECRET access_token=OTHER_SECRET page 123456789\n`,
        secret: token,
      },
    }), { status }));
    assert.equal(response.statusCode, 502);
    assert.equal(logs[0].event, 'graph_error');
    assert.equal(logs[0].status, status);
    assert.equal(logs[0].code, 190);
    assert.equal(logs[0].subcode, 463);
    assert(logs[0].message.startsWith('Session expired.'));
    assert(!JSON.stringify(logs).includes('OTHER_SECRET'));
  });
}

test('network exceptions log only an allowlisted cause code', async t => {
  const { logs } = await invoke(t, async () => {
    throw new TypeError(`fetch failed https://graph.facebook.com/?access_token=${token}`, {
      cause: Object.assign(new Error(token), { code: 'ENOTFOUND' }),
    });
  });
  assert.deepEqual(logs, [{ source: 'facebook-posts', event: 'network_error', code: 'ENOTFOUND', aborted: false }]);
});

test('unknown network codes cannot leak arbitrary exception values', async t => {
  const { logs } = await invoke(t, async () => { throw { code: token, message: token, name: token }; });
  assert.equal(logs[0].code, 'UNKNOWN');
});

test('non-JSON upstream errors do not log response bodies', async t => {
  const { logs } = await invoke(t, async () => new Response(`<html>${token}</html>`, { status: 502 }));
  assert.equal(logs[0].event, 'invalid_response');
  assert.equal(logs[0].status, 502);
});

test('body download failures retain a safe network code', async t => {
  const { logs } = await invoke(t, async () => ({ status: 200, ok: true, json: async () => {
    throw Object.assign(new Error(token), { cause: { code: 'ECONNRESET' } });
  } }));
  assert.equal(logs[0].event, 'response_read_error');
  assert.equal(logs[0].code, 'ECONNRESET');
});

test('malformed Graph fields are omitted and messages are bounded', async t => {
  const { logs } = await invoke(t, async () => new Response(JSON.stringify({ error: {
    code: token, error_subcode: { secret: token }, message: 'x'.repeat(2000),
  } }), { status: 403 }));
  assert.equal(logs[0].code, null);
  assert.equal(logs[0].subcode, null);
  assert.equal(logs[0].message.length, 1000);
});

test('successful feed normalization and caching remain intact without logs', async t => {
  const { logs, response } = await invoke(t, async () => new Response(JSON.stringify({ data: [{
    id: 'post-1', message: '#FromTheGround School update', created_time: '2026-09-01',
    permalink_url: 'https://facebook.com/post-1',
    attachments: { data: [{ media_type: 'photo', media: { image: { src: '/photo.jpg' } } }] },
  }] })));
  assert.equal(response.statusCode, 200);
  assert.equal(response.body[0].caption, 'School update');
  assert.equal(response.body[0].mediaUrl, '/photo.jpg');
  assert.equal(response.headers['Cache-Control'], 'public, s-maxage=900, stale-while-revalidate=3600');
  assert.deepEqual(logs, []);
});
