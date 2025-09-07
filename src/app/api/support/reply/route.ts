import { adminDb } from '@/lib/firebase-admin';
import { noStoreHeaders } from '@/lib/http/cache';
import { handleCors } from '@/lib/http/cors';
import { getLogger } from '@/lib/logging/app-logger';
import { withAdmin } from '@/lib/middleware/with-admin';
import * as admin from 'firebase-admin';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const replySchema = z.object({
    messageId: z.string().min(1),
    subject: z.string().min(3),
    reply: z.string().min(5),
});

function getTransport() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
        return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    }
    return {
        sendMail: async (opts: unknown) => {
            const details = (opts as nodemailer.SendMailOptions | undefined) ?? undefined;
            getLogger('support-reply').warn('email.send.fallback', { to: details?.to, subject: details?.subject });
            return { messageId: `dev-fallback-${Date.now()}` };
        },
    } as unknown as nodemailer.Transporter;
}

export const POST = withAdmin(async (req: NextRequest) => {
    const cors = handleCors(req, { allowMethods: ['POST', 'OPTIONS'] });
    if ('preflight' in cors) return cors.preflight as Response as unknown as NextResponse;
    try {
        const body = await req.json();
        const parsed = replySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { message: "Invalid input", errors: parsed.error.flatten() },
                { status: 400, headers: { ...noStoreHeaders(), ...cors.headers } }
            );
        }

        const { messageId, subject, reply } = parsed.data;
        const docRef = adminDb.collection("supportMessages").doc(messageId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return NextResponse.json(
                { message: "Message not found" },
                { status: 404, headers: { ...noStoreHeaders(), ...cors.headers } }
            );
        }
        type SupportMessageData = { email?: string } | undefined;
        const data = docSnap.data() as SupportMessageData;
        const toEmail = data?.email;
        const from = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER || "no-reply@rankpilot.com";

        const transporter = getTransport();
        const info = await transporter.sendMail({
            from: `RankPilot Support <${from}>`,
            to: toEmail,
            subject,
            text: reply,
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: rgb(17,17,17); white-space: pre-wrap">${reply}</div>`,
        });

        const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

        await docRef.update({
            emailStatus: 'replied',
            lastReplyAt: serverTimestamp(),
            lastReplySubject: subject,
            lastReplyMessageId: info.messageId,
            updatedAt: serverTimestamp(),
        });

        await docRef.collection('replies').add({
            subject,
            body: reply,
            messageId: info.messageId,
            createdAt: serverTimestamp(),
        });

        return NextResponse.json(
            { success: true, id: info.messageId },
            { headers: { ...noStoreHeaders(), ...cors.headers } }
        );
    } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        getLogger('support-reply').error('reply.error', { error: errMessage });
        return NextResponse.json(
            { message: errMessage || "Internal error" },
            { status: 500, headers: { ...noStoreHeaders(), ...cors.headers } }
        );
    }
}, { path: 'support/reply', extraHeaders: (req) => ({ ...handleCors(req, { allowMethods: ['POST', 'OPTIONS'] }).headers, ...noStoreHeaders() }), unauthorizedMessage: 'Unauthorized', forbiddenMessage: 'Forbidden' });

export async function OPTIONS(req: NextRequest): Promise<Response> {
    const cors = handleCors(req, { allowMethods: ['POST', 'OPTIONS'] });
    return 'preflight' in cors ? (cors.preflight as Response) : new Response(null, { status: 204, headers: cors.headers });
}
