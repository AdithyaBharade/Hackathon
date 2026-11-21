import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { batchesService, type BatchListParams } from "./batches.service";
import { queryKeys } from "@/services/api/query-keys";

export const useBatches = (params: BatchListParams) =>
  useQuery({ queryKey: queryKeys.batches.list(params), queryFn: () => batchesService.list(params), placeholderData: keepPreviousData });

export const useBatchSummary = () => useQuery({ queryKey: queryKeys.batches.summary, queryFn: batchesService.summary });

export const useStuckBatches = (enabled: boolean) =>
  useQuery({ queryKey: queryKeys.batches.stuck, queryFn: batchesService.stuck, enabled });

export const useBatch = (id: string) => useQuery({ queryKey: queryKeys.batches.detail(id), queryFn: () => batchesService.get(id) });

export const useBatchTimeline = (id: string) =>
  useQuery({ queryKey: queryKeys.batches.timeline(id), queryFn: () => batchesService.timeline(id) });

export const useNotifications = () => useQuery({ queryKey: queryKeys.notifications, queryFn: batchesService.notifications });

const useInvalidateBatches = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.batches.all });
};

export const useCreateBatch = () => {
  const invalidate = useInvalidateBatches();
  return useMutation({ mutationFn: batchesService.create, meta: { successMessage: "Batch created" }, onSuccess: invalidate });
};

/** Row errors are shown inline by the upload card, so no generic error toast. */
export const useUploadCandidates = () => {
  const invalidate = useInvalidateBatches();
  return useMutation({ mutationFn: batchesService.upload, meta: { successMessage: "Candidates uploaded", silentError: true }, onSuccess: invalidate });
};

export const useSubmitBatch = () => {
  const invalidate = useInvalidateBatches();
  return useMutation({ mutationFn: batchesService.submit, meta: { successMessage: "Sent for approval" }, onSuccess: invalidate });
};

export const useDecide = () => {
  const invalidate = useInvalidateBatches();
  return useMutation({ mutationFn: batchesService.decide, meta: { successMessage: "Decision recorded" }, onSettled: invalidate });
};

export const useRetract = () => {
  const invalidate = useInvalidateBatches();
  return useMutation({ mutationFn: batchesService.retract, meta: { successMessage: "Your decision was withdrawn" }, onSettled: invalidate });
};
