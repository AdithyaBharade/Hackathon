// AUTO-GENERATED from be/src/validators/fields.ts. Do not edit; run `npm run sync:validators`.
/**
 * Shared field validators (zod v4) for Indian identity, contact and finance fields.
 *
 * SOURCE OF TRUTH: be/src/validators/fields.ts
 * The frontend copy (fe/src/schemas/fields.ts) is generated. Do not edit it.
 * After changing this file run:  cd fe && npm run sync:validators
 *
 * Each validator trims and cleans the input (spaces, dashes, case, +91 prefix)
 * before checking, and returns the normalised value, ready to store.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Remove spaces, dashes and dots that users type for readability. */
const stripSeparators = (v: string) => v.replace(/[\s\-.]/g, "");

/** A trimmed string, cleaned with `clean`, then checked against `regex`. */
const cleaned = (clean: (v: string) => string, regex: RegExp, message: string, requiredMsg: string) =>
  z
    .string({ error: requiredMsg })
    .trim()
    .min(1, requiredMsg)
    .transform(clean)
    .pipe(z.string().regex(regex, message));

/**
 * Make any field optional for forms: empty string / null become `undefined`.
 * Usage: `alternateMobile: optional(mobile())`
 */
export const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

// ---------------------------------------------------------------------------
// Checksums
// ---------------------------------------------------------------------------

// Verhoeff tables (used by UIDAI for the Aadhaar check digit)
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export const isValidVerhoeff = (num: string) => {
  let c = 0;
  const digits = num.split("").reverse().map(Number);
  for (let i = 0; i < digits.length; i++) c = VERHOEFF_D[c]![VERHOEFF_P[i % 8]![digits[i]!]!]!;
  return c === 0;
};

/** GSTIN check digit (15th char): weighted base-36 sum of the first 14 chars. */
export const isValidGstinChecksum = (gstin: string) => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = chars.indexOf(gstin[i]!) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return chars[(36 - (sum % 36)) % 36] === gstin[14];
};

// ---------------------------------------------------------------------------
// Personal
// ---------------------------------------------------------------------------

/** Person's name: letters (any language), spaces, . ' - ; 2-100 chars. */
export const personName = (label = "Name") =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .min(2, `${label} must be at least 2 characters`)
    .max(100, `${label} must be at most 100 characters`)
    .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u, `${label} can contain only letters, spaces, . ' -`)
    .transform((v) => v.replace(/\s+/g, " "));

