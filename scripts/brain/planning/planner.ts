import type { Task } from '../../../types/brain';
import { sampleContext } from '../core/contextSampler';
import fs from 'fs';
import path from 'path';

export function plan(batch: Task[], opts?: { contextKb?: number }): { steps: any[]; strategy: 'openai' | 'heuristic' } {
  const ctx = sampleContext(opts?.contextKb ?? 8);
  const steps = batch.map((t) => ({ kind: 'do-task', taskId: t.id, domain: t.domain || 'docs', contextNote: `files:${ctx.files.length}` }));
  return { steps, strategy: 'heuristic' };
}

export function savePlanText(runId: string, planObj: any) {
  try {
    const dir = path.join(process.cwd(), 'artifacts', 'brain');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `plan-${runId}.txt`), typeof planObj === 'string' ? planObj : JSON.stringify(planObj, null, 2));
  } catch {}
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOpenAIWithRetry(
  openaiClient: any,
  messages: any[],
  model: string,
  temperature: number,
  maxTokens: number,
  retries: number[] = [250, 750]
): Promise<string | null> {
  let lastError: any = null;
  
  // Initial attempt
  try {
    const response = await openaiClient.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    });
    
    return response.choices[0]?.message?.content || null;
  } catch (error) {
    lastError = error;
  }
  
  // Retry attempts with backoff
  for (let i = 0; i < retries.length; i++) {
    try {
      await sleep(retries[i]);
      const response = await openaiClient.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      });
      
      return response.choices[0]?.message?.content || null;
    } catch (error) {
      lastError = error;
    }
  }
  
  console.warn('OpenAI call failed after retries:', lastError?.message || 'Unknown error');
  return null;
}

function extractStructuredPlan(rawResponse: string, batch: Task[]): any[] {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(rawResponse);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed.steps && Array.isArray(parsed.steps)) {
      return parsed.steps;
    }
  } catch {
    // If not valid JSON, extract from text
  }
  
  // Simple extraction - look for task patterns in the response
  const steps: any[] = [];
  const lines = rawResponse.split('\n');
  
  for (const task of batch) {
    // Look for mentions of the task ID or domain in the response
    const hasTaskReference = lines.some(line => 
      line.includes(task.id) || 
      line.includes(task.domain) ||
      line.includes(task.title)
    );
    
    if (hasTaskReference) {
      steps.push({
        kind: 'do-task',
        taskId: task.id,
        domain: task.domain || 'docs',
        contextNote: 'openai-planned'
      });
    }
  }
  
  // If no steps extracted, fall back to basic mapping
  if (steps.length === 0) {
    return batch.map(t => ({
      kind: 'do-task',
      taskId: t.id,
      domain: t.domain || 'docs',
      contextNote: 'openai-fallback'
    }));
  }
  
  return steps;
}

export async function planWithOpenAI(batch: Task[], cfg: any, ctxKb = 8): Promise<{ steps: any[]; strategy: 'openai' | 'heuristic'; estTokens?: number; runId?: string }> {
  const useOpenAI = cfg?.tools?.openaiPlanner && process.env.OPENAI_API_KEY;
  
  // Fall back to heuristic if OpenAI not enabled or no API key
  if (!useOpenAI) {
    return plan(batch, { contextKb: ctxKb });
  }
  
  try {
    // Dynamic import to avoid build issues if openai is not available
    const OpenAI = require('openai').default || require('openai');
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const ctx = sampleContext(ctxKb);
    const batchJson = JSON.stringify(batch, null, 2);
    const estTokens = Math.round(batchJson.length / 4);
    
    const model = cfg?.tokens?.plannerModel || 'gpt-4o-mini';
    const temperature = cfg?.tokens?.temperature ?? 0.2;
    const maxTokens = cfg?.tokens?.maxTokens || 2000;
    const retries = cfg?.retry?.planner?.backoffMs || [250, 750];
    
    const systemPrompt = `You are a project planning AI. Given a batch of tasks, create an efficient execution plan.
    
Context: ${ctx.files.length} files available
Available domains: ${cfg?.domains?.join(', ') || 'docs, backend, frontend'}

Return a JSON array of step objects with this structure:
[
  {
    "kind": "do-task",
    "taskId": "task-id",
    "domain": "docs|backend|frontend|etc",
    "contextNote": "brief planning note"
  }
]

Optimize for:
- Dependency order (e.g., backend before frontend)
- Logical grouping by domain
- Minimal context switching`;

    const userPrompt = `Plan execution for these tasks:
${batchJson}

Respond with a JSON array of steps.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];
    
    const rawResponse = await callOpenAIWithRetry(
      openaiClient,
      messages,
      model,
      temperature,
      maxTokens,
      retries
    );
    
    if (!rawResponse) {
      // OpenAI failed, fall back to heuristic
      return plan(batch, { contextKb: ctxKb });
    }
    
    // Save raw response to artifacts
    const runId = `openai-${Date.now()}`;
    try {
      const dir = path.join(process.cwd(), 'artifacts', 'brain');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `plan${runId}.txt`), rawResponse);
    } catch {
      // Ignore save errors
    }
    
    // Extract structured plan
    const steps = extractStructuredPlan(rawResponse, batch);
    
    return {
      steps,
      strategy: 'openai',
      estTokens,
      runId
    };
    
  } catch (error) {
    console.warn('OpenAI planning failed, falling back to heuristic:', error?.message || 'Unknown error');
    return plan(batch, { contextKb: ctxKb });
  }
}

export default { plan };
