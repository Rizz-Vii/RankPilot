import CustomerChatBot from '@/components/chat/CustomerChatBot';
import type { AuthContextType } from '@/context/AuthContext';
import { AuthContext } from '@/context/AuthContext';
import { strict as assert } from 'assert';
import { createRoot } from 'react-dom/client';

// Minimal fetch mock for chat history GET
interface ChatMessage { id: string; isUser: boolean; timestamp: string; message?: string; type?: string; mediaUrl?: string; response?: string; tokensUsed?: number }
function mockFetchWithMessages(messages: ChatMessage[]) {
  // @ts-ignore override global for test
  global.fetch = async (url: string, init?: { method?: string }) => {
    if (typeof url === 'string' && url.startsWith('/api/chat/customer')) {
      return new Response(JSON.stringify({
        messages,
        sessionId: 'session_test',
        hasMore: false
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  };
}

describe('CustomerChatBot attachments rendering', () => {
  it('renders image and audio bubbles from GET history', async () => {
    const authValue: AuthContextType = {
      user: { uid: 'user_1', getIdToken: async () => 't' } as unknown as AuthContextType['user'],
      loading: false,
      role: 'user',
      profile: { subscriptionTier: 'starter' },
      activities: [],
    };

    const messages = [
      { id: 'm1_att', isUser: true, type: 'image', mediaUrl: 'https://example.com/img.png', message: 'pic', timestamp: new Date().toISOString() },
      { id: 'm2_att', isUser: true, type: 'audio', mediaUrl: 'https://example.com/voice.webm', message: 'voice', timestamp: new Date().toISOString() },
      { id: 'm3_ai', isUser: false, response: 'ok', timestamp: new Date().toISOString(), tokensUsed: 10 },
    ];

    mockFetchWithMessages(messages);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(
      <AuthContext.Provider value={authValue}>
        <CustomerChatBot />
      </AuthContext.Provider>
    );

    // Click the toggle button to open the chat
    const openBtn = await waitFor(() => container.querySelector('button[aria-label="Open RankPilot AI Chat"]')) as HTMLButtonElement;
    openBtn.click();

    // Wait for fetch + render
    await delay(0);

    const img = container.querySelector('img[src="https://example.com/img.png"]');
    const audio = container.querySelector('audio');
    assert.ok(img, 'image attachment rendered');
    assert.ok(audio, 'audio attachment rendered');
  });
});

function delay(ms: number){ return new Promise(res => setTimeout(res, ms)); }
async function waitFor<T>(fn: () => T | null, timeout = 1000, interval = 25): Promise<T> {
  const start = Date.now();

  while(true){
    const v = fn();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error('waitFor timeout');
    await delay(interval);
  }
}
