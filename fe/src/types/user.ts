export type Role = "CENTRE" | "DISTRICT_OFFICER" | "QUALITY" | "STATE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  districtId: string | null;
  centreId: string | null;
  district: { id: string; name: string } | null;
  centre: { id: string; name: string; code: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_LABEL: Record<Role, string> = {
  CENTRE: "Training centre",
  DISTRICT_OFFICER: "District officer",
  QUALITY: "Quality team",
  STATE: "State office",
};
