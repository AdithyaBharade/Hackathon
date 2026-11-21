import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ENDPOINTS } from "@/services/api/endpoints";
import { queryKeys } from "@/services/api/query-keys";
import { notify } from "@/lib/notify";
import type { Role } from "@/types/user";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

/**
 * Server-Sent Events: the server says *what* changed, we refetch through the normal
 * (access-checked) API. EventSource is used directly because axios can't stream; it
 * sends the auth cookie and reconnects by itself.
 */
export function useLiveUpdates(role: Role | undefined) {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!role) return;
    const es = new EventSource(`${API_URL}${ENDPOINTS.events}`, { withCredentials: true });
    es.addEventListener("ready", () => setConnected(true));
    es.onerror = () => setConnected(false);
    es.addEventListener("change", (msg) => {
      const event = JSON.parse((msg as MessageEvent).data) as { type: string; batchId?: string };
      qc.invalidateQueries({ queryKey: queryKeys.batches.all });
      if (event.type.startsWith("CERTIFICATE")) qc.invalidateQueries({ queryKey: queryKeys.certificates.all });
      if (event.type === "BATCH_ESCALATED") {
        qc.invalidateQueries({ queryKey: queryKeys.notifications });
        if (role === "STATE") notify.info("A batch is stuck", "It has waited longer than the allowed time.");
      }
    });
    return () => {
      es.close();
      setConnected(false);
    };
  }, [role, qc]);

  return connected;
}
