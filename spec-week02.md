# Books API Week 02 Spec - Version 1

## Feature 1: Book CRUD Operations and Author References

### Goal
Update the existing Week 01 book API so book documents include a reference to an author and the API supports all CRUD operations for books. Every book route must be documented and testable in Swagger.

### Data Model
Book documents will be stored in the `books` collection.

Required book fields:
- `id`: string, required, custom id such as `b1`
- `authorId`: string, required, references the `id` field of an author document
- `title`: string, required
- `publicationDate`: string, required

Books will continue to use custom string ids instead of MongoDB `_id` values for route parameters.

### Relationship to Authors
Each book will identify its author with an `authorId` field. The value of `authorId` must match the custom `id` value of an existing author document.

When creating or updating a book, the API should reject the request with a `400` status code if the submitted `authorId` does not match an existing author.

### Routes

#### GET /books
Purpose: Return all books.

Success:
- Status code: `200`
- Response body: an array of book objects

Errors:
- `500` if an unexpected server or database error occurs

#### GET /books/:id
Purpose: Return one book by its custom id.

Success:
- Status code: `200`
- Response body: the matching book object

Errors:
- `404` if no book exists with that id
- `500` if an unexpected server or database error occurs

#### POST /books
Purpose: Create a new book.

Request body:

    {
      "id": "b4",
      "authorId": "a1",
      "title": "Example Book Title",
      "publicationDate": "2026-01-15"
    }

Success:
- Status code: `201`
- Response body: the newly created book object

Errors:
- `400` if a required field is missing
- `400` if the `id` already exists
- `400` if the `authorId` does not match an existing author
- `500` if an unexpected server or database error occurs

#### PUT /books/:id
Purpose: Update an existing book.

Request body:

    {
      "authorId": "a2",
      "title": "Updated Book Title",
      "publicationDate": "2026-02-20"
    }

Success:
- Status code: `200`
- Response body: the updated book object

Errors:
- `400` if a required field is missing
- `400` if the `authorId` does not match an existing author
- `404` if no book exists with that id
- `500` if an unexpected server or database error occurs

#### DELETE /books/:id
Purpose: Delete an existing book.

Success:
- Status code: `204`
- Response body: none

Errors:
- `404` if no book exists with that id
- `500` if an unexpected server or database error occurs

### Swagger Documentation
Swagger must document every book route.

### Deployment Expectations
After implementation, the book routes must work locally and from the deployed Render application. The deployed Swagger page at `/api-docs` must allow someone to test every book route from the browser.

## Feature 2: Author CRUD Operations

### Goal
Add an authors collection and a complete API for managing authors. Every
author route must be documented and testable in Swagger.

### Data Model
Author documents will be stored in the `authors` collection.

Required author fields:
- `id`: string, required, custom id such as `a1`
- `name`: string, required
- `birthYear`: integer, required

Routes use the custom `id`, not MongoDB's `_id`.

### Relationship to Books
Books reference authors using `authorId`. Reject deletion with `409` if the
author still has books; the client must first delete or reassign those books.

### Routes

#### GET /authors
Purpose: Return all authors.

Success:
- Status code: `200`
- Response body: an array of author objects

Errors:
- `500` if an unexpected server or database error occurs

#### GET /authors/:id
Purpose: Return one author by custom id.

Success:
- Status code: `200`
- Response body: the matching author object

Errors:
- `404` if no author exists with that id
- `500` if an unexpected server or database error occurs

#### POST /authors
Purpose: Create an author.

Request body:

    {
      "id": "a4",
      "name": "Example Author",
      "birthYear": 1980
    }

Success:
- Status code: `201`
- Response body: the newly created author object

Errors:
- `400` if a required field is missing or the id already exists
- `500` if an unexpected server or database error occurs

#### PUT /authors/:id
Purpose: Update an author without changing its id.

Request body:

    {
      "name": "Updated Author",
      "birthYear": 1981
    }

Success:
- Status code: `200`
- Response body: the updated author object

Errors:
- `400` if a required field is missing
- `404` if no author exists with that id
- `500` if an unexpected server or database error occurs

#### DELETE /authors/:id
Purpose: Delete an author who has no books.

Success:
- Status code: `204`
- Response body: none

Errors:
- `404` if no author exists with that id
- `409` if books still reference the author
- `500` if an unexpected server or database error occurs

### Swagger Documentation
Swagger must document every author route.

### Deployment Expectations
After implementation, all author routes must work locally and in the deployed
Render application, and the deployed `/api-docs` page must support testing.

# Specification Review

The Version 1 specifications were reviewed with AI before implementation.
The review identified the following issues and the Version 2 decisions:

1. **Bugs and short-sighted decisions:** Checking for a duplicate id before
   inserting is not sufficient under concurrent requests. Unique MongoDB
   indexes enforce uniqueness. A book create/update and an author delete can
   also race, so the relationship-changing writes must use transactions that
   contend on the author document. Legacy books need a staged migration rather
   than simply changing the response schema.
2. **Security:** Validate types, lengths, dates, and allowed fields; do not
   pass arbitrary client objects into database queries or return MongoDB
   internals. Limit JSON body size, return safe error messages, and keep
   credentials in environment variables. This course API deliberately has no
   authentication or rate limiting: public write routes are not suitable for
   production without those protections.
3. **Efficiency:** Index author and book ids and `books.authorId`, especially
   for the author-deletion check. The assignment requires list routes to
   return all documents; pagination is deferred and would be needed for large
   collections.
4. **Unclear behavior:** Define complete response shapes, empty lists,
   validation, immutable ids, error messages, malformed JSON, body limits,
   duplicate ids, the `409` deletion conflict, and how existing documents
   become compatible with the new model.

