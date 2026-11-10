import { toast } from "sonner";
import { executeApi } from "@/lib/executeApi.js";

/** Error already shown to the learner — callers should not toast it again */
export class HandledUploadError extends Error {
  handled = true as const;
}

export function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

function getErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) return String((err as { code: unknown }).code);
  return null;
}

/** Login/session problems that a retry or page refresh can clear */
export function isAuthError(err: unknown): boolean {
  const text = `${getErrorCode(err) ?? ""} ${getErrorMessage(err)}`;
  return /authori[sz]ation|unauthori[sz]ed|unauthenticated|forbidden|\b401\b|\b403\b|token|session expired|not logged in/i.test(text);
}

function logFailure(viewerId: string, uploadType: string, itemKey: string, attempt: number, err: unknown) {
  // Fire-and-forget — logging must never block or break the upload flow
  executeApi("LogUploadFailure", {
    viewerId,
    uploadType,
    itemKey,
    attempt,
    errorCode: getErrorCode(err)?.slice(0, 100) ?? null,
    errorMessage: getErrorMessage(err).slice(0, 1000),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
  }).catch(() => {});
}

/**
 * Runs an upload. Every failure is logged. Login/session failures get one
 * automatic retry; if that also fails, the learner sees a Refresh button.
 */
export async function runUploadWithRetry<T>(
  upload: () => Promise<T>,
  ctx: { viewerId: string; uploadType: string; itemKey: string },
): Promise<T> {
  try {
    return await upload();
  } catch (firstErr) {
    logFailure(ctx.viewerId, ctx.uploadType, ctx.itemKey, 1, firstErr);
    if (!isAuthError(firstErr)) throw firstErr;

    await new Promise((r) => setTimeout(r, 1500));
    try {
      return await upload();
    } catch (secondErr) {
      logFailure(ctx.viewerId, ctx.uploadType, ctx.itemKey, 2, secondErr);
      if (!isAuthError(secondErr)) throw secondErr;

      toast.error("Your session expired. Refresh the page and upload again.", {
        duration: Infinity,
        action: { label: "Refresh", onClick: () => window.location.reload() },
      });
      throw new HandledUploadError(getErrorMessage(secondErr));
    }
  }
}
