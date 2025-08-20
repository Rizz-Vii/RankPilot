import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getLogger } from '@/lib/logging/app-logger';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

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

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json();
        const parsed = replySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
        }

        const { messageId, subject, reply } = parsed.data;
        const docRef = adminDb.collection("supportMessages").doc(messageId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return NextResponse.json({ message: "Message not found" }, { status: 404 });
        }
        const data = docSnap.data() as any;
        const toEmail = data?.email;
        const from = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER || "no-reply@rankpilot.com";

        const transporter = getTransport();
        const info = await transporter.sendMail({
            from: `RankPilot Support <${from}>`,
            to: toEmail,
            subject,
            text: reply,
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; white-space: pre-wrap">${reply}</div>`,
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

        return NextResponse.json({ success: true, id: info.messageId });
    } catch (err: unknown) {
        getLogger('support-reply').error('reply.error', { error: (err as any)?.message });
        return NextResponse.json({ message: (err as any)?.message || "Internal error" }, { status: 500 });
    }
}
