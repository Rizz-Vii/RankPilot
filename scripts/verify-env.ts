import * as dotenv from "dotenv";
import * as admin from "firebase-admin";
import { OpenAI } from "openai";
import fetch from "node-fetch";
import { z } from "zod";

// Define environment variable schema
const EnvSchema = z.object({
  // Firebase Config
  FIREBASE_API_KEY: z.string(),
  FIREBASE_AUTH_DOMAIN: z.string(),
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_STORAGE_BUCKET: z.string(),
  FIREBASE_MESSAGING_SENDER_ID: z.string(),
  FIREBASE_APP_ID: z.string(),

  // Firebase Admin
  FIREBASE_ADMIN_PROJECT_ID: z.string(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string(),

  // API Keys
  OPENAI_API_KEY: z.string(),
  GOOGLE_AI_API_KEY: z.string(),
  GEMINI_API_KEY: z.string(),

  // Test Users
  TEST_USER_EMAIL: z.string().email(),
  TEST_USER_PASSWORD: z.string().min(6),
  TEST_ADMIN_EMAIL: z.string().email(),
  TEST_ADMIN_PASSWORD: z.string().min(6),
});

type EnvConfig = z.infer<typeof EnvSchema>;

class EnvironmentVerifier {
  private env: EnvConfig;
  private adminAuth: admin.auth.Auth;

  constructor() {
    // Load environment variables
    dotenv.config({ path: ".env.test" });

    // Validate environment variables
    try {
      this.env = EnvSchema.parse(process.env);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        console.error("❌ Environment validation failed:");
        error.errors.forEach((err) => {
          console.error(`  - ${err.path.join(".")}: ${err.message}`);
        });
        process.exit(1);
      }
      throw error;
    }

    // Initialize Firebase Admin
    const serviceAccount: admin.ServiceAccount = {
      projectId: this.env.FIREBASE_ADMIN_PROJECT_ID,
      privateKey: this.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: this.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    this.adminAuth = admin.auth();
  }

  private async verifyFirebaseAdmin(): Promise<void> {
    try {
      await this.adminAuth.listUsers(1);
      console.log("✅ Firebase Admin SDK: Connected successfully");
    } catch (error: unknown) {
      console.error(
        "❌ Firebase Admin SDK:",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  private async verifyOpenAI(): Promise<void> {
    try {
      const openai = new OpenAI({
        apiKey: this.env.OPENAI_API_KEY,
      });
      await openai.models.list();
      console.log("✅ OpenAI API: Connected successfully");
    } catch (error: unknown) {
      console.error(
        "❌ OpenAI API:",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  private async verifyGoogleAI(): Promise<void> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.env.GOOGLE_AI_API_KEY}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("✅ Google AI API: Connected successfully");
    } catch (error: unknown) {
      console.error(
        "❌ Google AI API:",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  private async verifyTestUsers(): Promise<void> {
    try {
      await this.adminAuth.getUserByEmail(this.env.TEST_USER_EMAIL);
      console.log("✅ Test User: Account exists");
    } catch (error: unknown) {
      console.error(
        "❌ Test User:",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }

    try {
      await this.adminAuth.getUserByEmail(this.env.TEST_ADMIN_EMAIL);
      console.log("✅ Admin User: Account exists");
    } catch (error: unknown) {
      console.error(
        "❌ Admin User:",
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  }

  public async verifyAll(): Promise<void> {
    console.log("Starting environment verification...\n");

    try {
      await this.verifyFirebaseAdmin();
      await this.verifyOpenAI();
      await this.verifyGoogleAI();
      await this.verifyTestUsers();
      console.log("\n✅ All verifications completed successfully");
    } catch (error: unknown) {
      console.error("\n❌ Verification failed. Please check the errors above.");
      process.exit(1);
    }
  }
}

// Run the verification
const verifier = new EnvironmentVerifier();
verifier.verifyAll().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error("Unexpected error:", msg);
  process.exit(1);
});

// Additional environment variable validations
const optionalNumeric = (name: string) => {
  const v = process.env[name];
  if (v && isNaN(Number(v))) {
    throw new Error(`Env ${name} must be numeric if set`);
  }
};

optionalNumeric("BUCKET_TOKENS");
optionalNumeric("BUCKET_REFILL_PER_MIN");
// Finance mode
const fm = process.env.FINANCE_METRICS_MODE;
if (fm && !["mock", "live"].includes(fm)) {
  throw new Error("FINANCE_METRICS_MODE must be mock|live");
}
