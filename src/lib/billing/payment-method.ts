import { getLogger } from '@/lib/logging/app-logger';

export interface PaymentMethodInfo {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    funding?: string;
}

interface StripeCardLike {
    brand?: string; last4?: string; exp_month?: number; exp_year?: number; funding?: string;
}

interface StripePaymentMethodLike { id: string; type: string; card?: StripeCardLike; }

interface StripeLike {
    paymentMethods: { list(params: any): Promise<{ data: StripePaymentMethodLike[] }>; };
    customers: { retrieve(id: string): Promise<any>; };
}

/**
 * Fetch the default card for a Stripe customer (non-sensitive info only).
 */
export async function fetchDefaultCard(stripe: StripeLike, customerId: string): Promise<PaymentMethodInfo | null> {
    const logger = getLogger('billing-payment-method');
    try {
        const cust: any = await stripe.customers.retrieve(customerId);
        let pm: StripePaymentMethodLike | undefined;
        const defaultPmId = cust?.invoice_settings?.default_payment_method;
        if (defaultPmId) {
            const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 10 });
            pm = list.data.find(d => d.id === defaultPmId) || list.data[0];
        } else {
            const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
            pm = list.data[0];
        }
        if (!pm || pm.type !== 'card' || !pm.card) return null;
        return {
            brand: pm.card.brand || 'card',
            last4: pm.card.last4 || '----',
            expMonth: pm.card.exp_month || 0,
            expYear: pm.card.exp_year || 0,
            funding: pm.card.funding,
        };
    } catch (e: any) {
        logger.degraded('payment_method.fetch_failed', { customerId, error: e.message });
        return null;
    }
}
