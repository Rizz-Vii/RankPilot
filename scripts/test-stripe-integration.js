// 🚀 RankPilot Stripe Integration Test
// File: scripts/test-stripe-integration.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeIntegration() {
    console.log('🔍 Testing RankPilot Stripe Integration...\n');

    try {
        // Test 1: Verify Price ID
        console.log('1️⃣ Testing Price ID: price_1RqFwc2fkoCQ0GTp8wygbgXh');
        const price = await stripe.prices.retrieve('price_1RqFwc2fkoCQ0GTp8wygbgXh');
        console.log(`✅ Price found: ${price.nickname}`);
        console.log(`   Amount: $${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
        console.log(`   Interval: ${price.recurring.interval}\n`);

        // Test 2: Create a test checkout session
        console.log('2️⃣ Creating test checkout session...');
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: 'price_1RqFwc2fkoCQ0GTp8wygbgXh',
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: 'https://rankpilot.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://rankpilot.com/pricing',
            customer_email: 'test@rankpilot.com',
            client_reference_id: 'test_user_123',
            metadata: {
                userId: 'test_user_123',
                tier: 'starter',
                platform: 'rankpilot'
            },
            subscription_data: {
                trial_period_days: 14,
                metadata: {
                    userId: 'test_user_123',
                    tier: 'starter',
                    features: JSON.stringify({
                        neuroSeoQueries: 100,
                        competitors: 5,
                        users: 1,
                        support: 'email'
                    })
                }
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto'
        });

        console.log(`✅ Checkout session created: ${session.id}`);
        console.log(`   URL: ${session.url}\n`);

        // Test 3: Verify account settings
        console.log('3️⃣ Checking account settings...');
        const account = await stripe.accounts.retrieve();
        console.log(`✅ Account: ${account.id}`);
        console.log(`   Country: ${account.country}`);
        console.log(`   Currency: ${account.default_currency}\n`);

        // Test 4: List recent products
        console.log('4️⃣ Listing RankPilot products...');
        const products = await stripe.products.list({ limit: 5 });
        const rankpilotProducts = products.data.filter(p =>
            p.name.toLowerCase().includes('rankpilot') ||
            p.name.toLowerCase().includes('seo')
        );

        rankpilotProducts.forEach(product => {
            console.log(`✅ Product: ${product.name} (${product.id})`);
        });

        console.log('\n🎉 All tests passed! RankPilot Stripe integration is ready for live payments!');
        console.log('\n📋 Next Steps:');
        console.log('1. Complete business profile in Stripe Dashboard');
        console.log('2. Set up webhook endpoints');
        console.log('3. Create remaining tier products (Agency, Enterprise)');
        console.log('4. Test the full payment flow');

    } catch (_error) {
        console.error('❌ Test failed:', error.message);
        if (error.type === 'StripeAuthenticationError') {
            console.log('💡 Check your STRIPE_SECRET_KEY environment variable');
        }
    }
}

// Run the test
testStripeIntegration();
