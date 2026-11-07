import {
  createAuthor,
  deleteAuthor,
  getAllAuthors,
  getAuthorById,
  updateAuthor
} from '../models/authors.js';
import { parseAuthor } from '../validation.js';

const getAuthorsHandler = async (req, res) => {
  try {
    const authors = await getAllAuthors();
    return res.status(200).json(authors);
  } catch (error) {
    console.error('Failed to retrieve authors:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAuthorByIdHandler = async (req, res) => {
  try {
    const author = await getAuthorById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }
    return res.status(200).json(author);
  } catch (error) {
    console.error('Failed to retrieve author:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createAuthorHandler = async (req, res) => {
  const author = parseAuthor(req.body, true);
  if (!author) {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  try {
    const created = await createAuthor(author);
    return res.status(201).json(created);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Author id already exists' });
    }
    console.error('Failed to create author:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateAuthorHandler = async (req, res) => {
  const author = parseAuthor(req.body, false);
  if (!author) {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  try {
    const updated = await updateAuthor(req.params.id, author);
    if (!updated) {
      return res.status(404).json({ message: 'Author not found' });
    }
    return res.status(200).json(updated);
  } catch (error) {
    console.error('Failed to update author:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteAuthorHandler = async (req, res) => {
  try {
    const result = await deleteAuthor(req.params.id);
    if (result === 'not-found') {
      return res.status(404).json({ message: 'Author not found' });
    }
    if (result === 'has-books') {
      return res.status(409).json({ message: 'Author has books' });
    }
    if (result !== 'deleted') {
      throw new Error('Unexpected author deletion result.');
    }
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to delete author:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export {
  createAuthorHandler,
  deleteAuthorHandler,
  getAuthorByIdHandler,
  getAuthorsHandler,
  updateAuthorHandler
};
