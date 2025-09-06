import { getLogger } from '../logging/app-logger';

const logger = getLogger('voice.agent-runner');

export type VoiceEvent = { type?: string } & Record<string, unknown>;
export async function handleInboundEvent(event: VoiceEvent) {
    logger.info('handleInboundEvent', { type: event?.type });
    // Example event handling
    if (event.type === 'media_start') {
        // initialize session state
        return { ok: true };
    }

    if (event.type === 'utterance') {
        // TODO: call STT/LLM and drive tools
        return { ok: true };
    }

    return { ok: true };
}
