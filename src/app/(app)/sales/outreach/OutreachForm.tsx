"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { buildOutboundPayload } from './_client/payload';

type OutboundPayload = {
    phone?: string;
    phones?: string[];
    pitch?: string;
    schedule: string; // ISO
    serviceId?: string;
    voice?: string;
    language?: string;
    rate?: number;
    from?: string;
    recordingUrl?: string;
    repeat?: 'daily' | 'weekly';
    interactive?: boolean;
};

type OutboundResultItem = {
    callSid?: string;
    to?: string;
    from?: string;
    callStatus?: string;
};

type OutboundResponse = {
    results?: OutboundResultItem[];
    callSid?: string;
    from?: string;
    callStatus?: string;
    apptId?: string;
};

type CallLive = {
    id: string;
    to?: string;
    status?: string;
    lastEventAt?: number | string | null;
    recording?: { url?: string | null; sid?: string | null } | null;
};

function toMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    try { return JSON.stringify(e); } catch { return String(e); }
}

export function OutreachForm() {
    const { user } = useAuth();
    const AUTO_VALUE = "__auto__"; // non-empty sentinel for "Auto" option in Select
    const [phonesText, setPhonesText] = useState("");
    const [pitch, setPitch] = useState("Quick check-in about your RankPilot SEO campaign.");
    // Helpers for local datetime formatting for <input type="datetime-local">
    const toLocalDatetimeValue = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    const [schedule, setSchedule] = useState(() => toLocalDatetimeValue(new Date(Date.now() + 60_000)));
    const [voice, setVoice] = useState<string>("alice");
    const [language, setLanguage] = useState<string>("en-US");
    const [rate, setRate] = useState<number>(1);
    const [fromNum, setFromNum] = useState<string>("");
    const [fromOptions, setFromOptions] = useState<string[]>([]);
    const [defaultFrom, setDefaultFrom] = useState<string>("");
    const [recordingUrl, setRecordingUrl] = useState<string>("");
    const [audioSource, setAudioSource] = useState<'tts' | 'upload' | 'record'>("tts");
    const [recordingType, setRecordingType] = useState<string>("");
    const [optimizeRecording, setOptimizeRecording] = useState<boolean>(true);
    const [useRecordingOnly, setUseRecordingOnly] = useState<boolean>(true);
    const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');
    const [interactive, setInteractive] = useState<boolean>(false);
    const [listenAllowed, setListenAllowed] = useState(true);
    // Recording state
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<OutboundResponse | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    // Live Firestore call status
    const [liveCalls, setLiveCalls] = useState<Record<string, CallLive>>({});
    const callUnsubsRef = useRef<Record<string, Unsubscribe>>({});
    // Load allowed from numbers
    useEffect(() => {
        let active = true;
        void (async () => {
            try {
                const res = await fetch("/api/voice/from-numbers");
                if (!res.ok) return;
                const j = await res.json();
                const allowed: string[] = Array.isArray(j?.allowed) ? j.allowed : [];
                const def: string = typeof j?.defaultFrom === 'string' ? j.defaultFrom : '';
                if (!active) return;
                setFromOptions(allowed);
                setDefaultFrom(def);
                setFromNum(""); // empty = let server pick default
            } catch { /* ignore */ }
        })();
        return () => { active = false; };
    }, []);

    // Removed dev-only polling in favor of Firestore onSnapshot per-callSid

    const phones = useMemo(() => {
        return phonesText
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
    }, [phonesText]);
    const recipientsCount = phones.length;
    const invalidPhones = useMemo(() => {
        const e164 = /^\+\d{8,15}$/;
        return phones.filter(p => !e164.test(p));
    }, [phones]);

    const languages = useMemo(() => [
        'en-US', 'en-GB', 'en-AU', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'hi-IN', 'zh-CN'
    ], []);

    // Derive light user context for templating
    const userFirst = useMemo(() => {
        const dn = (user && typeof user === 'object' ? (user as { displayName?: unknown }).displayName : undefined) as string | undefined;
        if (dn) return String(dn).split(' ')[0] || 'there';
        const email = (user && typeof user === 'object' ? (user as { email?: unknown }).email : undefined) as string | undefined;
        const local = email?.split('@')[0];
        return (local && local.length <= 20) ? local : 'there';
    }, [user]);
    const brandName = useMemo(() => {
        const email = (user && typeof user === 'object' ? (user as { email?: unknown }).email : undefined) as string | undefined;
        const domain = email?.split('@')[1] || '';
        const core = domain.replace(/^www\./, '').split('.')[0] || 'RankPilot';
        return core.charAt(0).toUpperCase() + core.slice(1);
    }, [user]);
    const scriptTemplates = useMemo(() => {
        const commonCTA = 'If now is not ideal, feel free to reply with a better time.';
        return [
            {
                key: 'intro',
                label: 'Intro outreach',
                text: `Hi, this is ${userFirst} from ${brandName}. Quick idea to lift your search visibility in the next few weeks. Open to a 10-minute chat to see if it fits? ${commonCTA}`,
            },
            {
                key: 'followup',
                label: 'Demo follow-up',
                text: `Thanks again for the time earlier. This is ${userFirst} from ${brandName}. I put together next steps to reach your traffic targets—should we lock a quick review? ${commonCTA}`,
            },
            {
                key: 'voicemail',
                label: 'Voicemail-style',
                text: `Sorry I missed you—${userFirst} with ${brandName}. I had a quick recommendation to improve rankings on a few core pages. I’ll send a note—reply with a good time to connect.`,
            },
            {
                key: 'renewal',
                label: 'Renewal check-in',
                text: `Hi, ${userFirst} from ${brandName}. Checking in ahead of renewal to confirm priorities and surface quick wins we can deliver this month. Do you have 10 minutes this week?`,
            },
            {
                key: 'event',
                label: 'Event follow-up',
                text: `Good to connect recently—${userFirst} with ${brandName}. I noted a few SEO plays relevant to your stack. Shall we do a quick run-through and tailor them to your pipeline?`,
            },
        ];
    }, [userFirst, brandName]);

    // Subscribe to Firestore call doc for real-time updates
    const subscribeCall = useCallback((callSid: string) => {
        if (!callSid || callUnsubsRef.current[callSid]) return;
        if (!listenAllowed) return;
        const ref = doc(db, 'voice_calls', callSid);
        const unsub = onSnapshot(ref, (snap) => {
            const raw = (snap.data() ?? {}) as Record<string, unknown>;
            const entry: CallLive = {
                id: snap.id,
                to: typeof raw.to === 'string' ? raw.to : undefined,
                status: typeof raw.status === 'string' ? raw.status : undefined,
                lastEventAt:
                    typeof raw.lastEventAt === 'number' || typeof raw.lastEventAt === 'string'
                        ? (raw.lastEventAt as number | string)
                        : null,
                recording: raw && typeof raw === 'object' && 'recording' in raw && typeof (raw as { recording?: unknown }).recording !== 'undefined'
                    ? ((raw as { recording?: { url?: string | null; sid?: string | null } | null }).recording ?? null)
                    : null,
            };
            setLiveCalls((prev) => ({ ...prev, [callSid]: entry }));
        }, (err) => {
            // Gracefully degrade if Firestore security rules block listen in dev
            console.warn('voice_calls onSnapshot error:', err);
            setListenAllowed(false);
        });
        callUnsubsRef.current[callSid] = unsub;
    }, [listenAllowed]);

    // Cleanup subscriptions on unmount
    useEffect(() => {
        return () => { Object.values(callUnsubsRef.current).forEach((u) => { try { u(); } catch { } }); callUnsubsRef.current = {}; };
    }, []);

    const submit = useCallback(async () => {
        setBusy(true);
        setError("");
        setResult(null);
        try {
            // Preflight validation
            if (!recipientsCount) {
                setError('Please add at least one recipient.');
                setBusy(false);
                return;
            }
            if (invalidPhones.length) {
                setError(`Fix ${invalidPhones.length} invalid phone ${invalidPhones.length === 1 ? 'number' : 'numbers'} (E.164 like +15551234567). For example: ${invalidPhones[0]}`);
                setBusy(false);
                return;
            }
            const now = Date.now();
            const when = new Date(schedule).getTime();
            if (!Number.isFinite(when) || when < now - 30_000) {
                const fixed = toLocalDatetimeValue(new Date(now + 60_000));
                setSchedule(fixed);
                toast.message('Schedule adjusted', { description: 'Time was in the past. Set to 1 minute from now.' });
                setBusy(false);
                return;
            }
            const hasRecording = !!recordingUrl?.trim();
            const hasScript = !!pitch?.trim();
            const hasGreeting = hasRecording || hasScript;
            if (!hasGreeting) {
                setError('Add a script or a recording before sending.');
                setBusy(false);
                return;
            }
            const payload = buildOutboundPayload({
                scheduleLocal: schedule,
                pitch,
                useRecordingOnly,
                voice,
                language,
                rate,
                fromNum,
                phones,
                recordingUrl,
                repeat,
                interactive,
            }) as OutboundPayload;
            const res = await fetch("/api/voice/outbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const data = (await res.json()) as OutboundResponse;
            setResult(data);
            // Subscribe to live updates for each callSid
            const arr: OutboundResultItem[] = Array.isArray(data?.results)
                ? data.results
                : data?.callSid
                    ? [{ callSid: data.callSid, to: payload.phone, from: data.from, callStatus: data.callStatus }]
                    : [];
            for (const item of arr) {
                if (item?.callSid) subscribeCall(String(item.callSid));
            }
            if (!arr.length) {
                // Scheduled calls won't have callSids yet; provide a toast
                toast.message('Call scheduled', { description: 'We queued your call for the selected time. Live updates will appear once it starts.' });
            }
        } catch (e: unknown) {
            setError(toMessage(e));
        } finally {
            setBusy(false);
        }
    }, [schedule, pitch, useRecordingOnly, voice, language, rate, fromNum, phones, recordingUrl, repeat, interactive, subscribeCall, recipientsCount, invalidPhones]);

    // Persist key preferences for streamlined return visits
    useEffect(() => {
        try {
            const saved = localStorage.getItem('rp_outreach_prefs');
            if (saved) {
                const j = JSON.parse(saved) as Partial<{ voice: string; language: string; rate: number; interactive: boolean; repeat: 'none' | 'daily' | 'weekly'; }>;
                if (j.voice) setVoice(j.voice);
                if (j.language) setLanguage(j.language);
                if (typeof j.rate === 'number') setRate(j.rate);
                if (typeof j.interactive === 'boolean') setInteractive(j.interactive);
                if (j.repeat) setRepeat(j.repeat);
            }
        } catch { /* ignore */ }
    }, []);
    useEffect(() => {
        try {
            const j = { voice, language, rate, interactive, repeat };
            localStorage.setItem('rp_outreach_prefs', JSON.stringify(j));
        } catch { /* ignore */ }
    }, [voice, language, rate, interactive, repeat]);

    // Align audio source with recording usage for clarity
    useEffect(() => {
        if (audioSource === 'tts') setUseRecordingOnly(false);
        else setUseRecordingOnly(true);
    }, [audioSource]);
    useEffect(() => {
        if (recordingUrl?.trim()) {
            // If a manual URL is entered, reflect that in the UI selection and precedence
            if (audioSource !== 'upload') setAudioSource('upload');
            setUseRecordingOnly(true);
        }
    }, [recordingUrl, audioSource]);

    // Audio processing: normalize, resample, and encode WAV
    async function processToWav(blob: Blob, opts: { normalize: boolean; sampleRate: number; }): Promise<Blob> {
        const arrayBuf = await blob.arrayBuffer();
        const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
        if (!AC) throw new Error('AudioContext not supported');
        const ctx = new AC();
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
        const channels = 1; // mono
        const length = Math.ceil(decoded.duration * opts.sampleRate);
        const offline = new OfflineAudioContext(channels, length, opts.sampleRate);
        const source = offline.createBufferSource();
        source.buffer = decoded;
        let node: AudioNode = source;
        if (opts.normalize) {
            // compute peak
            let peak = 0;
            for (let c = 0; c < decoded.numberOfChannels; c++) {
                const data = decoded.getChannelData(c);
                for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i]); if (v > peak) peak = v; }
            }
            const gain = offline.createGain();
            gain.gain.value = peak > 0 ? Math.min(1 / peak, 3) : 1;
            node.connect(gain);
            node = gain;
        }
        node.connect(offline.destination);
        source.start();
        const rendered = await offline.startRendering();
        // Encode WAV 16-bit PCM
        function floatTo16BitPCM(input: Float32Array) {
            const output = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            return output;
        }
        function writeString(view: DataView, offset: number, str: string) { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); }
        const channelData = rendered.getChannelData(0);
        const pcm16 = floatTo16BitPCM(channelData);
        const buffer = new ArrayBuffer(44 + pcm16.length * 2);
        const view = new DataView(buffer);
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + pcm16.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // mono
        view.setUint32(24, opts.sampleRate, true);
        view.setUint32(28, opts.sampleRate * 2, true); // byte rate
        view.setUint16(32, 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        writeString(view, 36, 'data');
        view.setUint32(40, pcm16.length * 2, true);
        // PCM data
        new Int16Array(buffer, 44).set(pcm16);
        return new Blob([buffer], { type: 'audio/wav' });
    }

    async function uploadAudioBlob(blob: Blob, ext = 'wav'): Promise<string> {
        // Route through server API to bypass CORS and use admin credentials
        setUploading(true);
        try {
            const form = new FormData();
            const fileName = `${Date.now()}.${ext}`;
            form.append('file', blob, fileName);
            form.append('filename', fileName);
            form.append('contentType', blob.type || `audio/${ext}`);
            const token = await user?.getIdToken?.();
            const res = await fetch('/api/voice/upload', {
                method: 'POST',
                headers: token ? { authorization: `Bearer ${token}` } : undefined,
                body: form,
            });
            if (!res.ok) throw new Error(`upload_failed_${res.status}`);
            const json = await res.json();
            const url = (json?.url as string) || '';
            if (!url) throw new Error('upload_no_url');
            return url;
        } finally {
            setUploading(false);
        }
    }

    async function handleFileSelected(file: File) {
        try {
            const processed = optimizeRecording ? await processToWav(file, { normalize: true, sampleRate: 16000 }) : file;
            const derivedExt = processed.type.includes('wav') ? 'wav' : 'bin';
            const url = await uploadAudioBlob(processed, derivedExt);
            setRecordingUrl(url);
            setRecordingType(processed.type || `audio/${derivedExt}`);
            setAudioSource('upload');
            setUseRecordingOnly(true);
            toast.success('Audio uploaded', { description: `${derivedExt.toUpperCase()} | ${url.split('/').pop()}` });
        } catch (e: unknown) { setError(toMessage(e) || 'Failed to process/upload recording'); }
    }

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            const mr = new MediaRecorder(stream);
            chunksRef.current = [];
            mr.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = async () => {
                try {
                    const raw = new Blob(chunksRef.current, { type: 'audio/webm' });
                    const processed = optimizeRecording ? await processToWav(raw, { normalize: true, sampleRate: 16000 }) : raw;
                    const derivedExt = processed.type.includes('wav') ? 'wav' : 'webm';
                    const url = await uploadAudioBlob(processed, derivedExt);
                    setRecordingUrl(url);
                    setRecordingType(processed.type || `audio/${derivedExt}`);
                    setAudioSource('record');
                    setUseRecordingOnly(true);
                    toast.success('Recording saved', { description: `${derivedExt.toUpperCase()} | ${url.split('/').pop()}` });
                } catch (e: unknown) { setError(toMessage(e) || 'Recording upload failed'); }
            };
            mediaRecorderRef.current = mr;
            mr.start();
            setIsRecording(true);
        } catch (e: unknown) { setError(toMessage(e) || 'Microphone permission denied'); }
    }
    function stopRecording() {
        try {
            mediaRecorderRef.current?.stop();
            mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        } finally { setIsRecording(false); }
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label className="mb-1 block">Recipients (one per line or comma-separated)</Label>
                    <Textarea data-testid="outreach-recipients" className="h-28" placeholder={"+15551234567\n+15557654321"} value={phonesText} onChange={(e) => setPhonesText(e.target.value)} />
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">Use international E.164 format (e.g. +15551234567). One per line is okay.</p>
                        <p className="text-[11px] text-muted-foreground">{recipientsCount} selected</p>
                    </div>
                </div>
                <div>
                    <Label className="mb-1 block">Outreach Script</Label>
                    <Textarea data-testid="outreach-script" className="h-28" value={pitch} onChange={(e) => setPitch(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Spoken as a short greeting at call start. Keep it concise and clear.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground">Insert sample:</Label>
                        {scriptTemplates.map(t => (
                            <Button key={t.key} type="button" size="sm" variant="outline" onClick={() => setPitch(t.text)}>
                                {t.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label className="mb-1 block">Schedule (local)</Label>
                    <Input data-testid="outreach-schedule" type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">{Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {[
                            { label: 'in 15 min', addMs: 15 * 60_000 },
                            { label: 'in 1 hour', addMs: 60 * 60_000 },
                            { label: 'tomorrow', addMs: 24 * 60 * 60_000 },
                            { label: 'in 1 week', addMs: 7 * 24 * 60 * 60_000 },
                        ].map((opt) => (
                            <Button key={opt.label} type="button" size="sm" variant="outline" onClick={() => setSchedule(toLocalDatetimeValue(new Date(Date.now() + opt.addMs)))}>
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                    <div className="mt-2">
                        <Label className="mb-1 block text-[11px]">Quick pick (dropdown)</Label>
                        <Select onValueChange={(v) => {
                            const m = new Map([
                                ['15m', 15 * 60_000],
                                ['1h', 60 * 60_000],
                                ['1d', 24 * 60 * 60_000],
                                ['1w', 7 * 24 * 60 * 60_000],
                            ]);
                            const add = m.get(v as '15m' | '1h' | '1d' | '1w');
                            if (add) setSchedule(toLocalDatetimeValue(new Date(Date.now() + add)));
                        }}>
                            <SelectTrigger><SelectValue placeholder="Pick…" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15m">in 15 minutes</SelectItem>
                                <SelectItem value="1h">in 1 hour</SelectItem>
                                <SelectItem value="1d">tomorrow</SelectItem>
                                <SelectItem value="1w">in 1 week</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="mt-3">
                        <Label className="mb-1 block text-[11px]">Repeat</Label>
                        <Select value={repeat} onValueChange={(v) => setRepeat((v as 'none' | 'daily' | 'weekly') || 'none')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="daily">Every day</SelectItem>
                                <SelectItem value="weekly">Every week</SelectItem>
                            </SelectContent>
                        </Select>
                        {repeat !== 'none' && (
                            <p className="text-[11px] text-muted-foreground mt-1">Recurring scheduling is queued; first call will be placed at the selected time.</p>
                        )}
                    </div>
                </div>
                <div>
                    <Label className="mb-1 block">From</Label>
                    {fromOptions.length > 0 ? (
                        <Select value={fromNum || AUTO_VALUE} onValueChange={(v) => setFromNum(v === AUTO_VALUE ? "" : v)}>
                            <SelectTrigger><SelectValue placeholder={`Auto (default ${defaultFrom || 'Twilio'})`} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={AUTO_VALUE}>Auto (default {defaultFrom || 'Twilio'})</SelectItem>
                                {fromOptions.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input type="tel" placeholder="+15551234567" value={fromNum} onChange={(e) => setFromNum(e.target.value)} />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Caller ID must be configured and allowed.</p>
                </div>
                {/* Recording URL moved into Advanced audio section for aligned options */}
            </div>

            {/* Advanced options are collapsed by default to streamline setup */}
            <details className="rounded-md border p-3 bg-background/50">
                <summary className="cursor-pointer select-none text-sm font-medium">Advanced call options</summary>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label className="mb-1 block">Voice</Label>
                        <Select value={voice} onValueChange={(v) => setVoice(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="alice">alice</SelectItem>
                                <SelectItem value="woman">woman</SelectItem>
                                <SelectItem value="man">man</SelectItem>
                                <SelectItem value="Polly.Joanna">Polly.Joanna</SelectItem>
                                <SelectItem value="Polly.Matthew">Polly.Matthew</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="mb-1 block">Language</Label>
                        <Select value={language} onValueChange={(v) => setLanguage(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {languages.map(l => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="mb-1 block">Speed</Label>
                        <Slider min={0.5} max={2} step={0.1} value={[rate]} onValueChange={(vals) => setRate(vals[0] ?? 1)} />
                        <div className="text-xs text-muted-foreground mt-1">{rate.toFixed(1)}x voice speed</div>
                    </div>
                </div>

                {/* Audio Source Selection */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label className="mb-1 block">Audio Source</Label>
                        <Select value={audioSource} onValueChange={(v) => setAudioSource(v as 'tts' | 'upload' | 'record')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tts">Text-to-Speech (Script)</SelectItem>
                                <SelectItem value="upload">Upload Audio</SelectItem>
                                <SelectItem value="record">Record Voice</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground mt-1">Tip: Upload or record to use a custom voice for the opening message.</p>
                        <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Checkbox id="useRecordingOnly" checked={useRecordingOnly} onCheckedChange={(v) => setUseRecordingOnly(Boolean(v))} />
                                <Label htmlFor="useRecordingOnly" className="text-xs">Use recording only (ignore script)</Label>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Checkbox id="optimizeRecording" checked={optimizeRecording} onCheckedChange={(v) => setOptimizeRecording(Boolean(v))} />
                                <Label htmlFor="optimizeRecording" className="text-xs">Optimize recording (normalize volume)</Label>
                            </div>
                        </div>
                    </div>
                    {audioSource === 'upload' && (
                        <div>
                            <Label className="mb-1 block">Upload Audio</Label>
                            <Input type="file" accept="audio/*" onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void handleFileSelected(f); }} />
                            {(uploading || recordingUrl) && (
                                <p className="text-xs text-muted-foreground mt-1 break-all">
                                    {uploading ? 'Uploading…' : (
                                        <>
                                            Uploaded: {recordingUrl} {recordingType && <span className="ml-2 text-[10px] px-1 py-0.5 rounded bg-muted-foreground/10">{recordingType}</span>}
                                        </>
                                    )}
                                </p>
                            )}
                            {!uploading && recordingUrl && (
                                <audio className="mt-2 w-full" controls src={recordingUrl} />
                            )}
                        </div>
                    )}
                    {audioSource === 'record' && (
                        <div>
                            <Label className="mb-1 block">Record Voice</Label>
                            <div className="flex items-center gap-2">
                                {!isRecording ? (
                                    <Button type="button" variant="outline" onClick={() => void startRecording()}>Start</Button>
                                ) : (
                                    <Button type="button" variant="destructive" onClick={stopRecording}>Stop</Button>
                                )}
                            </div>
                            {recordingUrl && (
                                <p className="text-xs text-muted-foreground mt-1 break-all">
                                    Recorded: {recordingUrl} {recordingType && <span className="ml-2 text-[10px] px-1 py-0.5 rounded bg-muted-foreground/10">{recordingType}</span>}
                                </p>
                            )}
                            {recordingUrl && (
                                <audio className="mt-2 w-full" controls src={recordingUrl} />
                            )}
                        </div>
                    )}
                    <div>
                        <Label className="mb-1 block">Manual Recording URL (optional)</Label>
                        <Input data-testid="outreach-recording-url" type="url" placeholder="https://.../message.mp3" value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} />
                        <p className="text-xs text-muted-foreground mt-1">If provided, this audio plays instead of the script (takes precedence).</p>
                    </div>
                </div>
            </details>

            <div className="flex items-center gap-2">
                <Checkbox id="interactive" data-testid="outreach-interactive" checked={interactive} onCheckedChange={(v) => setInteractive(Boolean(v))} />
                <Label htmlFor="interactive" className="text-sm">Enable interactive prompt (collect keypad/speech after greeting)</Label>
            </div>
            {interactive && (
                <p className="text-[11px] text-muted-foreground -mt-2 mb-2">Calls will use a brief Gather prompt to capture a response before continuing.</p>
            )}

            <div className="flex gap-3">
                <Button data-testid="outreach-submit" disabled={busy} onClick={() => void submit()}>{busy ? "Sending..." : "Send Calls"}</Button>
            </div>

            {error ? <div className="text-red-600 text-sm" aria-live="polite">{error}</div> : null}

            {result ? (
                <div className="mt-4">
                    <h3 className="font-medium mb-2">Results</h3>
                    <div className="grid gap-2 md:grid-cols-2">
                        {Array.isArray(result.results) && result.results.length ? (
                            result.results.map((r, i) => (
                                <div key={i} className="rounded-md border p-3 text-xs">
                                    <div className="font-medium">{r.to || 'Recipient'}</div>
                                    <div className="text-muted-foreground mt-1">From {r.from || '—'} · Status {r.callStatus || '—'}</div>
                                    {r.callSid && (
                                        <div className="mt-1"><span className="text-muted-foreground">Call SID:</span> {r.callSid}</div>
                                    )}
                                </div>
                            ))
                        ) : (
                                <div className="rounded-md border p-3 text-xs">No call results returned.</div>
                        )}
                    </div>
                </div>
            ) : null}

            {!!Object.keys(liveCalls).length && (
                <div className="mt-4">
                    <h3 className="font-medium mb-2">Live Call Status</h3>
                    <div className="text-xs bg-muted p-3 rounded-md overflow-auto">
                        {(Object.values(liveCalls) as CallLive[]).map((c) => (
                            <div key={c.id} className="border-b border-border/50 py-1">
                                <div><span className="font-medium">{c.to}</span> — {c.status || 'unknown'}</div>
                                {c.lastEventAt && (<div className="text-muted-foreground">Updated {new Date(c.lastEventAt).toLocaleString()}</div>)}
                                {(() => {
                                    type WithGather = CallLive & { gather?: { digits?: string; speechResult?: string } };
                                    const gc = c as WithGather;
                                    const resp = gc?.gather?.digits || gc?.gather?.speechResult;
                                    return resp ? (
                                        <div className="text-muted-foreground">Response: {String(resp)}</div>
                                    ) : null;
                                })()}
                                {(() => {
                                    const rec = c.recording as { url?: string | null } | null | undefined;
                                    return rec?.url ? (
                                        <audio className="mt-1 w-full" controls src={String(rec.url)} />
                                    ) : null;
                                })()}
                            </div>
                        ))}
                    </div>
                    {!listenAllowed && (
                        <div className="text-[11px] text-muted-foreground mt-2">Listening disabled in dev (security rules). Status will not live-update.</div>
                    )}
                </div>
            )}

            {/* Dev-only polling view removed: Firestore onSnapshot provides live status above */}
        </div>
    );
}
