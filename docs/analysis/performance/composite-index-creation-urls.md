# Firebase Composite Index Creation URLs

## Required Composite Indexes

Based on the Firestore errors, you need to create these composite indexes manually via Firebase Console:

### 1. NeuroSEO Analyses Collection

**Collection**: `neuroSeoAnalyses`
**Query**: `userId == "YVgB3QSJ9LXJVwIZYtNjGFevJfG2" && __name__ desc`

**Firebase Console URL:**

```
https://console.firebase.google.com/v1/r/project/rankpilot-h3jpc/firestore/indexes?create_composite=Cj5wcm9qZWN0cy9yYW5rcGlsb3QtaDNqcGMvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL25ldXJvU2VvQW5hbHlzZXMSCwoGdXNlcklkEAESCwoEX19uYW1lEAIaCgJESQAYBnBhcmVudOZmQXdC
```

### 2. Keyword Research Collection

**Collection**: `keywordResearch`
**Query**: `userId == "YVgB3QSJ9LXJVwIZYtNjGFevJfG2" && __name__ desc`

**Firebase Console URL:**

```
https://console.firebase.google.com/v1/r/project/rankpilot-h3jpc/firestore/indexes?create_composite=Cj5wcm9qZWN0cy9yYW5rcGlsb3QtaDNqcGMvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2tleXdvcmRSZXNlYXJjaBILCgZ1c2VySWQQARILCgRfX25hbWUQAhoKAkhBABgGcGFyZW50wBdB
```

## Manual Creation Instructions

1. **Open Firebase Console**: https://console.firebase.google.com/project/rankpilot-h3jpc/firestore/indexes
2. **Click "Create Index" button**
3. **For each collection**:
   - Collection: `neuroSeoAnalyses` or `keywordResearch`
   - Add Field: `userId` (Ascending)
   - Add Field: `__name__` (Descending)
   - Click "Create"

## Alternative: Use Firebase CLI (if preferred)

```bash
# Deploy the indexes from firestore.indexes.json
firebase deploy --only firestore:indexes --project rankpilot-h3jpc
```

**Note**: The manual URLs above are pre-encoded for the specific queries causing errors. Using these URLs will create the exact indexes needed to resolve the dashboard errors.

## Status After Creation

Once these indexes are created:

- ✅ Dashboard will load project data
- ✅ NeuroSEO analyses will display correctly
- ✅ Keyword research functionality will work
- ✅ All Firestore permission errors resolved

## Verification

Test dashboard functionality at: https://rankpilot-studio.web.app/dashboard

Expected behavior:

- Projects section loads without errors
- NeuroSEO analyses display
- Keyword research tools function properly
- No console errors related to missing indexes or permissions
