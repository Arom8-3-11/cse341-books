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

## Migrate existing books

Back up the `books` and `authors` collections outside the repository before
making changes. The migration is intended for this small coursework dataset;
it requires a transaction-capable MongoDB deployment. It validates every
book and author, rejects duplicate ids and ambiguous or conflicting author
matches, and leaves unrelated document fields intact. It matches legacy
`books.author` values to author names exactly, including case. Pause other
author and book writes while running each migration phase.

With the author API deployed and the three authors created, inspect the
proposed changes, then add references while retaining the legacy author names:

```powershell
npm run migrate:week02 -- --add-author-ids
npm run migrate:week02 -- --add-author-ids --apply
```

The first command is read-only. The second applies all changes in a MongoDB
transaction. Both commands can be repeated safely. If validation fails, fix
the data rather than guessing a match.

Deploy the book API only after the additive migration succeeds. Verify the
new `/books` responses and both sets of routes in deployed Swagger. Once the
new API is serving the references, inspect and remove the legacy names:

```powershell
npm run migrate:week02 -- --remove-author-names
npm run migrate:week02 -- --remove-author-names --apply
```

The cleanup also validates all references and is safe to repeat. Do not run
it while the old Week 01 book API is still serving traffic.
