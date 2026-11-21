/**
 * Parses a centre's spreadsheet (CSV or XLSX) into validated candidate rows.
 * Never partially succeeds: returns either every row valid, or every problem found.
 */
import { parse as parseCsv } from "csv-parse/sync";
import { readSheet } from "read-excel-file/node";
import { z } from "zod";
import { mobile, personName } from "../validators/fields.js";

export const GRADES = ["A+", "A", "B+", "B", "C", "PASS"] as const;

/** Accepted header spellings → canonical field. */
const HEADER_ALIASES: Record<string, keyof RawRow> = {
  name: "name",
  candidatename: "name",
  fullname: "name",
  mobile: "mobile",
  mobilenumber: "mobile",
  phone: "mobile",
  whatsapp: "mobile",
  dob: "dateOfBirth",
  dateofbirth: "dateOfBirth",
  grade: "grade",
  result: "grade",
};
const REQUIRED: (keyof RawRow)[] = ["name", "mobile", "dateOfBirth", "grade"];

interface RawRow {
  name: unknown;
  mobile: unknown;
  dateOfBirth: unknown;
  grade: unknown;
}

export interface RowError {
  row: number; // 1-based spreadsheet row, header is row 1
  field: string | null;
  message: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Two-digit years, as Excel writes them when it re-saves a CSV ("01/01/01"):
 *  up to this year's two digits means 20xx, anything later means 19xx. */
const expandYear = (yy: number) => (yy <= new Date().getFullYear() % 100 ? 2000 + yy : 1900 + yy);

/**
 * Accepts a real Date (XLSX), YYYY-MM-DD, or day-first DD/MM/YYYY, DD-MM-YYYY,
 * DD.MM.YYYY and the 2-digit-year forms (how Indian sheets and Excel write them).
 */
const toDate = (v: unknown): Date | null => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/)))
    [d, mo, y] = [Number(m[1]), Number(m[2]), m[3]!.length === 2 ? expandYear(Number(m[3])) : Number(m[3])];
  else return null;
  const date = new Date(`${y}-${pad(mo)}-${pad(d)}T00:00:00Z`);
  // Reject roll-overs like 31/02/2004
  return date.getUTCDate() === d && date.getUTCMonth() + 1 === mo ? date : null;
};

const ageOn = (dob: Date, now = new Date()) => {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
};

export const candidateRowSchema = z.object({
  name: personName("Name"),
  mobile: mobile(),
  dateOfBirth: z
    .unknown()
    .transform((v, c) => {
      const d = toDate(v);
      if (!d) {
        c.addIssue({ code: "custom", message: "Date of birth must be a valid date, e.g. 15/06/2002" });
        return z.NEVER;
      }
      return d;
    })
    .refine((d) => ageOn(d) >= 14 && ageOn(d) <= 80, "Candidate must be between 14 and 80 years old"),
  grade: z
    .string({ error: "Grade is required" })
    .trim()
    .toUpperCase()
    .pipe(z.enum(GRADES, { error: `Grade must be one of ${GRADES.join(", ")}` })),
});

export type CandidateRow = z.infer<typeof candidateRowSchema> & { rowNumber: number };

const normaliseHeader = (h: unknown) => String(h ?? "").toLowerCase().replace(/[^a-z]/g, "");

async function readRows(buffer: Buffer, filename: string): Promise<unknown[][]> {
  if (/\.xlsx$/i.test(filename)) return (await readSheet(buffer)) as unknown[][];
  return parseCsv(buffer, { bom: true, skip_empty_lines: true, relax_column_count: true, trim: true }) as unknown[][];
}

export type ParseResult = { ok: true; rows: CandidateRow[] } | { ok: false; errors: RowError[] };

export async function parseCandidateSheet(buffer: Buffer, filename: string, maxRows: number): Promise<ParseResult> {
  let table: unknown[][];
  try {
    table = await readRows(buffer, filename);
  } catch {
    return { ok: false, errors: [{ row: 0, field: null, message: "The file could not be read. Upload a CSV or XLSX file." }] };
  }

  const [header, ...body] = table;
  if (!header) return { ok: false, errors: [{ row: 0, field: null, message: "The file is empty" }] };

  const columnOf: Partial<Record<keyof RawRow, number>> = {};
  header.forEach((h, i) => {
    const field = HEADER_ALIASES[normaliseHeader(h)];
    if (field && columnOf[field] === undefined) columnOf[field] = i;
  });
  const missing = REQUIRED.filter((f) => columnOf[f] === undefined);
  if (missing.length)
    return {
      ok: false,
      errors: [{ row: 1, field: null, message: `Missing column(s): ${missing.join(", ")}. Expected: name, mobile, date_of_birth, grade` }],
    };

  const dataRows = body
    .map((cells, i) => ({ cells, rowNumber: i + 2 }))
    .filter(({ cells }) => cells.some((c) => String(c ?? "").trim() !== ""));
  if (dataRows.length === 0) return { ok: false, errors: [{ row: 0, field: null, message: "The file has no candidate rows" }] };
  if (dataRows.length > maxRows)
    return { ok: false, errors: [{ row: 0, field: null, message: `A batch can have at most ${maxRows} candidates` }] };

  const errors: RowError[] = [];
  const rows: CandidateRow[] = [];
  const firstRowForMobile = new Map<string, number>();

  for (const { cells, rowNumber } of dataRows) {
    const raw: RawRow = {
      name: cells[columnOf.name!] ?? "",
      mobile: String(cells[columnOf.mobile!] ?? ""),
      dateOfBirth: cells[columnOf.dateOfBirth!] ?? "",
      grade: String(cells[columnOf.grade!] ?? ""),
    };
    const parsed = candidateRowSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        errors.push({ row: rowNumber, field: String(issue.path[0] ?? ""), message: issue.message });
      continue;
    }
    const seenAt = firstRowForMobile.get(parsed.data.mobile);
    if (seenAt) {
      errors.push({ row: rowNumber, field: "mobile", message: `Same mobile number as row ${seenAt}` });
      continue;
    }
    firstRowForMobile.set(parsed.data.mobile, rowNumber);
    rows.push({ ...parsed.data, rowNumber });
  }

  return errors.length ? { ok: false, errors } : { ok: true, rows };
}
