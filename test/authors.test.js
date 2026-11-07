import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { after, before, describe, it } from 'node:test';
import app from '../app.js';
import swaggerDocument from '../swagger.json' with { type: 'json' };
import { closeDb, connectToDb, getDb } from '../src/db/connect.js';

const originalDatabaseName = process.env.MONGODB_DB_NAME;
const testDatabaseName = `cse341_w02_test_${randomBytes(8).toString('hex')}`;
let connected = false;
let server;
let baseUrl;

const request = async (method, path, body, raw = false) => {
  const options = { method };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = raw ? body : JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    text
  };
};

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to run the MongoDB integration tests.');
  }

  process.env.MONGODB_DB_NAME = testDatabaseName;
  await connectToDb();
  connected = true;
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
    if (connected) {
      if (getDb().databaseName !== testDatabaseName) {
        throw new Error('Refusing to delete an unexpected test database.');
      }
      await getDb().dropDatabase();
    }
  } finally {
    if (connected) {
      await closeDb();
    }
    if (originalDatabaseName === undefined) {
      delete process.env.MONGODB_DB_NAME;
    } else {
      process.env.MONGODB_DB_NAME = originalDatabaseName;
    }
  }
});

describe('author API', () => {
  it('returns an empty list and serves Swagger', async () => {
    assert.deepEqual(await request('GET', '/authors'), { status: 200, body: [], text: '[]' });
    const docs = await fetch(`${baseUrl}/api-docs/`);
    assert.equal(docs.status, 200);
    assert.match(await docs.text(), /Swagger UI/);

    assert.ok(swaggerDocument.paths['/authors'].get);
    assert.ok(swaggerDocument.paths['/authors'].post.requestBody.required);
    assert.ok(swaggerDocument.paths['/authors/{id}'].get);
    assert.ok(swaggerDocument.paths['/authors/{id}'].put.requestBody.required);
    assert.ok(swaggerDocument.paths['/authors/{id}'].delete.responses['409']);
  });

  it('creates, lists, and retrieves authors without MongoDB internals', async () => {
    const created = await request('POST', '/authors', {
      id: 'a-main',
      name: '  Example Author  ',
      birthYear: 1980
    });
    const expected = { id: 'a-main', name: 'Example Author', birthYear: 1980 };
    assert.equal(created.status, 201);
    assert.deepEqual(created.body, expected);

    const single = await request('GET', '/authors/a-main');
    assert.equal(single.status, 200);
    assert.deepEqual(single.body, expected);
    const list = await request('GET', '/authors');
    assert.equal(list.status, 200);
    assert.deepEqual(list.body, [expected]);
    assert.deepEqual((await request('GET', '/authors/missing')).body, { message: 'Author not found' });
    assert.equal((await request('GET', '/authors/missing')).status, 404);
  });

  it('rejects duplicate ids, invalid fields, malformed JSON, and oversized bodies', async () => {
    const duplicate = await request('POST', '/authors', {
      id: 'a-main',
      name: 'Duplicate',
      birthYear: 1980
    });
    assert.equal(duplicate.status, 400);
    assert.deepEqual(duplicate.body, { message: 'Author id already exists' });

    const invalidBodies = [
      null,
      [],
      {},
      { id: 'a-invalid', name: 'Name' },
      { id: { $ne: '' }, name: 'Name', birthYear: 1980 },
      { id: 'bad id', name: 'Name', birthYear: 1980 },
      { id: 'a-invalid', name: '   ', birthYear: 1980 },
      { id: 'a-invalid', name: 'x'.repeat(201), birthYear: 1980 },
      { id: 'a-invalid', name: 'Name', birthYear: '1980' },
      { id: 'a-invalid', name: 'Name', birthYear: 1980.5 },
      { id: 'a-invalid', name: 'Name', birthYear: 0 },
      { id: 'a-invalid', name: 'Name', birthYear: 2101 },
      { id: 'a-invalid', name: 'Name', birthYear: 1980, extra: true }
    ];
    for (const body of invalidBodies) {
      const response = await request('POST', '/authors', body);
      assert.equal(response.status, 400);
      assert.deepEqual(response.body, { message: 'Invalid request body' });
    }

    const malformed = await request('POST', '/authors', '{"id":', true);
    assert.equal(malformed.status, 400);
    assert.deepEqual(malformed.body, { message: 'Invalid JSON' });
    const oversized = await request('POST', '/authors', {
      id: 'a-large',
      name: 'x'.repeat(16 * 1024),
      birthYear: 1980
    });
    assert.equal(oversized.status, 413);
    assert.deepEqual(oversized.body, { message: 'Request body too large' });
  });

  it('updates authors and handles invalid or missing targets', async () => {
    const updated = await request('PUT', '/authors/a-main', {
      name: '  Updated Author  ',
      birthYear: 1981
    });
    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body, { id: 'a-main', name: 'Updated Author', birthYear: 1981 });
    assert.deepEqual((await request('GET', '/authors/a-main')).body, updated.body);

    const immutableId = await request('PUT', '/authors/a-main', {
      id: 'different',
      name: 'Updated Author',
      birthYear: 1981
    });
    assert.equal(immutableId.status, 400);
    assert.deepEqual(immutableId.body, { message: 'Invalid request body' });
    const missing = await request('PUT', '/authors/missing', { name: 'Name', birthYear: 1981 });
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { message: 'Author not found' });
  });

  it('prevents deletion while books reference the author', async () => {
    assert.equal((await request('POST', '/authors', {
      id: 'a-linked',
      name: 'Linked Author',
      birthYear: 1975
    })).status, 201);
    await getDb().collection('books').insertOne({
      id: 'b-linked',
      authorId: 'a-linked',
      title: 'Linked Book',
      publicationDate: '2021-08-17'
    });

    const blocked = await request('DELETE', '/authors/a-linked');
    assert.equal(blocked.status, 409);
    assert.deepEqual(blocked.body, { message: 'Author has books' });
    assert.equal((await request('GET', '/authors/a-linked')).status, 200);

    await getDb().collection('books').deleteOne({ id: 'b-linked' });
    const deleted = await request('DELETE', '/authors/a-linked');
    assert.equal(deleted.status, 204);
    assert.equal(deleted.text, '');
    const missing = await request('DELETE', '/authors/a-linked');
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { message: 'Author not found' });
  });

  it('logs unexpected database errors without exposing details to clients', async () => {
    const db = getDb();
    const originalCollection = db.collection;
    db.collection = (name, ...args) => {
      if (name === 'authors') {
        throw new Error('test-only internal database detail');
      }
      return originalCollection.call(db, name, ...args);
    };

    try {
      const response = await request('GET', '/authors');
      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { message: 'Internal server error' });
    } finally {
      db.collection = originalCollection;
    }
  });
});
