export class NoEligibleCphError extends Error {
  constructor(message) {
    super(message);
    this.name = "NoEligibleCphError";
  }
}
