import { getClient, getDb } from '../db/connect.js';

const authorProjection = { _id: 0, id: 1, name: 1, birthYear: 1 };

const getAllAuthors = async () => {
  return getDb()
    .collection('authors')
    .find({}, { projection: authorProjection })
    .toArray();
};

const getAuthorById = async (id) => {
  return getDb()
    .collection('authors')
    .findOne({ id }, { projection: authorProjection });
};

const createAuthor = async (author) => {
  await getDb().collection('authors').insertOne({ ...author });
  return author;
};

const updateAuthor = async (id, author) => {
  return getDb()
    .collection('authors')
    .findOneAndUpdate(
      { id },
      { $set: author },
      { projection: authorProjection, returnDocument: 'after', includeResultMetadata: false }
    );
};

const deleteAuthor = async (id) => {
  return getClient().withSession(async (session) => {
    return session.withTransaction(async () => {
      const db = getDb();
      const authors = db.collection('authors');
      const author = await authors.findOne({ id }, { session, projection: { _id: 1 } });
      if (!author) {
        return 'not-found';
      }

      const book = await db.collection('books').findOne(
        { authorId: id },
        { session, projection: { _id: 1 } }
      );
      if (book) {
        return 'has-books';
      }

      const result = await authors.deleteOne({ id }, { session });
      if (result.deletedCount !== 1) {
        throw new Error('Author deletion did not delete the expected document.');
      }
      return 'deleted';
    });
  });
};

export { createAuthor, deleteAuthor, getAllAuthors, getAuthorById, updateAuthor };
