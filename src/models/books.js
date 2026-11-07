import { getClient, getDb } from '../db/connect.js';

const bookProjection = { _id: 0, id: 1, authorId: 1, title: 1, publicationDate: 1 };

const getAllBooks = async () => {
  return getDb()
    .collection('books')
    .find({}, { projection: bookProjection })
    .toArray();
};

const getBookById = async (id) => {
  return getDb()
    .collection('books')
    .findOne({ id }, { projection: bookProjection });
};

const touchAuthor = async (id, session) => {
  // This write makes concurrent book changes and author deletion conflict.
  const result = await getDb().collection('authors').updateOne(
    { id },
    { $inc: { _bookRefVersion: 1 } },
    { session }
  );
  return result.matchedCount === 1;
};

const createBook = async (book) => {
  return getClient().withSession(async (session) => {
    return session.withTransaction(async () => {
      if (!await touchAuthor(book.authorId, session)) {
        return null;
      }

      await getDb().collection('books').insertOne({ ...book }, { session });
      return book;
    });
  });
};

const updateBook = async (id, book) => {
  return getClient().withSession(async (session) => {
    return session.withTransaction(async () => {
      const books = getDb().collection('books');
      const existing = await books.findOne({ id }, { session, projection: { _id: 1 } });
      if (!existing) {
        return { result: 'not-found' };
      }
      if (!await touchAuthor(book.authorId, session)) {
        return { result: 'author-not-found' };
      }

      const updated = await books.findOneAndUpdate(
        { id },
        { $set: book, $unset: { author: '' } },
        { session, projection: bookProjection, returnDocument: 'after', includeResultMetadata: false }
      );
      if (!updated) {
        throw new Error('Book update did not find the expected document.');
      }
      return { result: 'updated', book: updated };
    });
  });
};

const deleteBook = async (id) => {
  const result = await getDb().collection('books').deleteOne({ id });
  return result.deletedCount === 1;
};

export { createBook, deleteBook, getAllBooks, getBookById, updateBook };
