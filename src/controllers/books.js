import { createBook, deleteBook, getAllBooks, getBookById, updateBook } from '../models/books.js';
import { parseBook } from '../validation.js';

const getBooksHandler = async (req, res) => {
  try {
    const books = await getAllBooks();
    return res.status(200).json(books);
  } catch (error) {
    console.error('Failed to retrieve books:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getBookByIdHandler = async (req, res) => {
  try {
    const book = await getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json(book);
  } catch (error) {
    console.error('Failed to retrieve book:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createBookHandler = async (req, res) => {
  const book = parseBook(req.body, true);
  if (!book) {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  try {
    const created = await createBook(book);
    if (!created) {
      return res.status(400).json({ message: 'Author not found' });
    }
    return res.status(201).json(created);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Book id already exists' });
    }
    console.error('Failed to create book:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateBookHandler = async (req, res) => {
  const book = parseBook(req.body, false);
  if (!book) {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  try {
    const outcome = await updateBook(req.params.id, book);
    if (outcome.result === 'not-found') {
      return res.status(404).json({ message: 'Book not found' });
    }
    if (outcome.result === 'author-not-found') {
      return res.status(400).json({ message: 'Author not found' });
    }
    if (outcome.result !== 'updated') {
      throw new Error('Unexpected book update result.');
    }
    return res.status(200).json(outcome.book);
  } catch (error) {
    console.error('Failed to update book:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteBookHandler = async (req, res) => {
  try {
    const deleted = await deleteBook(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Book not found' });
    }
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete book:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export {
  createBookHandler,
  deleteBookHandler,
  getBookByIdHandler,
  getBooksHandler,
  updateBookHandler
};
