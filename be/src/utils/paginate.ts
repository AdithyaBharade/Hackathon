export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const toSkipTake = (page: number, limit: number) => ({ skip: (page - 1) * limit, take: limit });

export const paginated = <T>(items: T[], total: number, page: number, limit: number): Paginated<T> => ({
  items,
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
