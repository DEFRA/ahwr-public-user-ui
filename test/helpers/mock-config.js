// Builds a convict-like stub ({ get, set, getProperties }) backed by a plain
// values object, so tests can mock the config/auth modules now that consumers
// read config via config.get('dotted.path') instead of property access.
export const asConvict = (values) => ({
  get: (path) => path.split(".").reduce((acc, key) => acc?.[key], values),
  set: (path, value) => {
    const keys = path.split(".");
    const last = keys.pop();
    const target = keys.reduce((acc, key) => {
      acc[key] = acc[key] ?? {};
      return acc[key];
    }, values);
    target[last] = value;
  },
  getProperties: () => values,
});
