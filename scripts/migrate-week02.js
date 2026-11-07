import { MongoClient } from 'mongodb';
import { isValidId, parseAuthor, parseBook } from '../src/validation.js';

const createPlan = async (db, mode, session) => {
  const options = session ? { session } : {};
  const authors = await db.collection('authors').find({}, options).toArray();
  const books = await db.collection('books').find({}, options).toArray();
  const authorsById = new Map();
  const authorsByName = new Map();
  const bookIds = new Set();
  const changes = [];

  for (const author of authors) {
    const parsed = parseAuthor({
      id: author.id,
      name: author.name,
      birthYear: author.birthYear
    }, true);
    if (!parsed || parsed.name !== author.name || authorsById.has(author.id)) {
      throw new Error(`Invalid or duplicate author id: ${String(author.id)}`);
    }
    authorsById.set(author.id, author);
    const matchingAuthors = authorsByName.get(author.name) || [];
    matchingAuthors.push(author);
    authorsByName.set(author.name, matchingAuthors);
  }

  for (const book of books) {
    if (!isValidId(book.id) || bookIds.has(book.id)) {
      throw new Error(`Invalid or duplicate book id: ${String(book.id)}`);
    }
    bookIds.add(book.id);

    const hasLegacyName = Object.hasOwn(book, 'author');
    const hasAuthorId = Object.hasOwn(book, 'authorId');
    let authorId = book.authorId;

    if (hasLegacyName) {
      const matches = authorsByName.get(book.author) || [];
      if (matches.length !== 1) {
        throw new Error(`Book ${book.id} does not match exactly one author by name.`);
      }
      if (hasAuthorId && authorId !== matches[0].id) {
        throw new Error(`Book ${book.id} has a conflicting authorId.`);
      }
      authorId = matches[0].id;
    } else if (!hasAuthorId) {
      throw new Error(`Book ${book.id} has neither an author name nor an authorId.`);
    }

    if (!isValidId(authorId) || !authorsById.has(authorId)) {
      throw new Error(`Book ${book.id} references an unknown author.`);
    }
    const parsed = parseBook({
      id: book.id,
      authorId,
      title: book.title,
      publicationDate: book.publicationDate
    }, true);
    if (!parsed || parsed.title !== book.title) {
      throw new Error(`Book ${book.id} has invalid required fields.`);
    }

    if (mode === 'add' && !hasAuthorId) {
      changes.push({ mongoId: book._id, id: book.id, author: book.author, authorId });
    }
    if (mode === 'remove' && hasLegacyName) {
      if (!hasAuthorId) {
        throw new Error(`Book ${book.id} needs an authorId before removing its author name.`);
      }
      changes.push({ mongoId: book._id, id: book.id, author: book.author, authorId });
    }
  }

  return changes;
};

const applyPlan = async (db, mode, session) => {
  const changes = await createPlan(db, mode, session);
  for (const change of changes) {
    const author = await db.collection('authors').updateOne(
      { id: change.authorId, name: change.author },
      { $inc: { _bookRefVersion: 1 } },
      { session }
    );
    if (author.matchedCount !== 1) {
      throw new Error(`Author for book ${change.id} changed during migration.`);
    }

    const filter = {
      _id: change.mongoId,
      id: change.id,
      author: change.author,
      authorId: mode === 'add' ? { $exists: false } : change.authorId
    };
    const update = mode === 'add'
      ? { $set: { authorId: change.authorId } }
      : { $unset: { author: '' } };
    const result = await db.collection('books').updateOne(filter, update, { session });
    if (result.matchedCount !== 1) {
      throw new Error(`Book ${change.id} changed during migration.`);
    }
  }
  return changes;
};

const main = async () => {
  const args = process.argv.slice(2);
  const modes = args.filter((arg) => {
    return arg === '--add-author-ids' || arg === '--remove-author-names';
  });
  if (modes.length !== 1 ||
      args.some((arg) => {
        return !['--add-author-ids', '--remove-author-names', '--apply'].includes(arg);
      }) ||
      args.filter((arg) => {
        return arg === '--apply';
      }).length > 1) {
    throw new Error('Usage: npm run migrate:week02 -- --add-author-ids|--remove-author-names [--apply]');
  }
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
    throw new Error('MONGODB_URI and MONGODB_DB_NAME are required.');
  }

  const mode = modes[0] === '--add-author-ids' ? 'add' : 'remove';
  const apply = args.includes('--apply');
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const changes = apply
      ? await client.withSession(async (session) => {
        return session.withTransaction(async () => {
          return applyPlan(db, mode, session);
        });
      })
      : await createPlan(db, mode);

    console.log(`${apply ? 'Applied' : 'Dry run'}: ${mode} for ${changes.length} book(s).`);
    for (const change of changes) {
      console.log(`${change.id}: ${change.author} -> ${change.authorId}`);
    }
  } finally {
    await client.close();
  }
};

try {
  await main();
} catch (error) {
  console.error('Week 02 migration failed:', error.message);
  process.exitCode = 1;
}
