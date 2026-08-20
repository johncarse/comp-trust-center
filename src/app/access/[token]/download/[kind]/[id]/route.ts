import { NextRequest } from "next/server";
import {
  AccessDeniedError,
  DownloadKind,
  getSignedDownload,
} from "@/lib/trust-access";

export const dynamic = "force-dynamic";

const KINDS: DownloadKind[] = [
  "policy",
  "document",
  "framework",
  "custom-framework",
];

/**
 * Streams a gated file to the visitor.
 *
 * Comp mints S3 signed URLs against its configured endpoint, which in a
 * self-hosted install is typically a cluster-internal address the visitor's
 * browser cannot resolve. Redirecting the browser at the signed URL therefore
 * cannot work; we fetch it server-side and stream the bytes back instead.
 *
 * It is also the safer shape regardless of endpoint: the access token, the
 * signed URL and the storage hostname all stay server-side.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string; kind: string; id: string }> }
) {
  const { token, kind, id } = await context.params;

  if (!KINDS.includes(kind as DownloadKind)) {
    return new Response("Not found", { status: 404 });
  }

  let signedUrl: string;
  let fileName: string;

  try {
    ({ signedUrl, fileName } = await getSignedDownload(
      token,
      kind as DownloadKind,
      id
    ));
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }

  const upstream = await fetch(signedUrl, { cache: "no-store" });

  if (!upstream.ok || !upstream.body) {
    return new Response("The file could not be retrieved", { status: 502 });
  }

  // Quote-strip the filename: it comes from user-supplied document names and
  // would otherwise let a quote break out of the Content-Disposition value.
  const safeName = fileName.replaceAll('"', "");

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
