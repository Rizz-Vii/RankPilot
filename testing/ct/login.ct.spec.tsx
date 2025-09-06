import LoginPage from '@/app/(auth)/login/page';
import { expect, test } from '@playwright/experimental-ct-react';

// Basic component-level validation checks

test('login: shows email required error on submit', async ({ mount }) => {
    const cmp = await mount(<LoginPage />);
    await cmp.getByRole('button', { name: 'Login' }).click();
    await expect(cmp.getByRole('alert')).toContainText('Email is required');
});

test('login: invalid email triggers inline error', async ({ mount }) => {
    const cmp = await mount(<LoginPage />);
    await cmp.getByLabel('Email').fill('not-an-email');
    await cmp.getByLabel('Password').fill('123456');
    await cmp.getByRole('button', { name: 'Login' }).click();
    await expect(cmp.getByRole('alert')).toContainText('Invalid email address');
});
