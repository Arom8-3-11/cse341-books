import { writeFileSync } from 'node:fs';
import swaggerJsdoc from 'swagger-jsdoc';

// Describe the API itself and tell swagger-jsdoc where to find route docs.
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Books API',
      version: '1.0.0',
      description: 'A simple API for working with books'
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
          required: ['id', 'author', 'title', 'publicationDate'],
          properties: {
            id: {
              type: 'string',
              example: 'b1'
            },
            author: {
              type: 'string',
              example: 'Maya Rivera'
            },
            title: {
              type: 'string',
              example: 'Patterns of Light'
            },
            publicationDate: {
              type: 'string',
              format: 'date',
              example: '2021-08-17'
            }
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
        }
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
