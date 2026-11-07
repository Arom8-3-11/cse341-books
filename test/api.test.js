import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
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

  it('documents the request and response shapes for every route', () => {
    const expectedResponses = {
      '/authors': { get: [200, 500], post: [201, 400, 413, 500] },
      '/authors/{id}': {
        get: [200, 404, 500],
        put: [200, 400, 404, 413, 500],
        delete: [204, 404, 409, 500]
      },
      '/books': { get: [200, 500], post: [201, 400, 413, 500] },
      '/books/{id}': {
        get: [200, 404, 500],
        put: [200, 400, 404, 413, 500],
        delete: [204, 404, 500]
      }
    };
    const resolve = (entry) => {
      if (!entry.$ref) {
        return entry;
      }
      return entry.$ref.slice(2).split('/').reduce((value, part) => {
        return value[part];
      }, swaggerDocument);
    };

    for (const [path, methods] of Object.entries(expectedResponses)) {
      for (const [method, statuses] of Object.entries(methods)) {
        const operation = swaggerDocument.paths[path][method];
        assert.ok(operation, `${method} ${path} is missing`);
        if (path.includes('{id}')) {
          assert.ok(operation.parameters.some((parameter) => {
            const resolved = resolve(parameter);
            return resolved.in === 'path' && resolved.name === 'id' && resolved.required;
          }));
        }
        if (method === 'post' || method === 'put') {
          assert.equal(operation.requestBody.required, true);
          assert.ok(operation.requestBody.content['application/json'].schema);
        }
        for (const status of statuses) {
          const response = operation.responses[String(status)];
          assert.ok(response, `${method} ${path} is missing ${status}`);
          const resolved = resolve(response);
          if (status === 204) {
            assert.equal(resolved.content, undefined);
          } else {
            assert.ok(resolved.content['application/json'].schema);
          }
        }
      }
    }
  });

  it('creates the indexes needed for unique ids and author reference checks', async () => {
    const authors = await getDb().collection('authors').indexes();
    const books = await getDb().collection('books').indexes();
    assert.ok(authors.some((index) => {
      return index.key.id === 1 && index.unique === true;
    }));
    assert.ok(books.some((index) => {
      return index.key.id === 1 && index.unique === true;
    }));
    assert.ok(books.some((index) => {
      return index.key.authorId === 1;
    }));
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

  it('accepts a 16 KiB JSON body and rejects the next byte', async () => {
    const body = JSON.stringify({ id: 'a-body-limit', name: 'Size Test', birthYear: 1980 });
    const exactly16KiB = body + ' '.repeat(16 * 1024 - Buffer.byteLength(body));
    const accepted = await request('POST', '/authors', exactly16KiB, true);
    assert.equal(accepted.status, 201);
    assert.equal((await request('DELETE', '/authors/a-body-limit')).status, 204);

    const tooLarge = await request('POST', '/authors', `${exactly16KiB} `, true);
    assert.equal(tooLarge.status, 413);
    assert.deepEqual(tooLarge.body, { message: 'Request body too large' });
  });

  it('counts author name limits in Unicode code points', async () => {
    const validName = '\u{1F4DA}'.repeat(200);
    const accepted = await request('POST', '/authors', {
      id: 'a-unicode',
      name: validName,
      birthYear: 1980
    });
    assert.equal(accepted.status, 201);
    assert.equal(accepted.body.name, validName);
    assert.equal((await request('DELETE', '/authors/a-unicode')).status, 204);

    const tooLong = await request('POST', '/authors', {
      id: 'a-unicode',
      name: '\u{1F4DA}'.repeat(201),
      birthYear: 1980
    });
    assert.equal(tooLong.status, 400);
    assert.deepEqual(tooLong.body, { message: 'Invalid request body' });
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

describe('book API', () => {
  const firstAuthorId = 'a-main';
  const secondAuthorId = 'a-book-second';
  const bookId = 'b-main';

  it('returns an empty list and documents every book route in Swagger', async () => {
    assert.deepEqual(await request('GET', '/books'), { status: 200, body: [], text: '[]' });
    assert.ok(swaggerDocument.paths['/books'].get);
    assert.ok(swaggerDocument.paths['/books'].post.requestBody.required);
    assert.ok(swaggerDocument.paths['/books/{id}'].get);
    assert.ok(swaggerDocument.paths['/books/{id}'].put.requestBody.required);
    assert.ok(swaggerDocument.paths['/books/{id}'].delete);
    assert.deepEqual(
      swaggerDocument.components.schemas.Book.required,
      ['id', 'authorId', 'title', 'publicationDate']
    );
  });

  it('creates, lists, and retrieves books with author references', async () => {
    const created = await request('POST', '/books', {
      id: bookId,
      authorId: firstAuthorId,
      title: '  Example Book  ',
      publicationDate: '2020-02-29'
    });
    const expected = {
      id: bookId,
      authorId: firstAuthorId,
      title: 'Example Book',
      publicationDate: '2020-02-29'
    };
    assert.equal(created.status, 201);
    assert.deepEqual(created.body, expected);

    const single = await request('GET', `/books/${bookId}`);
    assert.equal(single.status, 200);
    assert.deepEqual(single.body, expected);
    const list = await request('GET', '/books');
    assert.equal(list.status, 200);
    assert.deepEqual(list.body, [expected]);
    const missing = await request('GET', '/books/missing');
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { message: 'Book not found' });
  });

  it('rejects invalid fields, duplicate ids, and nonexistent authors', async () => {
    const valid = {
      id: 'b-invalid',
      authorId: firstAuthorId,
      title: 'Title',
      publicationDate: '2021-08-17'
    };
    const invalidBodies = [
      null,
      [],
      {},
      { authorId: firstAuthorId, title: 'Title', publicationDate: '2021-08-17' },
      { ...valid, id: { $ne: '' } },
      { ...valid, id: 'invalid id' },
      { ...valid, authorId: { $ne: '' } },
      { ...valid, title: '   ' },
      { ...valid, title: 'x'.repeat(201) },
      { ...valid, publicationDate: 2021 },
      { ...valid, publicationDate: '2021-02-29' },
      { ...valid, publicationDate: '2020-02-30' },
      { ...valid, publicationDate: '0000-01-01' },
      { ...valid, publicationDate: '2021-13-01' },
      { ...valid, publicationDate: '2021-1-01' },
      { ...valid, publicationDate: '2021-08-17T00:00:00Z' },
      { ...valid, author: 'Name' }
    ];
    for (const body of invalidBodies) {
      const response = await request('POST', '/books', body);
      assert.equal(response.status, 400);
      assert.deepEqual(response.body, { message: 'Invalid request body' });
    }

    const duplicate = await request('POST', '/books', { ...valid, id: bookId });
    assert.equal(duplicate.status, 400);
    assert.deepEqual(duplicate.body, { message: 'Book id already exists' });
    const unknownAuthor = await request('POST', '/books', { ...valid, authorId: 'missing' });
    assert.equal(unknownAuthor.status, 400);
    assert.deepEqual(unknownAuthor.body, { message: 'Author not found' });

    const earliest = await request('POST', '/books', {
      ...valid,
      id: 'b-earliest',
      publicationDate: '0001-01-01'
    });
    assert.equal(earliest.status, 201);
    assert.equal((await request('DELETE', '/books/b-earliest')).status, 204);
  });

  it('enforces unique book ids under concurrent creates', async () => {
    const body = {
      id: 'b-duplicate-race',
      authorId: firstAuthorId,
      title: 'Concurrent Book',
      publicationDate: '2021-08-17'
    };
    const results = await Promise.all([
      request('POST', '/books', body),
      request('POST', '/books', body)
    ]);
    assert.deepEqual(results.map((result) => {
      return result.status;
    }).sort(), [201, 400]);
    assert.deepEqual(results.find((result) => {
      return result.status === 400;
    }).body, { message: 'Book id already exists' });
    assert.equal((await request('DELETE', '/books/b-duplicate-race')).status, 204);
  });

  it('updates books and rejects bad references or missing targets', async () => {
    assert.equal((await request('POST', '/authors', {
      id: secondAuthorId,
      name: 'Second Author',
      birthYear: 1975
    })).status, 201);

    const update = {
      authorId: secondAuthorId,
      title: '  Updated Book  ',
      publicationDate: '2026-02-20'
    };
    const updated = await request('PUT', `/books/${bookId}`, update);
    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body, {
      id: bookId,
      authorId: secondAuthorId,
      title: 'Updated Book',
      publicationDate: '2026-02-20'
    });
    assert.deepEqual((await request('GET', `/books/${bookId}`)).body, updated.body);

    const invalid = await request('PUT', `/books/${bookId}`, { ...update, id: 'different' });
    assert.equal(invalid.status, 400);
    assert.deepEqual(invalid.body, { message: 'Invalid request body' });
    const unknownAuthor = await request('PUT', `/books/${bookId}`, { ...update, authorId: 'missing' });
    assert.equal(unknownAuthor.status, 400);
    assert.deepEqual(unknownAuthor.body, { message: 'Author not found' });
    const missing = await request('PUT', '/books/missing', { ...update, authorId: 'missing' });
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { message: 'Book not found' });
    assert.deepEqual((await request('GET', `/books/${bookId}`)).body, updated.body);
  });

  it('prevents deleting a referenced author until the book is deleted', async () => {
    const blocked = await request('DELETE', `/authors/${secondAuthorId}`);
    assert.equal(blocked.status, 409);
    assert.deepEqual(blocked.body, { message: 'Author has books' });

    const deleted = await request('DELETE', `/books/${bookId}`);
    assert.equal(deleted.status, 204);
    assert.equal(deleted.text, '');
    const missing = await request('DELETE', `/books/${bookId}`);
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { message: 'Book not found' });
    assert.equal((await request('DELETE', `/authors/${secondAuthorId}`)).status, 204);
  });

  it('keeps references valid when book creation races with author deletion', async () => {
    for (let index = 0; index < 5; index += 1) {
      const authorId = `a-create-race-${index}`;
      const id = `b-create-race-${index}`;
      assert.equal((await request('POST', '/authors', {
        id: authorId,
        name: 'Race Author',
        birthYear: 1980
      })).status, 201);

      const [created, deleted] = await Promise.all([
        request('POST', '/books', {
          id,
          authorId,
          title: 'Race Book',
          publicationDate: '2021-08-17'
        }),
        request('DELETE', `/authors/${authorId}`)
      ]);
      if (created.status === 201) {
        assert.equal(deleted.status, 409);
        assert.equal((await request('GET', `/authors/${authorId}`)).status, 200);
        assert.equal((await request('GET', `/books/${id}`)).status, 200);
        assert.equal((await request('DELETE', `/books/${id}`)).status, 204);
        assert.equal((await request('DELETE', `/authors/${authorId}`)).status, 204);
      } else {
        assert.equal(created.status, 400);
        assert.deepEqual(created.body, { message: 'Author not found' });
        assert.equal(deleted.status, 204);
        assert.equal((await request('GET', `/books/${id}`)).status, 404);
        assert.equal((await request('GET', `/authors/${authorId}`)).status, 404);
      }
    }
  });

  it('keeps references valid when reassignment races with author deletion', async () => {
    for (let index = 0; index < 3; index += 1) {
      const authorId = `a-update-race-${index}`;
      const id = `b-update-race-${index}`;
      assert.equal((await request('POST', '/authors', {
        id: authorId,
        name: 'Replacement Author',
        birthYear: 1980
      })).status, 201);
      assert.equal((await request('POST', '/books', {
        id,
        authorId: firstAuthorId,
        title: 'Race Book',
        publicationDate: '2021-08-17'
      })).status, 201);

      const [updated, deleted] = await Promise.all([
        request('PUT', `/books/${id}`, {
          authorId,
          title: 'Moved Book',
          publicationDate: '2021-08-17'
        }),
        request('DELETE', `/authors/${authorId}`)
      ]);
      const book = await request('GET', `/books/${id}`);
      if (updated.status === 200) {
        assert.equal(deleted.status, 409);
        assert.equal(book.body.authorId, authorId);
        assert.equal((await request('GET', `/authors/${authorId}`)).status, 200);
      } else {
        assert.equal(updated.status, 400);
        assert.deepEqual(updated.body, { message: 'Author not found' });
        assert.equal(deleted.status, 204);
        assert.equal(book.body.authorId, firstAuthorId);
      }
      assert.equal((await request('DELETE', `/books/${id}`)).status, 204);
      if (updated.status === 200) {
        assert.equal((await request('DELETE', `/authors/${authorId}`)).status, 204);
      }
    }
  });

  it('returns a safe error when the book database query fails', async () => {
    const db = getDb();
    const originalCollection = db.collection;
    db.collection = (name, ...args) => {
      if (name === 'books') {
        throw new Error('test-only internal book database detail');
      }
      return originalCollection.call(db, name, ...args);
    };
    try {
      const response = await request('GET', '/books/b-main');
      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { message: 'Internal server error' });
    } finally {
      db.collection = originalCollection;
    }
  });
});
