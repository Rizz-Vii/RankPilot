import { adminAuth, adminStorage } from "@/lib/firebase-admin";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}
function ok(data: unknown) {
  return NextResponse.json(data, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return bad(400, "expected_multipart");
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return bad(400, "missing_file");
    }
    const origName = (form.get("filename") as string) || "upload.wav";
    const ct =
      (form.get("contentType") as string) ||
      file.type ||
      "application/octet-stream";

    // Optional auth: if Authorization present, use uid; else anon
    let uid = "anon";
    const auth =
      req.headers.get("authorization") || req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      try {
        const token = auth.slice("Bearer ".length);
        const decoded = await adminAuth.verifyIdToken(token);
        if (decoded?.uid) uid = decoded.uid;
      } catch {
        /* ignore */
      }
    }

    const ext = (() => {
      const lower = origName.split(".").pop()?.toLowerCase() || "";
      if (lower) return lower;
      if (ct.includes("wav")) return "wav";
      if (ct.includes("webm")) return "webm";
      if (ct.includes("mp3")) return "mp3";
      return "bin";
    })();
    const key = `voice-recordings/${uid}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const bucket = adminStorage.bucket();
    const gcsFile = bucket.file(key);
    await gcsFile.save(buffer, {
      contentType: ct,
      resumable: false,
      metadata: { contentType: ct },
    });

    // Generate a signed URL for direct playback; fallback to gs:// URL on error
    let url = `gs://${bucket.name}/${key}`;
    try {
      const [signed] = await gcsFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      url = signed;
    } catch {
      /* non-fatal */
    }
    return ok({ ok: true, url, path: key, contentType: ct });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return bad(500, msg);
  }
}