/** Email: trimmed + lowercased, max 254 chars. */
export const email = () =>
  z
    .string({ error: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .max(254, "Email is too long")
    .toLowerCase()
    .pipe(z.email("Enter a valid email address"));

/**
 * Indian mobile number. Accepts "98765 43210", "+91-9876543210", "09876543210".
 * Stored as the 10-digit number (starts with 6-9).
 */
export const mobile = () =>
  cleaned(
    (v) => stripSeparators(v).replace(/^(\+91|91|0)(?=\d{10}$)/, ""),
    /^[6-9]\d{9}$/,
    "Enter a valid 10-digit mobile number starting with 6-9",
    "Mobile number is required"
  );

/** Password: 8-72 chars (bcrypt limit) with upper, lower, number and special character. */
export const password = () =>
  z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/\d/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

/** Numeric OTP of the given length (default 6). */
export const otp = (length = 6) =>
  z
    .string({ error: "OTP is required" })
    .trim()
    .regex(new RegExp(`^\\d{${length}}$`), `Enter the ${length}-digit OTP`);

/** Date of birth (ISO "YYYY-MM-DD" or Date), not in the future, age between minAge and 120. */
export const dateOfBirth = (minAge = 18) =>
  z.coerce
    .date({ error: "Enter a valid date of birth" })
    .refine((d) => d <= new Date(), "Date of birth cannot be in the future")
    .refine((d) => {
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
      return age >= minAge && age <= 120;
    }, `You must be at least ${minAge} years old`);

/** Indian PIN code: 6 digits, cannot start with 0. */
export const pincode = () =>
  cleaned(stripSeparators, /^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code", "PIN code is required");

// ---------------------------------------------------------------------------
// Government IDs
// ---------------------------------------------------------------------------

/**
 * Aadhaar: 12 digits, first digit 2-9, valid Verhoeff check digit.
 * Accepts "2341 2341 2346". Stored as 12 digits.
 * Sensitive: never log it, and show it masked (maskAadhaar).
 */
export const aadhaar = () =>
  cleaned(stripSeparators, /^[2-9]\d{11}$/, "Aadhaar must be 12 digits and cannot start with 0 or 1", "Aadhaar number is required")
    .refine(isValidVerhoeff, "Enter a valid Aadhaar number");

/**
 * PAN: AAAAA9999A. 4th letter is the holder type
 * (P person, C company, H HUF, F firm, A AOP, T trust, B BOI, L local authority, J juridical, G government).
 * Stored uppercase.
 */
export const pan = () =>
  cleaned(
    (v) => stripSeparators(v).toUpperCase(),
    /^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$/,
    "Enter a valid PAN (e.g. ABCPE1234F)",
    "PAN is required"
  );

/** Individual PAN only (4th character must be P). */
export const personalPan = () => pan().refine((v) => v[3] === "P", "PAN must belong to an individual (4th letter P)");

/** Voter ID (EPIC): 3 letters + 7 digits. */
export const voterId = () =>
  cleaned((v) => stripSeparators(v).toUpperCase(), /^[A-Z]{3}\d{7}$/, "Enter a valid Voter ID (e.g. ABC1234567)", "Voter ID is required");

/** Indian passport: letter (not Q/X/Z) + 7 digits, first and last digit non-zero. */
export const passport = () =>
  cleaned(
    (v) => stripSeparators(v).toUpperCase(),
    /^[A-PR-WY][1-9]\d{5}[1-9]$/,
    "Enter a valid passport number (e.g. A1234567)",
    "Passport number is required"
  );

/** Driving licence: state(2 letters) + RTO(2 digits) + year(4) + 7 digits, e.g. "TS09 20110012345". */
export const drivingLicence = () =>
  cleaned(
    (v) => stripSeparators(v).toUpperCase(),
    /^[A-Z]{2}\d{2}(19|20)\d{2}\d{7}$/,
    "Enter a valid driving licence number (e.g. TS0920110012345)",
    "Driving licence number is required"
  ).refine((v) => Number(v.slice(4, 8)) <= new Date().getFullYear(), "Driving licence issue year is invalid");

/** Vehicle registration: "TS09AB1234" / "DL3CAF1234" or Bharat series "22BH1234AA". */
export const vehicleNumber = () =>
  cleaned(
    (v) => stripSeparators(v).toUpperCase(),
    /^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/,
    "Enter a valid vehicle number (e.g. TS09AB1234)",
    "Vehicle number is required"
  );

// ---------------------------------------------------------------------------
// Business & banking
// ---------------------------------------------------------------------------

/** GSTIN: 2-digit state code + PAN + entity number + Z + check digit (verified). */
export const gstin = () =>
  cleaned(
    (v) => stripSeparators(v).toUpperCase(),
    /^(0[1-9]|[1-3]\d|97|99)[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    "Enter a valid 15-character GSTIN",
    "GSTIN is required"
  ).refine(isValidGstinChecksum, "GSTIN check digit is invalid");

/** IFSC: 4 letters (bank) + 0 + 6 alphanumerics (branch). */
export const ifsc = () =>
  cleaned((v) => stripSeparators(v).toUpperCase(), /^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC (e.g. SBIN0001234)", "IFSC is required");

/** Bank account number: 9-18 digits. */
export const bankAccount = () =>
  cleaned(stripSeparators, /^\d{9,18}$/, "Account number must be 9-18 digits", "Account number is required");

/** UPI ID / VPA: name@bank. */
export const upiId = () =>
  z
    .string({ error: "UPI ID is required" })
    .trim()
    .min(1, "UPI ID is required")
    .toLowerCase()
    .regex(/^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9]{1,63}$/, "Enter a valid UPI ID (e.g. name@okaxis)");

// ---------------------------------------------------------------------------
// Generic
// ---------------------------------------------------------------------------

/** Required text with a label-based message. */
export const requiredText = (label: string, max = 255) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

/** http(s) URL only. */
export const httpUrl = (label = "URL") =>
  z.url({ protocol: /^https?$/, error: `Enter a valid ${label} starting with http:// or https://` });

// ---------------------------------------------------------------------------
// Masking (for display and logs; never show full IDs)
// ---------------------------------------------------------------------------

export const maskAadhaar = (v: string) => `XXXX XXXX ${v.slice(-4)}`;
export const maskPan = (v: string) => `${v.slice(0, 2)}XXXXX${v.slice(-3)}`;
export const maskMobile = (v: string) => `XXXXXX${v.slice(-4)}`;
export const maskAccount = (v: string) => `${"X".repeat(Math.max(0, v.length - 4))}${v.slice(-4)}`;
export const maskEmail = (v: string) => {
  const [user = "", domain = ""] = v.split("@");
  return `${user.slice(0, 2)}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
};
