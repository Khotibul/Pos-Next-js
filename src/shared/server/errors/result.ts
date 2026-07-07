export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function fail<E = string>(error: E, fieldErrors?: Record<string, string>): Result<never, E> {
  return { success: false, error, fieldErrors };
}

export function fieldErrorsFromZod(error: import("zod").ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFail(message: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}
