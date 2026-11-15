import { startTransition, type FormEvent } from "react";

/**
 * Submits to a useActionState dispatch without React 19's automatic form reset,
 * so what the user typed survives a validation error.
 */
export function keepValuesOnSubmit(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}

/** A text field from submitted FormData; "" when it's missing or a file. */
export function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
