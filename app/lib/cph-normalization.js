export const normalizeCphNumber = (cphNumber) => {
  if (!cphNumber) {
    return cphNumber;
  }

  const trimmed = cphNumber.replaceAll(/\s/g, "");

  const regexWithDelimiter = /^(\d{2})(\D)(\d{3})\2(\d{4})$/;
  const match = trimmed.match(regexWithDelimiter);

  if (match) {
    const normalized = trimmed.replace(regexWithDelimiter, "$1/$3/$4");
    return normalized;
  }

  const regexJustNumbers = /^(\d{2})(\d{3})(\d{4})$/;
  const justNumbers = trimmed.match(regexJustNumbers);
  if (justNumbers) {
    return trimmed.replace(regexJustNumbers, "$1/$2/$3");
  }

  return cphNumber;
};
