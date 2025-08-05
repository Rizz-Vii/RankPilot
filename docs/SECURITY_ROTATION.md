# Security Credentials Rotation Guide

## Firebase Service Account Rotation
1. Go to [Firebase Console](https://console.firebase.google.com/project/rankpilot-h3jpc/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Save the new JSON file temporarily
4. Update .env.test with the new credentials
5. Delete the JSON file after updating

## API Keys Rotation

### Firebase Web API Key
1. Go to [Firebase Console](https://console.firebase.google.com/project/rankpilot-h3jpc/settings/general)
2. Under "Your apps", find the Web app
3. Click "..." and select "Configure"
4. Copy the new API key
5. Update FIREBASE_API_KEY in .env.test

### OpenAI API Key
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Update OPENAI_API_KEY in .env.test

### Google AI & Gemini API Keys
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create new API keys with appropriate restrictions
3. Update GOOGLE_AI_API_KEY and GEMINI_API_KEY in .env.test

## Test Account Security

### Standard Test User
```bash
# Using Firebase Admin SDK
firebase auth:delete abba7254@gmail.com
firebase auth:create-user --email new.test.user@example.com
```

### Admin Test User
```bash
# Using Firebase Admin SDK
firebase auth:delete 123@abc.com
firebase auth:create-user --email new.admin@example.com --admin
```

## After Rotation
1. Update all .env files with new credentials
2. Update CI/CD environment variables
3. Update development team with new test account credentials
4. Verify all services are working with new credentials 