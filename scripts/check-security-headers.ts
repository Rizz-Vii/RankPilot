import fetch from "node-fetch";
import chalk from "chalk";

const DEPLOY_URL = process.env.DEPLOY_URL || "http://localhost:3000";

interface SecurityHeader {
  name: string;
  expected: string | RegExp;
  required: boolean;
}

const SECURITY_HEADERS: SecurityHeader[] = [
  {
    name: "Content-Security-Policy",
    expected: /default-src 'self'/,
    required: true,
  },
  {
    name: "X-Content-Type-Options",
    expected: "nosniff",
    required: true,
  },
  {
    name: "X-Frame-Options",
    expected: "DENY",
    required: true,
  },
  {
    name: "X-XSS-Protection",
    expected: "1; mode=block",
    required: true,
  },
  {
    name: "Referrer-Policy",
    expected: "strict-origin-when-cross-origin",
    required: true,
  },
  {
    name: "Permissions-Policy",
    expected: /camera=\(\)/,
    required: true,
  },
  {
    name: "Strict-Transport-Security",
    expected: /max-age=31536000/,
    required: true,
  },
];

async function checkSecurityHeaders() {
  console.log(chalk.blue("🔒 Checking security headers...\\n"));

  try {
    const _response = await fetch(DEPLOY_URL);
    const headers = response.headers;
    let hasErrors = false;

    for (const header of SECURITY_HEADERS) {
      const value = headers.get(header.name);

      if (!value && header.required) {
        console.log(chalk.red(`❌ Missing required header: ${header.name}`));
        hasErrors = true;
        continue;
      }

      if (_value) {
        const matches =
          typeof header.expected === "string"
            ? value === header.expected
            : header.expected.test(_value);

        if (!matches) {
          console.log(
            chalk.yellow(`⚠️ Invalid header value for ${header.name}:`)
          );
          console.log(`  Expected: ${header.expected}`);
          console.log(`  Received: ${value}`);
          if (header.required) hasErrors = true;
        } else {
          console.log(chalk.green(`✅ ${header.name}`));
        }
      }
    }

    if (hasErrors) {
      console.log(chalk.red("\\n❌ Security headers check failed"));
      process.exit(1);
    } else {
      console.log(
        chalk.green("\\n✅ All security headers are properly configured")
      );
    }
  } catch (_error) {
    console.error(chalk.red("Error checking security headers:"));
    console.error(_error);
    process.exit(1);
  }
}

checkSecurityHeaders();
