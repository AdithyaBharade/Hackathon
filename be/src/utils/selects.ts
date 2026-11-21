/** Never return password hashes. */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  districtId: true,
  centreId: true,
  district: { select: { id: true, name: true } },
  centre: { select: { id: true, name: true, code: true } },
  createdAt: true,
  updatedAt: true,
} as const;
