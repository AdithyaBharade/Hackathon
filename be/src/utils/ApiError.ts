export class ApiError extends Error {
  /** `errors` is returned to the client as-is (e.g. per-row spreadsheet problems). */
  constructor(public statusCode: number, message: string, public errors?: unknown[]) {
    super(message);
  }
}
