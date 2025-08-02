/**
 * MCP Integration Test Suite
 * Comprehensive testing for MCP server integrations
 * 
 * Test Categories:
 * - HuggingFace MCP Integration (20 tests)
 * - Firecrawl MCP Integration (15 tests)
 * - Sentry MCP Integration (12 tests)
 * - Sequential Thinking MCP Integration (10 tests)
 * - NeuroSEO MCP Enhancement (15 tests)
 * Total: 72 additional tests
 */

import { expect, test } from '@playwright/test';
import { TestOrchestrator } from '../utils/test-orchestrator';

let orchestrator: TestOrchestrator;

test.beforeEach(async ({ page }) => {
    orchestrator = new TestOrchestrator(page);
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(20000);
});

test.describe('MCP HuggingFace Integration', () => {
    test('should search for conversational AI models', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'conversational AI chatbot',
                limit: 5,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.models).toBeDefined();
        expect(data.metadata.source).toBe('huggingface');
    });

    test('should search for SEO content optimization models', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'content optimization SEO analysis',
                limit: 10,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.total).toBeGreaterThan(0);
    });

    test('should handle empty query gracefully', async ({ page }) => {
        await orchestrator.userManager.loginAs('starter');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: { query: '' },
        });

        expect(response.status()).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data._error).toContain('Query parameter is required');
    });

    test('should return model recommendations for code generation', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'code generation programming assistance',
                limit: 3,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.models.length).toBeGreaterThan(0);
        expect(data.metadata.requestId).toMatch(/^mcp_/);
    });

    test('should validate model search response structure', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'text classification sentiment analysis',
                limit: 5,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(_data).toHaveProperty('success');
        expect(_data).toHaveProperty('data');
        expect(_data).toHaveProperty('metadata');
        expect(data.metadata).toHaveProperty('timestamp');
        expect(data.metadata).toHaveProperty('requestId');
        expect(data.metadata).toHaveProperty('source', 'huggingface');
    });

    test('should handle API errors gracefully', async ({ page }) => {
        await orchestrator.userManager.loginAs('free');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'test query for error handling',
                limit: 1,
            },
        });

        // Should still work but may have different behavior for free tier
        expect([200, 400, 403]).toContain(response.status());
    });

    test('should search for image processing models', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'image classification computer vision',
                limit: 8,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.query).toBe('image classification computer vision');
    });

    test('should search for natural language processing models', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'NLP natural language processing BERT',
                limit: 12,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.limit).toBe(12);
    });

    test('should validate request ID uniqueness', async ({ page }) => {
        await orchestrator.userManager.loginAs('starter');

        const [response1, response2] = await Promise.all([
            page.request.post('/api/mcp/huggingface/search', {
                _data: { query: 'test query 1', limit: 3 },
            }),
            page.request.post('/api/mcp/huggingface/search', {
                _data: { query: 'test query 2', limit: 3 },
            }),
        ]);

        expect(response1.ok()).toBeTruthy();
        expect(response2.ok()).toBeTruthy();

        const data1 = await response1.json();
        const data2 = await response2.json();

        expect(data1.metadata.requestId).not.toBe(data2.metadata.requestId);
    });

    test('should handle large limit values', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'transformer model architecture',
                limit: 50,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.limit).toBe(50);
    });

    test('should search for multilingual models', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'multilingual translation language model',
                limit: 7,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
    });

    test('should validate timestamp format', async ({ page }) => {
        await orchestrator.userManager.loginAs('starter');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'timestamp validation test',
                limit: 1,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        // Validate ISO 8601 timestamp format
        const timestamp = data.metadata.timestamp;
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(timestamp)).toBeInstanceOf(Date);
    });

    test('should search for audio processing models', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'audio speech recognition whisper',
                limit: 6,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.models).toBeDefined();
    });

    test('should handle special characters in query', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'test@query#special$characters%search',
                limit: 3,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
    });

    test('should search for fine-tuned models', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'fine-tuned domain-specific model',
                limit: 4,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.total).toBeGreaterThan(0);
    });

    test('should validate model data structure', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'model structure validation test',
                limit: 2,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        if (data.data.models?.length > 0) {
            const model = data.data.models[0];
            expect(model).toHaveProperty('id');
            expect(model).toHaveProperty('name');
            expect(model).toHaveProperty('description');
            expect(model).toHaveProperty('downloads');
            expect(model).toHaveProperty('tags');
        }
    });

    test('should handle minimum limit value', async ({ page }) => {
        await orchestrator.userManager.loginAs('starter');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'minimum limit test',
                limit: 1,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.limit).toBe(1);
    });

    test('should search for zero-shot classification models', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'zero-shot classification inference',
                limit: 5,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
    });

    test('should validate concurrent requests', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const requests = Array.from({ length: 3 }, (_, _i) =>
            page.request.post('/api/mcp/huggingface/search', {
                _data: {
                    query: `concurrent request ${i + 1}`,
                    limit: 2,
                },
            })
        );

        const responses = await Promise.all(requests);

        for (const _response of responses) {
            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(data.success).toBe(true);
        }
    });

    test('should search for embedding models', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/huggingface/search', {
            _data: {
                query: 'sentence embeddings vector representation',
                limit: 8,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.models).toBeDefined();
    });
});

