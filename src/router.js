import express from 'express';
import {
  createBookHandler,
  deleteBookHandler,
  getBookByIdHandler,
  getBooksHandler,
  updateBookHandler
} from './controllers/books.js';
import {
  createAuthorHandler,
  deleteAuthorHandler,
  getAuthorByIdHandler,
  getAuthorsHandler,
  updateAuthorHandler
} from './controllers/authors.js';

const router = express.Router();

/**
 * @openapi
 * /books:
 *   get:
 *     summary: Get all books
 *     tags:
 *       - Books
 *     responses:
 *       200:
 *         description: Books returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/books', getBooksHandler);

/**
 * @openapi
 * /books/{id}:
 *   get:
 *     summary: Get one book by id
 *     tags:
 *       - Books
 *     parameters:
 *       - $ref: '#/components/parameters/BookId'
 *     responses:
 *       200:
 *         description: Book returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         $ref: '#/components/responses/BookNotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/books/:id', getBookByIdHandler);

/**
 * @openapi
 * /books:
 *   post:
 *     summary: Create a book for an existing author
 *     tags:
 *       - Books
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookCreate'
 *           example:
 *             id: b4
 *             authorId: a1
 *             title: Example Book Title
 *             publicationDate: '2026-01-15'
 *     responses:
 *       201:
 *         description: Book created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         $ref: '#/components/responses/BookCreateBadRequest'
 *       413:
 *         $ref: '#/components/responses/BodyTooLarge'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/books', createBookHandler);

/**
 * @openapi
 * /books/{id}:
 *   put:
 *     summary: Update a book
 *     tags:
 *       - Books
 *     parameters:
 *       - $ref: '#/components/parameters/BookId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookUpdate'
 *           example:
 *             authorId: a2
 *             title: Updated Book Title
 *             publicationDate: '2026-02-20'
 *     responses:
 *       200:
 *         description: Book updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         $ref: '#/components/responses/BookUpdateBadRequest'
 *       404:
 *         $ref: '#/components/responses/BookNotFound'
 *       413:
 *         $ref: '#/components/responses/BodyTooLarge'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.put('/books/:id', updateBookHandler);

/**
 * @openapi
 * /books/{id}:
 *   delete:
 *     summary: Delete a book
 *     tags:
 *       - Books
 *     parameters:
 *       - $ref: '#/components/parameters/BookId'
 *     responses:
 *       204:
 *         description: Book deleted; no response body
 *       404:
 *         $ref: '#/components/responses/BookNotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/books/:id', deleteBookHandler);

/**
 * @openapi
 * /authors:
 *   get:
 *     summary: Get all authors
 *     tags:
 *       - Authors
 *     responses:
 *       200:
 *         description: Authors returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Author'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/authors', getAuthorsHandler);

/**
 * @openapi
 * /authors/{id}:
 *   get:
 *     summary: Get an author by custom id
 *     tags:
 *       - Authors
 *     parameters:
 *       - $ref: '#/components/parameters/AuthorId'
 *     responses:
 *       200:
 *         description: Author returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Author'
 *       404:
 *         $ref: '#/components/responses/AuthorNotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/authors/:id', getAuthorByIdHandler);

/**
 * @openapi
 * /authors:
 *   post:
 *     summary: Create an author
 *     tags:
 *       - Authors
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthorCreate'
 *           example:
 *             id: a4
 *             name: Example Author
 *             birthYear: 1980
 *     responses:
 *       201:
 *         description: Author created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Author'
 *       400:
 *         $ref: '#/components/responses/AuthorCreateBadRequest'
 *       413:
 *         $ref: '#/components/responses/BodyTooLarge'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/authors', createAuthorHandler);

/**
 * @openapi
 * /authors/{id}:
 *   put:
 *     summary: Update an author
 *     tags:
 *       - Authors
 *     parameters:
 *       - $ref: '#/components/parameters/AuthorId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthorUpdate'
 *           example:
 *             name: Updated Author
 *             birthYear: 1981
 *     responses:
 *       200:
 *         description: Author updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Author'
 *       400:
 *         $ref: '#/components/responses/InvalidBody'
 *       404:
 *         $ref: '#/components/responses/AuthorNotFound'
 *       413:
 *         $ref: '#/components/responses/BodyTooLarge'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.put('/authors/:id', updateAuthorHandler);

/**
 * @openapi
 * /authors/{id}:
 *   delete:
 *     summary: Delete an author who has no books
 *     tags:
 *       - Authors
 *     parameters:
 *       - $ref: '#/components/parameters/AuthorId'
 *     responses:
 *       204:
 *         description: Author deleted; no response body
 *       404:
 *         $ref: '#/components/responses/AuthorNotFound'
 *       409:
 *         $ref: '#/components/responses/AuthorHasBooks'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/authors/:id', deleteAuthorHandler);

export default router;
