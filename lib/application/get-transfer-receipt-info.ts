/**
 * Server-only: dado el id de un documento `paymentReceipt`, retorna la URL
 * del asset en el CDN de Sanity y el mime type. La URL tiene UUID no
 * adivinable; sólo debe exponerse desde páginas autenticadas (panel admin).
 *
 * Si el documento o el asset fueron borrados de Sanity, retorna null.
 */
import { sanityFetch } from "@/lib/sanity/client";

export interface TransferReceiptInfo {
  url: string;
  mimeType: string;
  uploadedAt: string | null;
}

const QUERY = `*[_type == "paymentReceipt" && _id == $id][0]{
  uploadedAt,
  "url": asset.asset->url,
  "mimeType": asset.asset->mimeType
}`;

export async function getTransferReceiptInfo(receiptDocId: string): Promise<TransferReceiptInfo | null> {
  if (!receiptDocId) return null;
  const result = await sanityFetch<{ url?: string | null; mimeType?: string | null; uploadedAt?: string | null }>(
    QUERY,
    { id: receiptDocId },
    { revalidate: 0 }, // sin caché, siempre fresco para admin
  );
  if (!result || !result.url) return null;
  return {
    url: result.url,
    mimeType: result.mimeType ?? "application/octet-stream",
    uploadedAt: result.uploadedAt ?? null,
  };
}
