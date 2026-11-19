import type { InputHTMLAttributes } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";

type NativeProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "placeholder" | "inputMode" | "autoComplete" | "maxLength" | "autoCapitalize" | "disabled"
>;

interface FormInputProps<T extends FieldValues> extends NativeProps {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
}

/**
 * RHF-connected shadcn input with label + inline error. Spread INPUT_HINTS.<field> for ID/phone fields.
 * type="password" automatically renders PasswordInput (eye toggle).
 */
export function FormInput<T extends FieldValues>({ control, name, label, description, type = "text", ...inputProps }: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          {type === "password" ? (
            // Password fields always get the show/hide eye toggle
            <PasswordInput id={name} aria-invalid={fieldState.invalid} {...inputProps} {...field} value={field.value ?? ""} />
          ) : (
            <Input id={name} type={type} aria-invalid={fieldState.invalid} {...inputProps} {...field} value={field.value ?? ""} />
          )}
          {description && !fieldState.invalid && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
