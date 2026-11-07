import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { closeDb, connectToDb, getDb } from '../src/db/connect.js';

const originalDatabaseName = process.env.MONGODB_DB_NAME;
const testDatabaseName = `cse341_w02_mig_${randomBytes(8).toString('hex')}`;
let connected = false;

const runMigration = (...args) => {
  const result = spawnSync(process.execPath, [join('scripts', 'migrate-week02.js'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, MONGODB_DB_NAME: testDatabaseName }
  });
  if (result.error) {
    throw result.error;
  }
  return result;
};

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to run the MongoDB migration tests.');
  }

  process.env.MONGODB_DB_NAME = testDatabaseName;
  await connectToDb();
  connected = true;
  const db = getDb();
  await db.collection('authors').insertMany([
    { id: 'a-one', name: 'Legacy One', birthYear: 1970 },
    { id: 'a-two', name: 'Legacy Two', birthYear: 1980 }
  ]);
  await db.collection('books').insertMany([
    {
      id: 'b-one',
      author: 'Legacy One',
      title: 'First Book',
      publicationDate: '2021-08-17',
      notes: 'Preserve this field'
    },
    {
      id: 'b-two',
      author: 'Legacy Two',
      title: 'Second Book',
      publicationDate: '2020-02-29'
    }
  ]);
});

after(async () => {
  try {
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

describe('Week 02 migration', () => {
  it('previews without writing, adds references, and can be repeated', async () => {
    const books = getDb().collection('books');
    const preview = runMigration('--add-author-ids');
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /Dry run: add for 2 book\(s\)/);
    assert.equal(Object.hasOwn(await books.findOne({ id: 'b-one' }), 'authorId'), false);

    const applied = runMigration('--add-author-ids', '--apply');
    assert.equal(applied.status, 0, applied.stderr);
    assert.match(applied.stdout, /Applied: add for 2 book\(s\)/);
    const first = await books.findOne({ id: 'b-one' });
    const second = await books.findOne({ id: 'b-two' });
    assert.equal(first.authorId, 'a-one');
    assert.equal(first.author, 'Legacy One');
    assert.equal(first.notes, 'Preserve this field');
    assert.equal(second.authorId, 'a-two');
    assert.equal(second.author, 'Legacy Two');

    const repeated = runMigration('--add-author-ids', '--apply');
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.match(repeated.stdout, /Applied: add for 0 book\(s\)/);
  });

  it('rejects unknown, ambiguous, and conflicting matches without partial writes', async () => {
    const db = getDb();
    const books = db.collection('books');
    await books.insertMany([
      { id: 'b-candidate', author: 'Legacy One', title: 'Candidate', publicationDate: '2021-01-01' },
      { id: 'b-unknown', author: 'Unknown', title: 'Unknown', publicationDate: '2021-01-01' }
    ]);
    const unknown = runMigration('--add-author-ids', '--apply');
    assert.notEqual(unknown.status, 0);
    assert.match(unknown.stderr, /does not match exactly one author/);
    assert.equal(Object.hasOwn(await books.findOne({ id: 'b-candidate' }), 'authorId'), false);
    await books.deleteOne({ id: 'b-unknown' });

    await db.collection('authors').insertOne({ id: 'a-duplicate-name', name: 'Legacy One', birthYear: 1971 });
    const ambiguous = runMigration('--add-author-ids', '--apply');
    assert.notEqual(ambiguous.status, 0);
    assert.match(ambiguous.stderr, /does not match exactly one author/);
    assert.equal(Object.hasOwn(await books.findOne({ id: 'b-candidate' }), 'authorId'), false);
    await db.collection('authors').deleteOne({ id: 'a-duplicate-name' });
    await books.deleteOne({ id: 'b-candidate' });

    await books.insertOne({
      id: 'b-conflict',
      author: 'Legacy One',
      authorId: 'a-two',
      title: 'Conflict',
      publicationDate: '2021-01-01'
    });
    const conflict = runMigration('--add-author-ids', '--apply');
    assert.notEqual(conflict.status, 0);
    assert.match(conflict.stderr, /conflicting authorId/);
    assert.equal((await books.findOne({ id: 'b-conflict' })).authorId, 'a-two');
    await books.deleteOne({ id: 'b-conflict' });
  });

  it('refuses cleanup until all legacy books have references', async () => {
    const books = getDb().collection('books');
    await books.insertOne({
      id: 'b-not-ready',
      author: 'Legacy One',
      title: 'Not Ready',
      publicationDate: '2021-01-01'
    });
    const rejected = runMigration('--remove-author-names', '--apply');
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /needs an authorId/);
    assert.equal((await books.findOne({ id: 'b-one' })).author, 'Legacy One');
    await books.deleteOne({ id: 'b-not-ready' });
  });

  it('previews and removes legacy names without changing unrelated fields', async () => {
    const books = getDb().collection('books');
    const preview = runMigration('--remove-author-names');
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /Dry run: remove for 2 book\(s\)/);
    assert.equal((await books.findOne({ id: 'b-one' })).author, 'Legacy One');

    const applied = runMigration('--remove-author-names', '--apply');
    assert.equal(applied.status, 0, applied.stderr);
    assert.match(applied.stdout, /Applied: remove for 2 book\(s\)/);
    const first = await books.findOne({ id: 'b-one' });
    assert.equal(Object.hasOwn(first, 'author'), false);
    assert.equal(first.authorId, 'a-one');
    assert.equal(first.notes, 'Preserve this field');

    const repeated = runMigration('--remove-author-names', '--apply');
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.match(repeated.stdout, /Applied: remove for 0 book\(s\)/);
  });

  it('rejects invalid arguments and dangling author references', async () => {
    const invalidArgs = runMigration('--add-author-ids', '--remove-author-names');
    assert.notEqual(invalidArgs.status, 0);
    assert.match(invalidArgs.stderr, /Usage:/);

    const books = getDb().collection('books');
    await books.insertOne({
      id: 'b-dangling',
      authorId: 'missing',
      title: 'Dangling',
      publicationDate: '2021-01-01'
    });
    const dangling = runMigration('--add-author-ids');
    assert.notEqual(dangling.status, 0);
    assert.match(dangling.stderr, /references an unknown author/);
    await books.deleteOne({ id: 'b-dangling' });
  });
});
