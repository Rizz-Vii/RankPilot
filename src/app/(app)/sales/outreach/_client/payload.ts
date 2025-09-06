export type OutboundPayload = {
    phone?: string;
    phones?: string[];
    pitch?: string;
    script?: string;
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

export function buildOutboundPayload(input: {
    scheduleLocal: string; // datetime-local string
    pitch: string;
    useRecordingOnly: boolean;
    voice: string;
    language: string;
    rate: number;
    fromNum: string;
    phones: string[];
    recordingUrl?: string;
    repeat?: 'none' | 'daily' | 'weekly';
    interactive?: boolean;
}): OutboundPayload {
    const scheduleIso = new Date(input.scheduleLocal).toISOString();
    const payload: OutboundPayload = {
        schedule: scheduleIso,
        // Back-compat: keep pitch, but prefer script downstream
        pitch: input.useRecordingOnly ? '' : input.pitch,
        script: input.useRecordingOnly ? '' : input.pitch,
        voice: input.voice,
        language: input.language,
        rate: input.rate,
        interactive: Boolean(input.interactive),
    };
    if (input.fromNum) payload.from = input.fromNum;
    if (input.recordingUrl) payload.recordingUrl = input.recordingUrl;
    if (input.phones.length > 1) payload.phones = input.phones; else if (input.phones[0]) payload.phone = input.phones[0];
    if (input.repeat && input.repeat !== 'none') payload.repeat = input.repeat;
    return payload;
}
