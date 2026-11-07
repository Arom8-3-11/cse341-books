import { writeFileSync } from 'node:fs';
import swaggerJsdoc from 'swagger-jsdoc';

const authorProperties = {
  id: {
    type: 'string',
    pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$',
    example: 'a1'
  },
  name: {
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description: 'Trimmed author name.',
    example: 'Maya Rivera'
  },
  birthYear: {
    type: 'integer',
    minimum: 1,
    maximum: 2100,
    example: 1980
  }
};

const bookProperties = {
  id: {
    type: 'string',
    pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$',
    example: 'b1'
  },
  authorId: {
    type: 'string',
    pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$',
    description: 'Custom id of an existing author.',
    example: 'a1'
  },
  title: {
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description: 'Trimmed book title.',
    example: 'Patterns of Light'
  },
  publicationDate: {
    type: 'string',
    format: 'date',
    description: 'A real calendar date in YYYY-MM-DD format.',
    example: '2021-08-17'
  }
};

const errorResponse = (description, examples) => {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        examples
      }
    }
  };
};

const invalidBodyExamples = {
  invalidBody: { value: { message: 'Invalid request body' } },
  invalidJson: { value: { message: 'Invalid JSON' } }
};

// Describe the API itself and tell swagger-jsdoc where to find route docs.
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Books API',
      version: '2.0.0',
      description: 'An API for working with books and their authors.'
    },
    servers: [
      {
        url: '/',
        description: 'Current server'
      }
    ],
    components: {
      schemas: {
        // Reusable response shapes keep the generated route documentation concise.
        Book: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'authorId', 'title', 'publicationDate'],
          properties: bookProperties
        },
        BookCreate: {
          $ref: '#/components/schemas/Book'
        },
        BookUpdate: {
          type: 'object',
          additionalProperties: false,
          required: ['authorId', 'title', 'publicationDate'],
          properties: {
            authorId: bookProperties.authorId,
            title: bookProperties.title,
            publicationDate: bookProperties.publicationDate
          }
        },
        Error: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              example: 'Internal server error'
            }
          }
        },
        Author: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'birthYear'],
          properties: authorProperties
        },
        AuthorCreate: {
          $ref: '#/components/schemas/Author'
        },
        AuthorUpdate: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'birthYear'],
          properties: {
            name: authorProperties.name,
            birthYear: authorProperties.birthYear
          }
        }
      },
      parameters: {
        BookId: {
          in: 'path',
          name: 'id',
          required: true,
          description: 'The custom book id, such as b1.',
          schema: { type: 'string' }
        },
        AuthorId: {
          in: 'path',
          name: 'id',
          required: true,
          description: 'The custom author id, such as a1.',
          schema: { type: 'string' }
        }
      },
      responses: {
        InvalidBody: errorResponse('Invalid request body or malformed JSON.', invalidBodyExamples),
        AuthorCreateBadRequest: errorResponse('Invalid body, malformed JSON, or duplicate author id.', {
          ...invalidBodyExamples,
          duplicateId: { value: { message: 'Author id already exists' } }
        }),
        AuthorNotFound: errorResponse('Author not found.', {
          notFound: { value: { message: 'Author not found' } }
        }),
        AuthorHasBooks: errorResponse('Author is still referenced by one or more books.', {
          hasBooks: { value: { message: 'Author has books' } }
        }),
        BookCreateBadRequest: errorResponse('Invalid body, malformed JSON, duplicate book id, or unknown author.', {
          ...invalidBodyExamples,
          duplicateId: { value: { message: 'Book id already exists' } },
          unknownAuthor: { value: { message: 'Author not found' } }
        }),
        BookUpdateBadRequest: errorResponse('Invalid body, malformed JSON, or unknown author.', {
          ...invalidBodyExamples,
          unknownAuthor: { value: { message: 'Author not found' } }
        }),
        BookNotFound: errorResponse('Book not found.', {
          notFound: { value: { message: 'Book not found' } }
        }),
        BodyTooLarge: errorResponse('JSON request body exceeds 16 KiB (16,384 bytes).', {
          tooLarge: { value: { message: 'Request body too large' } }
        }),
        InternalError: errorResponse('Unexpected server or database error.', {
          internalError: { value: { message: 'Internal server error' } }
        })
      }
    }
  },
  apis: ['./src/router.js', './app.js']
};

// Build the OpenAPI document from the settings and route comments.
const swaggerSpec = swaggerJsdoc(options);

// Commit this generated file so production can serve the docs without generating them.
writeFileSync('./swagger.json', JSON.stringify(swaggerSpec, null, 2));
console.log('Swagger documentation generated.');
