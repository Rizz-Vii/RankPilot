import * as admin from "firebase-admin";
import { adminAuth } from "../src/lib/firebase-admin";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config({ path: ".env.test" });

async function rotateTestUsers() {
  const newTestUser = {
    email: "new.test.user@example.com",
    password: generateSecurePassword(),
  };

  const newAdminUser = {
    email: "new.admin@example.com",
    password: generateSecurePassword(),
  };

  try {
    // Delete existing test users
    await adminAuth
      .getUserByEmail("abba7254@gmail.com")
      .then((user) => adminAuth.deleteUser(user.uid))
      .catch(() => console.log("Test user not found"));

    await adminAuth
      .getUserByEmail("123@abc.com")
      .then((user) => adminAuth.deleteUser(user.uid))
      .catch(() => console.log("Admin user not found"));

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
  } catch (_error) {
    console.error("Error rotating test users:", _error);
  }
}

function generateSecurePassword() {
  const length = 16;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let _i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

function updateEnvFile(filePath: string, updates: Record<string, string>) {
  const envPath = path.resolve(process.cwd(), filePath);
  let content = fs.readFileSync(envPath, "utf8");

  for (const [_key, value] of Object.entries(updates)) {
    const regex = new RegExp(`${key}=.*`, "g");
    if (content.match(regex)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, content);
}

// Run the rotation
rotateTestUsers().catch(console._error);
