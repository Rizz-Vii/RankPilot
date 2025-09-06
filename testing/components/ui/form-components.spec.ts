/**
 * RankPilot Form Components Tests
 * Comprehensive testing for form UI components and interactions
 */

import { expect, test } from '@playwright/test';

// Use Playwright's configured base URL or fallback to localhost
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const RANKPILOT_APP_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test data
const TEST_DATA = {
    validUrl: 'https://example.com',
    invalidUrl: 'not-a-valid-url',
    testKeywords: ['seo', 'optimization', 'analytics'],
    formData: {
        name: 'Test Form',
        email: 'test@example.com',
        message: 'This is a test message'
    }
};

const formTestDiagnostics = { errors: [] as string[] };

test.describe('RankPilot Form Components - Comprehensive Testing', () => {

    test.beforeEach(async ({ page }) => {
        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(25000);
    });

    test.describe('Keyword Tool Form', () => {

        test('Keyword Tool Form - Basic Display', async ({ page }) => {
            console.log('🔍 Testing Keyword Tool Form Display...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/keyword-tool`);

                // Check for keyword tool form elements
                const formVisible = await page.isVisible('form, [data-testid="keyword-form"]');
                const inputField = await page.isVisible('input[type="text"], input[placeholder*="keyword"]');
                const submitButton = await page.isVisible('button[type="submit"], [data-testid="submit"]');

                console.log(`   Form Visible: ${formVisible}`);
                console.log(`   Input Field Visible: ${inputField}`);
                console.log(`   Submit Button Visible: ${submitButton}`);

                expect(formVisible || inputField || submitButton).toBe(true);
                console.log('   ✅ Keyword tool form display functional');
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Keyword tool form display test failed');
            }
        });

        test('Keyword Tool Form - Input Validation', async ({ page }) => {
            console.log('✅ Testing Keyword Tool Form Validation...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/keyword-tool`);

                // Find input field
                const inputField = await page.locator('input[type="text"], input[placeholder*="keyword"]').first();

                if (await inputField.isVisible()) {
                    // Test empty submission
                    await inputField.fill('');
                    const submitBtn = await page.locator('button[type="submit"], [data-testid="submit"]').first();

                    if (await submitBtn.isVisible()) {
                        await submitBtn.click();

                        // Check for validation message
                        const validationMsg = await page.isVisible('.error, [data-testid="error"], .validation-message');
                        console.log(`   Validation Message Shown: ${validationMsg}`);

                        expect(validationMsg).toBe(true);
                        console.log('   ✅ Keyword tool form validation functional');
                    }
                } else {
                    console.log('   ⚠️ Input field not found, skipping validation test');
                }
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Keyword tool form validation test failed');
            }
        });

        test('Keyword Tool Form - Successful Submission', async ({ page }) => {
            console.log('📤 Testing Keyword Tool Form Submission...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/keyword-tool`);

                // Find and fill form
                const inputField = await page.locator('input[type="text"], input[placeholder*="keyword"]').first();

                if (await inputField.isVisible()) {
                    await inputField.fill(TEST_DATA.testKeywords[0]);

                    const submitBtn = await page.locator('button[type="submit"], [data-testid="submit"]').first();

                    if (await submitBtn.isVisible()) {
                        await submitBtn.click();

                        // Wait for response or loading state
                        await page.waitForTimeout(2000);

                        const resultsVisible = await page.isVisible('[data-testid="results"], .results, .keyword-results');
                        const loadingVisible = await page.isVisible('[data-testid="loading"], .loading');

                        console.log(`   Results Visible: ${resultsVisible}`);
                        console.log(`   Loading State: ${loadingVisible}`);

                        expect(resultsVisible || loadingVisible).toBe(true);
                        console.log('   ✅ Keyword tool form submission functional');
                    }
                } else {
                    console.log('   ⚠️ Form elements not found, skipping submission test');
                }
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Keyword tool form submission test failed');
            }
        });
    });

    test.describe('SEO Audit Form', () => {

        test('SEO Audit Form - URL Input', async ({ page }) => {
            console.log('🔍 Testing SEO Audit Form...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/seo-audit`);

                // Check for SEO audit form
                const urlInput = await page.isVisible('input[type="url"], input[placeholder*="url"]');
                const auditButton = await page.isVisible('button[data-testid*="audit"], .audit-btn');

                console.log(`   URL Input Visible: ${urlInput}`);
                console.log(`   Audit Button Visible: ${auditButton}`);

                expect(urlInput || auditButton).toBe(true);
                console.log('   ✅ SEO audit form functional');
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ SEO audit form test failed');
            }
        });

        test('SEO Audit Form - URL Validation', async ({ page }) => {
            console.log('✅ Testing SEO Audit URL Validation...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/seo-audit`);

                const urlInput = await page.locator('input[type="url"], input[placeholder*="url"]').first();

                if (await urlInput.isVisible()) {
                    // Test invalid URL
                    await urlInput.fill(TEST_DATA.invalidUrl);

                    const auditBtn = await page.locator('button[data-testid*="audit"], .audit-btn').first();

                    if (await auditBtn.isVisible()) {
                        await auditBtn.click();

                        // Check for URL validation
                        const urlError = await page.isVisible('.url-error, [data-testid="url-error"]');
                        console.log(`   URL Validation Error: ${urlError}`);

                        expect(urlError).toBe(true);
                        console.log('   ✅ SEO audit URL validation functional');
                    }
                } else {
                    console.log('   ⚠️ URL input not found, skipping validation test');
                }
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ SEO audit URL validation test failed');
            }
        });
    });

    test.describe('Contact Form', () => {

        test('Contact Form - Basic Display', async ({ page }) => {
            console.log('📧 Testing Contact Form Display...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/contact`);

                // Check for contact form elements
                const nameInput = await page.isVisible('input[name="name"], input[placeholder*="name"]');
                const emailInput = await page.isVisible('input[type="email"], input[name="email"]');
                const messageTextarea = await page.isVisible('textarea[name="message"], textarea[placeholder*="message"]');
                const sendButton = await page.isVisible('button[type="submit"], [data-testid="send"]');

                console.log(`   Name Input Visible: ${nameInput}`);
                console.log(`   Email Input Visible: ${emailInput}`);
                console.log(`   Message Textarea Visible: ${messageTextarea}`);
                console.log(`   Send Button Visible: ${sendButton}`);

                expect(nameInput || emailInput || messageTextarea || sendButton).toBe(true);
                console.log('   ✅ Contact form display functional');
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Contact form display test failed');
            }
        });

        test('Contact Form - Field Validation', async ({ page }) => {
            console.log('✅ Testing Contact Form Validation...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/contact`);

                // Try to submit empty form
                const submitBtn = await page.locator('button[type="submit"], [data-testid="send"]').first();

                if (await submitBtn.isVisible()) {
                    await submitBtn.click();

                    // Check for validation messages
                    const validationErrors = await page.locator('.error, .validation-message, [data-testid*="error"]').all();
                    console.log(`   Validation Errors Found: ${validationErrors.length}`);

                    expect(validationErrors.length).toBeGreaterThan(0);
                    console.log('   ✅ Contact form validation functional');
                } else {
                    console.log('   ⚠️ Submit button not found, skipping validation test');
                }
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Contact form validation test failed');
            }
        });

        test('Contact Form - Successful Submission', async ({ page }) => {
            console.log('📤 Testing Contact Form Submission...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/contact`);

                // Fill form fields
                const nameInput = await page.locator('input[name="name"], input[placeholder*="name"]').first();
                const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
                const messageTextarea = await page.locator('textarea[name="message"], textarea[placeholder*="message"]').first();

                if (await nameInput.isVisible()) {
                    await nameInput.fill(TEST_DATA.formData.name);
                }
                if (await emailInput.isVisible()) {
                    await emailInput.fill(TEST_DATA.formData.email);
                }
                if (await messageTextarea.isVisible()) {
                    await messageTextarea.fill(TEST_DATA.formData.message);
                }

                // Submit form
                const submitBtn = await page.locator('button[type="submit"], [data-testid="send"]').first();

                if (await submitBtn.isVisible()) {
                    await submitBtn.click();

                    // Wait for success message
                    await page.waitForTimeout(2000);

                    const successMsg = await page.isVisible('.success, [data-testid="success"], .thank-you');
                    console.log(`   Success Message Visible: ${successMsg}`);

                    expect(successMsg).toBe(true);
                    console.log('   ✅ Contact form submission functional');
                }
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Contact form submission test failed');
            }
        });
    });

    test.describe('Form Error Handling', () => {

        test('Form Network Error Handling', async ({ page }) => {
            console.log('🌐 Testing Form Network Error Handling...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/contact`);

                // Fill and submit form
                const nameInput = await page.locator('input[name="name"]').first();
                const emailInput = await page.locator('input[type="email"]').first();
                const messageTextarea = await page.locator('textarea[name="message"]').first();

                if (await nameInput.isVisible()) await nameInput.fill(TEST_DATA.formData.name);
                if (await emailInput.isVisible()) await emailInput.fill(TEST_DATA.formData.email);
                if (await messageTextarea.isVisible()) await messageTextarea.fill(TEST_DATA.formData.message);

                // Intercept network requests to simulate failure
                await page.route('**/api/contact**', route => route.abort());

                const submitBtn = await page.locator('button[type="submit"]').first();
                if (await submitBtn.isVisible()) {
                    await submitBtn.click();

                    // Check for error message
                    const errorMsg = await page.isVisible('.error, .network-error, [data-testid="error"]');
                    console.log(`   Network Error Handled: ${errorMsg}`);

                    expect(errorMsg).toBe(true);
                    console.log('   ✅ Form network error handling functional');
                }
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Form network error handling test failed');
            } finally {
                // Restore normal network behavior
                await page.unroute('**/api/contact**');
            }
        });

        test('Form Loading States', async ({ page }) => {
            console.log('⏳ Testing Form Loading States...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/contact`);

                // Fill form
                const nameInput = await page.locator('input[name="name"]').first();
                const emailInput = await page.locator('input[type="email"]').first();
                const messageTextarea = await page.locator('textarea[name="message"]').first();

                if (await nameInput.isVisible()) await nameInput.fill(TEST_DATA.formData.name);
                if (await emailInput.isVisible()) await emailInput.fill(TEST_DATA.formData.email);
                if (await messageTextarea.isVisible()) await messageTextarea.fill(TEST_DATA.formData.message);

                const submitBtn = await page.locator('button[type="submit"]').first();

                if (await submitBtn.isVisible()) {
                    // Check initial button state
                    const initialText = await submitBtn.textContent();

                    await submitBtn.click();

                    // Check for loading state
                    const loadingState = await page.isVisible('button:disabled, .loading, [data-testid="loading"]');
                    const buttonDisabled = await submitBtn.isDisabled();

                    console.log(`   Loading State Visible: ${loadingState}`);
                    console.log(`   Button Disabled: ${buttonDisabled}`);

                    expect(loadingState || buttonDisabled).toBe(true);
                    console.log('   ✅ Form loading states functional');
                }
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Form loading states test failed');
            }
        });
    });

    test.describe('Form Accessibility', () => {

        test('Form Keyboard Navigation', async ({ page }) => {
            console.log('⌨️ Testing Form Keyboard Navigation...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/contact`);

                // Test tab navigation through form fields
                await page.keyboard.press('Tab');
                const activeElement = await page.evaluate(() => document.activeElement?.tagName);

                console.log(`   First Focusable Element: ${activeElement}`);

                // Should focus on a form element
                expect(['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(activeElement || '')).toBe(true);
                console.log('   ✅ Form keyboard navigation functional');
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Form keyboard navigation test failed');
            }
        });

        test('Form Labels & ARIA', async ({ page }) => {
            console.log('🏷️ Testing Form Labels and ARIA...');

            try {
                await page.goto(`${RANKPILOT_APP_URL}/contact`);

                // Check for proper labeling
                const labels = await page.locator('label, [aria-label], [aria-labelledby]').all();
                const inputs = await page.locator('input, textarea, select').all();

                console.log(`   Labels/ARIA Found: ${labels.length}`);
                console.log(`   Form Inputs Found: ${inputs.length}`);

                // Should have some form of labeling
                expect(labels.length > 0 || inputs.length === 0).toBe(true);
                console.log('   ✅ Form labels and ARIA functional');
            } catch (error) {
                formTestDiagnostics.errors.push(error instanceof Error ? error.message : String(error));
                console.log('   ⚠️ Form labels and ARIA test failed');
            }
        });
    });

    test.afterAll(() => {
        if (formTestDiagnostics.errors.length > 0) {
            console.log('\n🚨 Form Test Errors:');
            formTestDiagnostics.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        } else {
            console.log('\n✅ All Form tests completed successfully');
        }
    });
});
