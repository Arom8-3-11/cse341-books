# Books API Spec — Version 1

## Purpose

Create a basic web service that returns book data.

## Data Model

Book fields:

- `id`: string
- `author`: string
- `title`: string
- `publicationDate`: string

## Endpoints

### `GET /books`

- Returns all books.
- Response status: `200` on success.

### `GET /books/:id`

- Returns one book with a matching `id`.
- Response status: `200` on success.
- If no book matches: `404`.

## Initial Assumptions

- Data is stored in a MongoDB collection named `books`.
- The API returns JSON.