# Books API Week 02 Spec - Version 2

## Shared Conventions

- Both collections use unique, case-sensitive custom string `id` values.
  An id must be 1-64 characters, start with an ASCII letter or digit, and
  contain only ASCII letters, digits, underscores, and hyphens.
- API response objects contain only the documented fields. MongoDB `_id` and
  internal relationship bookkeeping are never returned.
- Request bodies must be JSON objects with exactly the fields specified for
  the operation. Reject missing, extra, or incorrectly typed fields. Trim
  `name` and `title`, then require 1-200 characters. A `birthYear` must be an
  integer from 1 through 2100. A `publicationDate` must be a real calendar date
  in `YYYY-MM-DD` form with a year from 0001 through 9999.
- Invalid bodies return `400` and `{"message":"Invalid request body"}`.
  Malformed JSON returns `400` and `{"message":"Invalid JSON"}`. JSON bodies
  larger than 16 KB return `413` and `{"message":"Request body too large"}`.
- Unexpected server or database errors are logged on the server and return
  `500` and `{"message":"Internal server error"}`; never expose raw errors.
- List responses are arrays, including `[]` for an empty collection, with no
  promised ordering. `204` responses have no body. Ids cannot be changed by
  `PUT`; all update fields are required.
- Check request-body validity before querying for an update target. For a
  valid book update, return `404` for a missing book before checking the
  submitted author.
- MongoDB has unique indexes on `authors.id` and `books.id`, and an index on
  `books.authorId`. The MongoDB deployment must support transactions. Book
  create/update and author deletion coordinate through a write to the author
  document, so concurrent operations cannot create an orphaned reference.
- All routes are documented in OpenAPI and testable from `/api-docs` locally
  and on Render. No authentication is required for this coursework; do not
  use this publicly writable API for sensitive or production data.

## Feature 1: Book CRUD Operations and Author References

### Data Model and Relationship

The `books` collection stores:

```json
{
  "id": "b1",
  "authorId": "a1",
  "title": "Patterns of Light",
  "publicationDate": "2021-08-17"
}
```

All four fields are required strings. `authorId` follows the id rules above
and must match an existing author `id`. MongoDB `_id` and the old `author`
name are not included in API responses. The migration below removes the old
name from existing documents after deployment.

### Routes

| Route | Request body | Success | Other responses |
| --- | --- | --- | --- |
| `GET /books` | None | `200`, array of book objects | `500` |
| `GET /books/:id` | None | `200`, book object | `404`, `500` |
| `POST /books` | `id`, `authorId`, `title`, `publicationDate` | `201`, created book object | `400`, `413`, `500` |
| `PUT /books/:id` | `authorId`, `title`, `publicationDate` | `200`, updated book object | `400`, `404`, `413`, `500` |
| `DELETE /books/:id` | None | `204`, no body | `404`, `500` |

Example create request:

```json
{"id":"b4","authorId":"a1","title":"Example Book Title","publicationDate":"2026-01-15"}
```

Example update request:

```json
{"authorId":"a2","title":"Updated Book Title","publicationDate":"2026-02-20"}
```

`400` uses the shared invalid-body response, or
`{"message":"Book id already exists"}` for a duplicate create id, or
`{"message":"Author not found"}` when the submitted author does not exist.
`404` returns `{"message":"Book not found"}`. `413` and `500` use the shared
responses.

## Feature 2: Author CRUD Operations

### Data Model and Relationship

The `authors` collection stores these required fields:

```json
{"id":"a1","name":"Maya Rivera","birthYear":1980}
```

`id` and `name` are strings; `birthYear` is an integer. A book's `authorId`
references this custom `id`. An author with one or more referencing books
cannot be deleted: return `409` until the books are deleted or reassigned.

### Routes

| Route | Request body | Success | Other responses |
| --- | --- | --- | --- |
| `GET /authors` | None | `200`, array of author objects | `500` |
| `GET /authors/:id` | None | `200`, author object | `404`, `500` |
| `POST /authors` | `id`, `name`, `birthYear` | `201`, created author object | `400`, `413`, `500` |
| `PUT /authors/:id` | `name`, `birthYear` | `200`, updated author object | `400`, `404`, `413`, `500` |
| `DELETE /authors/:id` | None | `204`, no body | `404`, `409`, `500` |

Example create request:

```json
{"id":"a4","name":"Example Author","birthYear":1980}
```

Example update request:

```json
{"name":"Updated Author","birthYear":1981}
```

`400` uses the shared invalid-body response, or
`{"message":"Author id already exists"}` for a duplicate create id. `404`
returns `{"message":"Author not found"}`. `409` returns
`{"message":"Author has books"}`. `413` and `500` use the shared responses.

## Migration and Deployment

1. Deploy the author API first. Create at least three authors for the three
   existing fictional book authors. The seed birth years are illustrative,
   not verified biographical facts: `a1` Maya Rivera (1980), `a2` Jordan Lee
   (1975), and `a3` Ellis Chen (1985).
2. Inspect existing data and back it up before migration. Match each legacy
   `books.author` name to exactly one author's `name`; stop rather than guess
   if a name is missing, ambiguous, or conflicts with an existing
   `authorId`. Add `authorId` first while retaining `author`, so the Week 01
   deployment can continue to read the books.
3. Deploy the book API. Verify the migrated references and both APIs, then
   remove the legacy `author` fields. The migration must be explicit,
   repeatable, and support a dry run before making changes.
4. Regenerate and commit Swagger, run the tests and linter, and exercise every
   route from local and deployed Swagger. Never commit database credentials.
