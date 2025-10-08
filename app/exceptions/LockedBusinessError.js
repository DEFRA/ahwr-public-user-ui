export class LockedBusinessError extends Error {
  constructor(message) {
    super(message);
    this.name = "LockedBusinessError";
  }
}
