import type { ToolRunner } from '../../../types/brain';

export const ExampleEchoRunner: ToolRunner = {
    name: 'ExampleEchoRunner',
    supports: () => true,
    run: async () => ({ ok: true, note: 'echo:ok' })
};

export async function exampleValidator() {
    return { name: 'exampleValidator', status: 'skip', note: 'example plugin validator' };
}

// Export for CommonJS compatibility
export const runners = [ExampleEchoRunner];
export const validators = [exampleValidator];
