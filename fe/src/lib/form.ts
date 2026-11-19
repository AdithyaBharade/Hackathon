import type { FieldErrors, FieldValues } from "react-hook-form";
import { notify } from "./notify";

/** Depth-first: first error message in a (possibly nested) RHF errors object. */
const firstMessage = (errors: FieldErrors): string | undefined => {
  for (const value of Object.values(errors)) {
    if (!value) continue;
    if (typeof value.message === "string" && value.message) return value.message;
    const nested = firstMessage(value as FieldErrors);
    if (nested) return nested;
  }
};

/**
 * Pass as the 2nd arg of handleSubmit so an invalid submit shows a toast
 * (fields are still highlighted inline):
 *   <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)}>
 */
export const onInvalidSubmit = <T extends FieldValues>(errors: FieldErrors<T>) => {
  const count = Object.keys(errors).length;
  notify.error(
    count > 1 ? `Please fix ${count} highlighted fields` : "Please fix the highlighted field",
    firstMessage(errors)
  );
};
