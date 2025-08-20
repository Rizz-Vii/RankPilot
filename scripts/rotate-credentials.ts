import { randomInt } from "crypto";
import { adminAuth } from "../src/lib/firebase-admin";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config({ path: ".env.test" });

async function rotateTestUsers(): Promise<void> {
  const newTestUser = {
    email: "new.test.user@example.com",
    password: generateSecurePassword(),
  };

  const newAdminUser = {
    email: "new.admin@example.com",
    password: generateSecurePassword(),
  };

  try {
    // Delete existing test users (ignore if not found)
    try {
      const user = await adminAuth.getUserByEmail("abba7254@gmail.com");
      await adminAuth.deleteUser(user.uid);
    } catch {
      console.log("Test user not found");
    }

    try {
      const user = await adminAuth.getUserByEmail("123@abc.com");
      await adminAuth.deleteUser(user.uid);
    } catch {
      console.log("Admin user not found");
    }

    // Create new test users
    const testUser = await adminAuth.createUser({
      email: newTestUser.email,
      password: newTestUser.password,
    });

    const adminUser = await adminAuth.createUser({
      email: newAdminUser.email,
      password: newAdminUser.password,
    });

    // Set admin custom claims
    await adminAuth.setCustomUserClaims(adminUser.uid, { admin: true });

    // Update .env.test with new credentials
    updateEnvFile(".env.test", {
      TEST_USER_EMAIL: newTestUser.email,
      TEST_USER_PASSWORD: newTestUser.password,
      TEST_ADMIN_EMAIL: newAdminUser.email,
      TEST_ADMIN_PASSWORD: newAdminUser.password,
    });

    console.log("Test users rotated successfully");
    console.log("New test user credentials:", newTestUser);
    console.log("New admin user credentials:", newAdminUser);
  } catch (error) {
    console.error("Error rotating test users:", error);
  }
}

function generateSecurePassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  return password;
}

function updateEnvFile(filePath: string, updates: Record<string, string>): void {
  const envPath = path.resolve(process.cwd(), filePath);
  let content = "";
  try {
    content = fs.readFileSync(envPath, "utf8");
  } catch {
    content = "";
  }

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      if (content.length && !content.endsWith("\n")) content += "\n";
      content += `${key}=${value}\n`;
    }
  }

  fs.writeFileSync(envPath, content, "utf8");
}

// Run the rotation
rotateTestUsers().catch(console.error);
