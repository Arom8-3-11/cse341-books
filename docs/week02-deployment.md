# Week 02 API Development and Deployment

The API is public and does not authenticate write requests. It is intended for
coursework, not sensitive or production data.

## Local setup and verification

Use Node.js 22.9 or later and configure `.env` using `.env.example`. The MongoDB
deployment must support transactions, and the database user must be able to
create indexes. Do not commit credentials.

```powershell
npm run swagger
npm test
npm run lint
npm run dev
```

Open `http://127.0.0.1:3000/api-docs/` and exercise the author routes. The
automated tests use the configured `MONGODB_URI` to create a randomly named,
isolated `cse341_w02_test_*` database and drop that database afterward. They do
not use the application database; an interrupted run may leave a test database
that an administrator can remove after confirming its name.

## Initial authors

After deploying the author API, create these illustrative authors through
Swagger or the API. Their birth years are made-up seed values, not verified
biographical information.

```json
{"id":"a1","name":"Maya Rivera","birthYear":1980}
{"id":"a2","name":"Jordan Lee","birthYear":1975}
{"id":"a3","name":"Ellis Chen","birthYear":1985}
```

The existing books still use author names until the book feature and its
staged migration are deployed. Do not remove those names before the new book
API is serving the migrated references.
