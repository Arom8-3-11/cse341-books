import express from 'express';
import {
  getBookByIdHandler,
  getBooksHandler
} from './controllers/books.js';

const router = express.Router();

router.get('/books', getBooksHandler);
router.get('/books/:id', getBookByIdHandler);

export default router;
