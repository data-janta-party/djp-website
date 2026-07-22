export class DbUnavailableError extends Error {
  constructor(message = 'Database is not available') {
    super(message);
    this.name = 'DbUnavailableError';
  }
}