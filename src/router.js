import express from 'express';
import {
  getBookByIdHandler,
  getBooksHandler
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
 *         description: Unable to retrieve books
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *       - in: path
 *         name: id
 *         required: true
 *         description: The custom book id, such as b1
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Unable to retrieve book
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/books/:id', getBookByIdHandler);

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
