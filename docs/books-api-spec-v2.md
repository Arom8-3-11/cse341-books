# Books API Spec — Version 2

## Purpose

Build a read-only Books API in Express with MongoDB storage. The API lets a
client retrieve all books or retrieve one book by its custom `id`.

## Data Model and Storage

- MongoDB database: `cse341-books-db`
- MongoDB collection: `books`
- Each book has these required fields:
  - `id`: unique string used by the API to find a book
  - `author`: string
  - `title`: string
  - `publicationDate`: string in ISO 8601 date-only format (`YYYY-MM-DD`)
- MongoDB's internal `_id` is not part of the API response.
- The database connection uses `MONGODB_URI` and `MONGODB_DB_NAME` environment
  variables. The database name must be configured as `cse341-books-db`.
- Seed the collection with at least three books for local testing.

## API Conventions

- Successful and error responses use JSON with the `application/json` content
  type.
- These endpoints require no request body, query parameters, or special request
  headers.
- Only the read operations in this specification are in scope. Authentication
  and authorization are not required for this Week 1 assignment.

## Endpoints

### `GET /books`

Return every book in the `books` collection as a JSON array. For this
assignment, the full collection is returned without pagination; clients must
not rely on a particular ordering.

- Success status: `200 OK`
- Unexpected error status: `500 Internal Server Error`

Example success response:

```json
[
  {
    "id": "b1",
    "author": "Maya Rivera",
    "title": "Patterns of Light",
    "publicationDate": "2021-08-17"
  },
  {
    "id": "b2",
    "author": "Jordan Lee",
    "title": "The Quiet Harbor",
    "publicationDate": "2019-04-03"
  }
]
```

If the collection contains no books, return `200 OK` with an empty array:

```json
[]
```

### `GET /books/:id`

Find one book by matching the path parameter to the book's custom `id` field.

- Path parameter: `id` (string)
- Success status: `200 OK`
- If no book matches: `404 Not Found`
- Unexpected error status: `500 Internal Server Error`

Example success response:

```json
{
  "id": "b1",
  "author": "Maya Rivera",
  "title": "Patterns of Light",
  "publicationDate": "2021-08-17"
}
```

Example not-found response:

```json
{
  "message": "Book not found"
}
```

## Error Handling

- For unexpected errors, log a concise diagnostic on the server and return
  `500 Internal Server Error` with this response:

```json
{
  "message": "Internal server error"
}
```

- Do not return stack traces, database error details, or other internal
  implementation details to clients.

## Out of Scope for Week 1

- `POST`, `PUT`, and `DELETE` endpoints
- Pagination and filtering
- Authentication and authorization
- MongoDB `ObjectId`-based API identifiers
