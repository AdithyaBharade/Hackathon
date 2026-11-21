/**
 * Client for the WhatsApp provider. The real provider (and our stand-in) can fail
 * with 5xx, rate-limit with 429, or hang. Every send carries an idempotency key
 * (the certificate id), so a retry after a timeout - where the first attempt may
 * actually have gone through - does not put a second message on the phone.
 */
import { env } from "../config/env.js";

export interface WhatsAppMessage {
  to: string; // 10-digit Indian mobile
  idempotencyKey: string;
  templateName: "certificate_issued";
  params: { name: string; course: string; certificateNumber: string; downloadUrl: string };
}

export class WhatsAppError extends Error {
  constructor(message: string, public retryable: boolean) {
    super(message);
  }
}

export async function sendWhatsApp(msg: WhatsAppMessage): Promise<{ messageId: string }> {
  let res: Response;
  try {
    res = await fetch(`${env.WHATSAPP_API_URL}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": msg.idempotencyKey },
      body: JSON.stringify({ to: `+91${msg.to}`, template: msg.templateName, params: msg.params }),
      signal: AbortSignal.timeout(env.WHATSAPP_TIMEOUT_MS),
    });
  } catch (err) {
    const timeout = (err as Error).name === "TimeoutError";
    throw new WhatsAppError(timeout ? `Provider timed out after ${env.WHATSAPP_TIMEOUT_MS}ms` : `Provider unreachable: ${(err as Error).message}`, true);
  }
  if (res.ok) {
    const body = (await res.json()) as { id: string };
    return { messageId: body.id };
  }
  // 4xx (except 429) means the request itself is wrong - retrying won't help
  const retryable = res.status === 429 || res.status >= 500;
  throw new WhatsAppError(`Provider responded ${res.status}`, retryable);
}
