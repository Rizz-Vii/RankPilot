/**
 * Test Utilities - Supporting functions for test files
 */

/**
 * Add random delay to make tests more human-like
 */
export async function randomDelay(min: number = 100, max: number = 500): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get proxy configuration for testing
 */
export function getProxyConfig() {
    if (process.env.TEST_PROXY_URL) {
        return {
            server: process.env.TEST_PROXY_URL,
            username: process.env.TEST_PROXY_USER,
            password: process.env.TEST_PROXY_PASS
        };
    }
    return undefined;
}

/**
 * Rotate user agents to avoid detection
 */
export function rotateUserAgent(): string {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];

    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Wait for element with retry logic
 */
export async function waitForElementWithRetry(
    page: unknown,
    selector: string,
    timeout: number = 30000,
    retries: number = 3
): Promise<boolean> {
    for (let _i = 0; i < retries; i++) {
        try {
            await page.waitForSelector(selector, { timeout });
            return true;
        } catch (_error) {
            if (i === retries - 1) throw error;
            await randomDelay(1000, 2000);
        }
    }
    return false;
}
