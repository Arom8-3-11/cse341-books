import { getDb } from '../db/connect.js';

const getAllBooks = async () => {
  return getDb()
    .collection('books')
    .find(
      {},
      {
        projection: {
          _id: 0,
          id: 1,
          author: 1,
          title: 1,
          publicationDate: 1
        }
      }
    )
    .toArray();
};

export { getAllBooks };
