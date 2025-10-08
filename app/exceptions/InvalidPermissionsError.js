export class InvalidPermissionsError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidPermissionsError";
  }
}