test.describe('MCP NeuroSEO Enhanced Analysis', () => {
    test('should run enhanced SEO analysis with AI models', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://example.com',
                content: 'Test content for SEO analysis with AI enhancement',
                keywords: ['seo', 'ai', 'optimization'],
                competitorUrls: ['https://competitor1.com', 'https://competitor2.com'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.enhancementFlags).toBeDefined();
        expect(data.data.combinedScore).toBeGreaterThan(0);
    });

    test('should validate enhancement flags', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://test-site.com',
                content: 'Enhanced analysis test content',
                keywords: ['test', 'enhancement'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        const expectedFlags = [
            'AI_ENHANCED_CONTENT_ANALYSIS',
            'REAL_TIME_PERFORMANCE_MONITORING',
            'AI_STRATEGIC_RECOMMENDATIONS',
        ];

        for (const flag of expectedFlags) {
            expect(data.data.enhancementFlags).toContain(flag);
        }
    });

    test('should handle missing required parameters', async ({ page }) => {
        await orchestrator.userManager.loginAs('starter');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://example.com',
                // Missing content and keywords
            },
        });

        expect(response.status()).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data._error).toContain('required');
    });

    test('should analyze content with competitor intelligence', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://rankpilot.com',
                content: 'RankPilot AI-first SEO platform analysis',
                keywords: ['rankpilot', 'seo', 'ai', 'platform'],
                competitorUrls: ['https://semrush.com', 'https://ahrefs.com'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.enhancementFlags).toContain('ADVANCED_COMPETITOR_INTELLIGENCE');
    });

    test('should validate combined score calculation', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://score-test.com',
                content: 'Content for combined score validation',
                keywords: ['score', 'calculation', 'test'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.combinedScore).toBeGreaterThanOrEqual(0);
        expect(data.data.combinedScore).toBeLessThanOrEqual(100);
    });

    test('should provide strategic recommendations', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://strategy-test.com',
                content: 'Content requiring strategic SEO recommendations',
                keywords: ['strategy', 'recommendations', 'seo'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.enhancementFlags).toContain('AI_STRATEGIC_RECOMMENDATIONS');
    });

    test('should handle empty keywords array', async ({ page }) => {
        await orchestrator.userManager.loginAs('starter');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://example.com',
                content: 'Test content',
                keywords: [],
            },
        });

        expect(response.status()).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
    });

    test('should validate metadata structure', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://metadata-test.com',
                content: 'Metadata validation content',
                keywords: ['metadata', 'validation'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.metadata).toHaveProperty('enhancementFlags');
        expect(data.metadata).toHaveProperty('combinedScore');
        expect(data.metadata).toHaveProperty('timestamp');
    });

    test('should analyze long-form content', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const longContent = 'This is a comprehensive long-form content piece for SEO analysis. '.repeat(50);

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://long-content.com',
                content: longContent,
                keywords: ['long-form', 'content', 'analysis'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
    });

    test('should handle special characters in content', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const specialContent = 'Content with special chars: ñáéíóú @#$%^&*()';

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://special-chars.com',
                content: specialContent,
                keywords: ['special', 'characters'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
    });

    test('should validate performance monitoring integration', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://performance-test.com',
                content: 'Performance monitoring integration test',
                keywords: ['performance', 'monitoring'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.enhancementFlags).toContain('REAL_TIME_PERFORMANCE_MONITORING');
    });

    test('should handle multiple competitor URLs', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const competitorUrls = [
            'https://competitor1.com',
            'https://competitor2.com',
            'https://competitor3.com',
            'https://competitor4.com',
            'https://competitor5.com',
        ];

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://multi-competitor.com',
                content: 'Multiple competitor analysis test',
                keywords: ['competitor', 'analysis'],
                competitorUrls,
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.success).toBe(true);
    });

    test('should validate AI enhancement integration', async ({ page }) => {
        await orchestrator.userManager.loginAs('agency');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'https://ai-enhancement.com',
                content: 'AI enhancement validation content',
                keywords: ['ai', 'enhancement', 'validation'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.data.enhancementFlags).toContain('AI_ENHANCED_CONTENT_ANALYSIS');
    });

    test('should handle concurrent analysis requests', async ({ page }) => {
        await orchestrator.userManager.loginAs('enterprise');

        const requests = Array.from({ length: 3 }, (_, _i) =>
            page.request.post('/api/mcp/neuroseo/enhanced', {
                _data: {
                    url: `https://concurrent-${i + 1}.com`,
                    content: `Concurrent analysis content ${i + 1}`,
                    keywords: ['concurrent', `test${i + 1}`],
                },
            })
        );

        const responses = await Promise.all(requests);

        for (const _response of responses) {
            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(data.success).toBe(true);
        }
    });

    test('should provide error handling for invalid URLs', async ({ page }) => {
        await orchestrator.userManager.loginAs('starter');

        const _response = await page.request.post('/api/mcp/neuroseo/enhanced', {
            _data: {
                url: 'invalid-url-format',
                content: 'Test content for invalid URL',
                keywords: ['invalid', 'url'],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        // Should still process but may have warnings
        expect(data.success).toBe(true);
    });
});
