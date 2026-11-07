const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const isValidId = (value) => {
  return typeof value === 'string' && idPattern.test(value);
};

const hasExactFields = (body, fields) => {
  return body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    Object.keys(body).length === fields.length &&
    fields.every((field) => {
      return Object.hasOwn(body, field);
    });
};

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const length = Array.from(trimmed).length;
  return length >= 1 && length <= 200 ? trimmed : null;
};

const parseAuthor = (body, includeId) => {
  const fields = includeId ? ['id', 'name', 'birthYear'] : ['name', 'birthYear'];
  if (!hasExactFields(body, fields)) {
    return null;
  }

  const name = normalizeText(body.name);
  if ((includeId && !isValidId(body.id)) ||
      name === null ||
      !Number.isInteger(body.birthYear) ||
      body.birthYear < 1 ||
      body.birthYear > 2100) {
    return null;
  }

  const author = { name, birthYear: body.birthYear };
  return includeId ? { id: body.id, ...author } : author;
};

const isValidDate = (value) => {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      value.startsWith('0000-')) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const parseBook = (body, includeId) => {
  const fields = includeId
    ? ['id', 'authorId', 'title', 'publicationDate']
    : ['authorId', 'title', 'publicationDate'];
  if (!hasExactFields(body, fields)) {
    return null;
  }

  const title = normalizeText(body.title);
  if ((includeId && !isValidId(body.id)) ||
      !isValidId(body.authorId) ||
      title === null ||
      !isValidDate(body.publicationDate)) {
    return null;
  }

  const book = { authorId: body.authorId, title, publicationDate: body.publicationDate };
  return includeId ? { id: body.id, ...book } : book;
};

export { isValidId, parseAuthor, parseBook };
