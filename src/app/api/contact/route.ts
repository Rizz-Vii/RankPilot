import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getLogger } from '@/lib/logging/app-logger';
import nodemailer from "nodemailer";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

const contactSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    subject: z.string().min(5),
    message: z.string().min(10),
    category: z.string().min(1),
});

function getTransport() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for other ports
            auth: { user, pass },
        });
    }

    // Development fallback: log emails to console
    return {
        sendMail: async (opts: any) => {
            getLogger('contact').warn('email.send.fallback', { to: opts?.to, subject: opts?.subject });
            return { messageId: `dev-fallback-${Date.now()}` };
        },
    } as unknown as nodemailer.Transporter;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = contactSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { message: "Invalid input", errors: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { name, email, subject, message, category } = parsed.data;

        // Persist initial message for tracking
        const headers = Object.fromEntries(req.headers);
        const ip = req.headers.get("x-forwarded-for") || headers["x-real-ip"] || "unknown";
        const userAgent = req.headers.get("user-agent") || "unknown";

        const docRef = await adminDb.collection("supportMessages").add({
            name,
            email,
            subject,
            message,
            category,
            status: "received",
            createdAt: (admin.firestore as any).FieldValue.serverTimestamp(),
            updatedAt: (admin.firestore as any).FieldValue.serverTimestamp(),
            meta: { ip, userAgent, source: "public-contact-form" },
        });

        const to = process.env.CONTACT_RECEIVER_EMAIL || "abba7254@gmail.com"; // requested recipient
        const from = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER || "no-reply@rankpilot.com";

        const transporter = getTransport();
        const info = await transporter.sendMail({
            from: `RankPilot Contact <${from}>`,
            to,
            replyTo: email,
            subject: `[Contact - ${category}] ${subject}`,
            text: `New contact message\n\nName: ${name}\nEmail: ${email}\nCategory: ${category}\nSubject: ${subject}\n\nMessage:\n${message}`,
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111">
          <h2>New Contact Message</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          <p style="white-space: pre-wrap">${message}</p>
        </div>
      `,
        });
        // Update Firestore with send status
        await adminDb.collection("supportMessages").doc(docRef.id).update({
            emailStatus: "sent",
            emailMessageId: info.messageId,
            updatedAt: (admin.firestore as any).FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, id: info.messageId, docId: docRef.id });
    } catch (err: unknown) {
        getLogger('contact').error('contact.error', { error: (err as any)?.message });
        try {
            // Best-effort: mark latest doc as failed if available from context (not tracked here)
            // No-op: Without docRef, we can't update; in a more advanced setup, we'd correlate by timestamp
        } catch { }
        return NextResponse.json({ message: (err as any)?.message || "Internal error" }, { status: 500 });
    }
}
