export const parseCspDirectives = (csp) => {
  const directives = {};

  for (const directive of (csp ?? "").split(";")) {
    const [name, ...sources] = directive.trim().split(/\s+/);

    if (name) {
      directives[name] = sources;
    }
  }

  return directives;
};
