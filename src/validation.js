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

export { hasExactFields, isValidId, normalizeText, parseAuthor };
