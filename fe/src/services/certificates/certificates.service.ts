import { api } from "@/services/api/client";
import { ENDPOINTS } from "@/services/api/endpoints";
import type { ApiResponse, Paginated, PaginationParams } from "@/types/api";
import type { CertificateRow, VerifyResult } from "@/types/batch";

export type CertificateListParams = PaginationParams & { batchId?: string; status?: "ISSUED" | "REVOKED" };

export const certificatesService = {
  list: async (params: CertificateListParams) =>
    (await api.get<ApiResponse<Paginated<CertificateRow>>>(ENDPOINTS.certificates.root, { params })).data.data,
  revoke: async ({ id, reason }: { id: string; reason: string }) => (await api.post<ApiResponse<unknown>>(ENDPOINTS.certificates.revoke(id), { reason })).data.data,
  resend: async (id: string) => (await api.post<ApiResponse<unknown>>(ENDPOINTS.certificates.resend(id))).data.data,
  verify: async (number: string) => (await api.get<ApiResponse<VerifyResult>>(ENDPOINTS.public.verify(number))).data.data,
};
