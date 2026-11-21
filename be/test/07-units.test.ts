/** Pure rules: workflow transitions, spreadsheet parsing, masking. */
import { describe, expect, it } from "vitest";
import { isBigBatch, requiredApprovals, stageOf, statusAfterApproval } from "../src/domain/workflow.js";
import { parseCandidateSheet } from "../src/lib/spreadsheet.js";
import { maskName } from "../src/services/certificate.service.js";

describe("workflow rules", () => {
  it("routes batches through the right stages", () => {
    expect(stageOf("PENDING_DISTRICT")).toBe("DISTRICT");
    expect(stageOf("APPROVED")).toBeNull();
    expect(requiredApprovals("DISTRICT")).toBe(2);
    expect(requiredApprovals("STATE")).toBe(1);
    expect(isBigBatch(50)).toBe(false);
    expect(isBigBatch(51)).toBe(true);
    expect(statusAfterApproval("DISTRICT", 10)).toBe("PENDING_STATE");
    expect(statusAfterApproval("DISTRICT", 60)).toBe("PENDING_QUALITY");
    expect(statusAfterApproval("QUALITY", 60)).toBe("PENDING_STATE");
    expect(statusAfterApproval("STATE", 60)).toBe("APPROVED");
  });
});

describe("spreadsheet parsing", () => {
  const csv = (s: string) => parseCandidateSheet(Buffer.from(s), "x.csv", 100);

  it("normalises headers, mobiles, dates and grades", async () => {
    const r = await csv("Candidate Name, WhatsApp ,DOB,Result\nAsha  Patil,+91 98765-43210,2002-07-15,a+\n");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows[0]).toMatchObject({ name: "Asha Patil", mobile: "9876543210", grade: "A+", rowNumber: 2 });
  });

  it("accepts the 2-digit years Excel writes when it re-saves a CSV", async () => {
    const r = await csv("Name,Mobile,Date of Birth,Grade\nAsha Patil,9876543210,01/01/01,A\nRavi Kumar,9876543211,5.3.98,B\n");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows[0]!.dateOfBirth.toISOString().slice(0, 10)).toBe("2001-01-01");
      expect(r.rows[1]!.dateOfBirth.toISOString().slice(0, 10)).toBe("1998-03-05");
    }
  });

  it("rejects impossible dates and implausible ages", async () => {
    const r = await csv("name,mobile,dob,grade\nAsha Patil,9876543210,30/02/2002,A\nRavi Kumar,9876543211,01/01/2024,A\n");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.row)).toEqual([2, 3]);
  });

  it("caps the number of rows", async () => {
    const rows = Array.from({ length: 101 }, (_, i) => `Asha Patil,${9000000000 + i},01/01/2000,A`).join("\n");
    const r = await csv(`name,mobile,dob,grade\n${rows}\n`);
    expect(r.ok).toBe(false);
  });

  it("masks names for public display", () => {
    expect(maskName("Anika Rao")).toBe("An*** Ra*");
  });
});
