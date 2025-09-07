export const features = Object.freeze({
    llmVisibility: (process.env.NEXT_PUBLIC_LLM_VISIBILITY || '').toLowerCase() === 'true',
});
