import type { InputHTMLAttributes } from "react";

type Hint = Pick<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "autoComplete" | "maxLength" | "placeholder" | "autoCapitalize">;

/**
 * Input attributes that match each validator in schemas/fields.ts:
 * the right mobile keyboard, autofill and a sensible max length (separators allowed).
 * Usage: <FormInput {...INPUT_HINTS.mobile} control={...} name="mobile" label="Mobile" />
 */
export const INPUT_HINTS = {
  name: { autoComplete: "name", maxLength: 100, placeholder: "Full name" },
  email: { type: "email", inputMode: "email", autoComplete: "email", maxLength: 254, placeholder: "name@example.com" },
  password: { type: "password", autoComplete: "current-password", maxLength: 72 },
  newPassword: { type: "password", autoComplete: "new-password", maxLength: 72 },
  mobile: { type: "tel", inputMode: "tel", autoComplete: "tel-national", maxLength: 16, placeholder: "98765 43210" },
  otp: { inputMode: "numeric", autoComplete: "one-time-code", maxLength: 6, placeholder: "123456" },
  pincode: { inputMode: "numeric", autoComplete: "postal-code", maxLength: 7, placeholder: "500081" },
  aadhaar: { inputMode: "numeric", autoComplete: "off", maxLength: 14, placeholder: "XXXX XXXX XXXX" },
  pan: { autoCapitalize: "characters", autoComplete: "off", maxLength: 10, placeholder: "ABCPE1234F" },
  gstin: { autoCapitalize: "characters", autoComplete: "off", maxLength: 15, placeholder: "27AAPFU0939F1ZV" },
  ifsc: { autoCapitalize: "characters", autoComplete: "off", maxLength: 11, placeholder: "SBIN0001234" },
  bankAccount: { inputMode: "numeric", autoComplete: "off", maxLength: 22, placeholder: "Account number" },
  upiId: { inputMode: "email", autoCapitalize: "none", autoComplete: "off", maxLength: 320, placeholder: "name@okaxis" },
  voterId: { autoCapitalize: "characters", autoComplete: "off", maxLength: 10, placeholder: "ABC1234567" },
  passport: { autoCapitalize: "characters", autoComplete: "off", maxLength: 9, placeholder: "A1234567" },
  drivingLicence: { autoCapitalize: "characters", autoComplete: "off", maxLength: 19, placeholder: "TS0920110012345" },
  vehicleNumber: { autoCapitalize: "characters", autoComplete: "off", maxLength: 13, placeholder: "TS09AB1234" },
} satisfies Record<string, Hint>;
