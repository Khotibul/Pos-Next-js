export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, opts: { code: string; status: number }) {
    super(message);
    this.code = opts.code;
    this.status = opts.status;
  }
}

export function isAppError(err: unknown): err is AppError {
  return typeof err === "object" && err !== null && "code" in err && "status" in err;
}

export const Errors = {
  unauthorized: (message = "Unauthorized") => new AppError(message, { code: "UNAUTHORIZED", status: 401 }),
  forbidden: (message = "Forbidden") => new AppError(message, { code: "FORBIDDEN", status: 403 }),
  notFound: (message = "Not found") => new AppError(message, { code: "NOT_FOUND", status: 404 }),
  badRequest: (message = "Bad request") => new AppError(message, { code: "BAD_REQUEST", status: 400 }),
};

