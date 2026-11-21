import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { certificatesService, type CertificateListParams } from "./certificates.service";
import { queryKeys } from "@/services/api/query-keys";

export const useCertificates = (params: CertificateListParams) =>
  useQuery({ queryKey: queryKeys.certificates.list(params), queryFn: () => certificatesService.list(params), placeholderData: keepPreviousData });

export const useVerify = (number: string) =>
  useQuery({ queryKey: queryKeys.verify(number), queryFn: () => certificatesService.verify(number), enabled: !!number, staleTime: 0, retry: false });

const useInvalidate = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.certificates.all });
    qc.invalidateQueries({ queryKey: queryKeys.batches.all });
  };
};

export const useRevokeCertificate = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: certificatesService.revoke, meta: { successMessage: "Certificate revoked" }, onSuccess: invalidate });
};

export const useResendCertificate = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: certificatesService.resend, meta: { successMessage: "Delivery re-queued" }, onSuccess: invalidate });
};
