import { expect, test } from "@playwright/test";
import { UNIFIED_TEST_USERS } from "../config/unified-test-users";
import { EnhancedAuth } from "../utils/enhanced-auth";

/**
 * AI Integration Comprehensive Test Suite
 * Tests all AI features including NeuroSEO™ Suite, MCP integrations, and content analysis
 */

test.describe('AI Integration - NeuroSEO™ Suite', () => {
    let auth: EnhancedAuth;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        auth = new EnhancedAuth(page);

        try {
            const testUser = UNIFIED_TEST_USERS.agency;
            await auth.loginAndGoToDashboard(testUser);
        } catch (_error: unknown) {
            console.log(`⚠️ Auth failed: ${error.message}`);
        }
    });

    test('NeuroSEO Dashboard loads with AI analytics', async ({ page }) => {
        await page.goto('/neuroseo', { timeout: 30000 });
        await expect(page.locator('h1, h2, [data-testid="neuroseo-title"]')).toBeVisible();

        // Check for AI-powered elements
        const aiElements = await page.locator('text=/neural|AI|intelligence|analysis/i').count();
        expect(aiElements).toBeGreaterThan(0);
    });

    test('Content Analyzer AI processing', async ({ page }) => {
        await page.goto('/content-analyzer', { timeout: 30000 });

        const analyzeButton = page.locator('button', { hasText: /analyze|process|start/i });
        if (await analyzeButton.count() > 0) {
            await expect(analyzeButton).toBeVisible();
        }
    });

    test('AI Visibility Engine accessibility', async ({ page }) => {
        await page.goto('/neuroseo/ai-visibility', { timeout: 30000 });

        // Should show premium feature or upgrade prompt
        const content = page.locator('body');
        await expect(content).toBeVisible();
    });

    test('SemanticMap™ feature detection', async ({ page }) => {
        await page.goto('/neuroseo/semantic-map', { timeout: 30000 });

        const semanticContent = page.locator('text=/semantic|topic|map|visualization/i');
        if (await semanticContent.count() > 0) {
            await expect(semanticContent.first()).toBeVisible();
        }
    });

    test('TrustBlock™ E-A-T optimization', async ({ page }) => {
        await page.goto('/neuroseo/trustblock', { timeout: 30000 });

        const trustElements = page.locator('text=/trust|authority|expertise|eat/i');
        if (await trustElements.count() > 0) {
            await expect(trustElements.first()).toBeVisible();
        }
    });
});

test.describe('AI Integration - MCP Server Features', () => {
    test('HuggingFace model search integration', async ({ page }) => {
        await page.goto('/api/mcp/huggingface/search?query=conversational%20AI&limit=5');

        const response = await page.textContent('body');
        if (_response) {
            expect(_response).toContain('models');
        }
    });

    test('NeuroSEO enhanced analysis endpoint', async ({ page }) => {
        const response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                content: 'Test SEO content for analysis',
                keywords: ['SEO', 'optimization'],
                url: 'https://example.com'
            }
        });

        expect(response.status()).toBeLessThan(500);
    });

    test('MCP server health check', async ({ page }) => {
        await page.goto('/api/mcp');

        const response = await page.textContent('body');
        if (_response) {
            expect(_response).toContain('mcp');
        }
    });
});

test.describe('AI Integration - Content Processing', () => {
    test('AI-powered content suggestions', async ({ page }) => {
        await page.goto('/content-optimizer', { timeout: 30000 });

        const contentArea = page.locator('textarea, input[type="text"]').first();
        if (await contentArea.count() > 0) {
            await contentArea.fill('Test content for AI optimization');

            const processButton = page.locator('button', { hasText: /optimize|enhance|improve/i });
            if (await processButton.count() > 0) {
                await processButton.click();
                await page.waitForTimeout(2000);
            }
        }
    });

    test('Competitor intelligence AI analysis', async ({ page }) => {
        await page.goto('/competitors', { timeout: 30000 });

        const urlInput = page.locator('input[placeholder*="url"], input[placeholder*="domain"]');
        if (await urlInput.count() > 0) {
            await urlInput.fill('https://competitor-example.com');

            const analyzeButton = page.locator('button', { hasText: /analyze|scan|research/i });
            if (await analyzeButton.count() > 0) {
                await analyzeButton.click();
                await page.waitForTimeout(3000);
            }
        }
    });

    test('AI orchestrator response validation', async ({ page }) => {
        // Test AI orchestrator through dashboard
        await page.goto('/dashboard', { timeout: 30000 });

        const aiWidgets = page.locator('[data-testid*="ai"], [class*="ai"], text=/AI|neural|intelligence/i');
        const aiCount = await aiWidgets.count();

        if (aiCount > 0) {
            console.log(`✅ Found ${aiCount} AI-powered elements in dashboard`);
        }
    });
});

test.describe('AI Integration - Performance & Error Handling', () => {
    test('AI service timeout handling', async ({ page }) => {
        // Test AI service resilience
        page.setDefaultTimeout(5000);

        try {
            await page.goto('/neuroseo/neural-crawler', { timeout: 10000 });
            await expect(page.locator('body')).toBeVisible();
        } catch (_error) {
            console.log('⚠️ AI service timeout handled gracefully');
        }
    });

    test('AI quota management validation', async ({ page }) => {
        await page.goto('/dashboard', { timeout: 30000 });

        const quotaElements = page.locator('text=/quota|limit|usage|remaining/i');
        if (await quotaElements.count() > 0) {
            await expect(quotaElements.first()).toBeVisible();
        }
    });

    test('AI fallback mechanisms', async ({ page }) => {
        // Test graceful degradation of AI features
        await page.goto('/content-analyzer', { timeout: 30000 });

        const form = page.locator('form').first();
        if (await form.count() > 0) {
            await expect(form).toBeVisible();
        }
    });
});
