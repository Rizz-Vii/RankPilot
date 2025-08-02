import nodemailer from "nodemailer";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail", // or your preferred email service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
};

// Email templates
const getReceiptEmailTemplate = (_data: {
  customerName: string;
  plan: string;
  amount: string;
  billingCycle: string;
  transactionId: string;
  invoiceUrl?: string;
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Receipt - RankPilot</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .receipt-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; font-weight: bold; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Payment Confirmed!</h1>
          <p>Thank you for upgrading to RankPilot ${data.plan}</p>
        </div>
        
        <div class="content">
          <h2>Hi ${data.customerName},</h2>
          <p>Your payment has been successfully processed. Welcome to RankPilot ${data.plan}! You now have access to all premium features.</p>
          
          <div class="receipt-details">
            <h3>Payment Details</h3>
            <div class="detail-row">
              <span>Plan:</span>
              <span>RankPilot ${data.plan}</span>
            </div>
            <div class="detail-row">
              <span>Billing Cycle:</span>
              <span>${data.billingCycle}</span>
            </div>
            <div class="detail-row">
              <span>Transaction ID:</span>
              <span>${data.transactionId}</span>
            </div>
            <div class="detail-row">
              <span>Amount Paid:</span>
              <span>$${data.amount}</span>
            </div>
          </div>
          
            <h3>Your ${data.plan} Features Include:</h3>
            ${
              data.plan === "Starter"
                ? `
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>50 Link Analyses per month</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>Basic SERP Analysis</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">💬</span>
                <span>Email Support</span>
              </div>
            `
                : data.plan === "Agency"
                  ? `
              <div class="feature-item">
                <span class="feature-icon">♾️</span>
                <span>Unlimited Link Analyses</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🎯</span>
                <span>Premium SERP Analysis</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📞</span>
                <span>24/7 Priority Support</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔧</span>
                <span>Custom Integrations</span>
              </div>
            `
                  : ""
            }
          ${data.invoiceUrl ? `<a href="${data.invoiceUrl}" class="btn">Download Invoice</a>` : ""}
          
          <h3>What's Next?</h3>
          <ul>
            <li>Access your dashboard to start using premium features</li>
            <li>Set up your first SEO project</li>
            <li>Connect your Google Analytics and Search Console</li>
            <li>Explore advanced keyword tracking tools</li>
          </ul>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn">Go to Dashboard</a>
          
          <div class="footer">
            <p>Questions? Contact our support team at support@rankpilot.com</p>
            <p>© 2025 RankPilot. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getWelcomeEmailTemplate = (_data: {
  customerName: string;
  plan: string;
}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to RankPilot ${data.plan}!</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .feature-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature-item { padding: 10px 0; border-bottom: 1px solid #eee; display: flex; align-items: center; }
        .feature-_item:last-child { border-bottom: none; }
        .feature-icon { color: #667eea; margin-right: 10px; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Welcome to RankPilot!</h1>
          <p>You're now part of the ${data.plan} family</p>
        </div>
        
        <div class="content">
          <h2>Hi ${data.customerName},</h2>
          <p>Welcome to RankPilot ${data.plan}! We're excited to help you dominate search rankings and grow your online presence.</p>
          
          <div class="feature-list">
            <h3>Your ${data.plan} Features Include:</h3>
            ${
              data.plan === "Professional"
                ? `
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>100 Link Analyses per month</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>Advanced SERP Analysis</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">💬</span>
                <span>Priority Support</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔗</span>
                <span>API Access</span>
              </div>
            `
                : data.plan === "Enterprise"
                  ? `
              <div class="feature-item">
                <span class="feature-icon">♾️</span>
                <span>Unlimited Link Analyses</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🎯</span>
                <span>Enterprise SERP Analysis</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📞</span>
                <span>24/7 Phone Support</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔧</span>
                <span>Custom Integrations</span>
              </div>
            `
                  : `
              <div class="feature-item">
                <span class="feature-icon">📈</span>
                <span>10 Link Analyses per month</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>Basic SERP Analysis</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">✉️</span>
                <span>Email Support</span>
              </div>
            `
            }
          </div>
          
          <h3>Getting Started Guide:</h3>
          <ol>
            <li><strong>Complete Your Profile:</strong> Add your company information and preferences</li>
            <li><strong>Connect Your Tools:</strong> Link Google Analytics, Search Console, and other tools</li>
            <li><strong>Create Your First Project:</strong> Set up keyword tracking for your website</li>
            <li><strong>Run an SEO Audit:</strong> Get comprehensive insights about your site's performance</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn">Get Started</a>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/getting-started" class="btn" style="background: #6c757d;">View Guide</a>
          </div>
          
          <div class="footer">
            <p>Need help getting started? Our team is here to assist you!</p>
            <p>📧 support@rankpilot.com | 📞 1-800-RANKPILOT</p>
            <p>© 2025 RankPilot. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Email service functions
export const sendPaymentReceiptEmail = async (
  userEmail: string,
  paymentData: {
    customerName: string;
    plan: string;
    amount: string;
    billingCycle: string;
    transactionId: string;
    invoiceUrl?: string;
  }
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@rankpilot.com",
      to: userEmail,
      subject: `Payment Receipt - RankPilot ${paymentData.plan} Subscription`,
      html: getReceiptEmailTemplate(paymentData),
    };

    const _result = await transporter.sendMail(mailOptions);
    console.log("Receipt email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (_error) {
    console.error("Error sending receipt email:", _error);
    throw error;
  }
};

export const sendWelcomeEmail = async (
  userEmail: string,
  userData: {
    customerName: string;
    plan: string;
  }
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@rankpilot.com",
      to: userEmail,
      subject: `Welcome to RankPilot ${userData.plan}! 🚀`,
      html: getWelcomeEmailTemplate(userData),
    };

    const _result = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (_error) {
    console.error("Error sending welcome email:", _error);
    throw error;
  }
};

export const sendBillingReminderEmail = async (
  userEmail: string,
  billingData: {
    customerName: string;
    plan: string;
    amount: string;
    nextBillingDate: string;
  }
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@rankpilot.com",
      to: userEmail,
      subject: `Upcoming Billing Reminder - RankPilot ${billingData.plan}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Billing Reminder</h2>
          <p>Hi ${billingData.customerName},</p>
          <p>This is a friendly reminder that your RankPilot ${billingData.plan} subscription will renew on ${billingData.nextBillingDate} for $${billingData.amount}.</p>
          <p>Your subscription will automatically renew unless you cancel before the renewal date.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/profile?tab=billing" style="color: #667eea;">Manage your subscription</a></p>
          <p>Questions? Contact us at support@rankpilot.com</p>
        </div>
      `,
    };

    const _result = await transporter.sendMail(mailOptions);
    console.log("Billing reminder email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (_error) {
    console.error("Error sending billing reminder email:", _error);
    throw error;
  }
};

// Function to get user data from Firestore for email personalization
export const getUserDataForEmail = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        customerName:
          userData.displayName ||
          userData.email?.split("@")[0] ||
          "Valued Customer",
        email: userData.email,
        subscription: userData.subscription,
      };
    }
    return null;
  } catch (_error) {
    console.error("Error fetching user _data:", _error);
    throw error;
  }
};
