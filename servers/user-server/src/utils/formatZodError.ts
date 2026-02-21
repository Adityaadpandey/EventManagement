import { ZodError } from "zod";

export function formatZodError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }
  return [{ field: "unknown", message: "Invalid error type" }];
}
