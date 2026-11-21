import { api } from "@/services/api/client";
import { ENDPOINTS } from "@/services/api/endpoints";
import type { ApiResponse, Paginated, PaginationParams } from "@/types/api";
import type { AuditEvent, BatchDetail, BatchStatus, BatchSummary, DecisionAction, Notification } from "@/types/batch";
import type { CreateBatchInput } from "@/schemas/batch.schema";

export type BatchListParams = PaginationParams & { status?: BatchStatus; inbox?: boolean };

export const batchesService = {
  list: async (params: BatchListParams) => (await api.get<ApiResponse<Paginated<BatchSummary>>>(ENDPOINTS.batches.root, { params })).data.data,
  summary: async () => (await api.get<ApiResponse<Partial<Record<BatchStatus, number>>>>(ENDPOINTS.batches.summary)).data.data,
  stuck: async () => (await api.get<ApiResponse<BatchSummary[]>>(ENDPOINTS.batches.stuck)).data.data,
  get: async (id: string) => (await api.get<ApiResponse<BatchDetail>>(ENDPOINTS.batches.byId(id))).data.data,
  timeline: async (id: string) => (await api.get<ApiResponse<AuditEvent[]>>(ENDPOINTS.batches.timeline(id))).data.data,
  create: async (body: CreateBatchInput) => (await api.post<ApiResponse<BatchSummary>>(ENDPOINTS.batches.root, body)).data.data,
  upload: async ({ id, file }: { id: string; file: File }) => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post<ApiResponse<BatchSummary>>(ENDPOINTS.batches.candidates(id), form, { headers: { "Content-Type": "multipart/form-data" } })).data.data;
  },
  submit: async (id: string) => (await api.post<ApiResponse<BatchSummary>>(ENDPOINTS.batches.submit(id))).data.data,
  decide: async ({ id, ...body }: { id: string; action: DecisionAction; reason?: string; version: number }) =>
    (await api.post<ApiResponse<{ status: BatchStatus; moved: boolean }>>(ENDPOINTS.batches.decisions(id), body)).data.data,
  retract: async (id: string) => (await api.post<ApiResponse<unknown>>(ENDPOINTS.batches.retract(id))).data.data,
  notifications: async () => (await api.get<ApiResponse<Notification[]>>(ENDPOINTS.notifications)).data.data,
};
