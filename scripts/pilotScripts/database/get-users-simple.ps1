# Simple Firestore User Retrieval Tool
Write-Host "🔥 Firestore User Retrieval Tool" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""
Write-Host "🎯 Project: rankpilot-h3jpc" -ForegroundColor Yellow
Write-Host "📊 Collection: users" -ForegroundColor Yellow
Write-Host ""

Write-Host "🚀 Opening Firebase Console..." -ForegroundColor Green
Start-Process "https://console.firebase.google.com/project/rankpilot-h3jpc/firestore/data/~2Fusers"
Write-Host "✅ Firebase Console opened!" -ForegroundColor Green
Write-Host ""

Write-Host "📋 INSTRUCTIONS:" -ForegroundColor Magenta
Write-Host "1. Wait for Firebase Console to load"
Write-Host "2. Open browser Developer Tools (F12)"
Write-Host "3. Go to Console tab"
Write-Host "4. Copy and paste the commands below"
Write-Host ""

Write-Host "🔥 FIREBASE CONSOLE COMMANDS:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. COUNT ALL USERS:" -ForegroundColor Blue
Write-Host "db.collection('users').get().then(snap => console.log('Total users:', snap.size));"
Write-Host ""

Write-Host "2. LIST ALL USERS:" -ForegroundColor Blue
Write-Host "db.collection('users').get().then(snapshot => {"
Write-Host "  console.log('Found ' + snapshot.size + ' users:');"
Write-Host "  snapshot.docs.forEach(doc => {"
Write-Host "    const data = doc.data();"
Write-Host "    console.log('UID:', doc.id);"
Write-Host "    console.log('Email:', data.email || 'Not set');"
Write-Host "    console.log('Role:', data.role || 'Not set');"
Write-Host "    console.log('Tier:', data.subscriptionTier || 'Not set');"
Write-Host "    console.log('Status:', data.subscriptionStatus || 'Not set');"
Write-Host "    console.log('Complete:', !!(data.subscriptionTier && data.subscriptionStatus));"
Write-Host "    console.log('---');"
Write-Host "  });"
Write-Host "});"
Write-Host ""

Write-Host "3. FIND INCOMPLETE USERS:" -ForegroundColor Blue
Write-Host "db.collection('users').get().then(snapshot => {"
Write-Host "  const incomplete = [];"
Write-Host "  snapshot.docs.forEach(doc => {"
Write-Host "    const data = doc.data();"
Write-Host "    if (!data.subscriptionTier || !data.subscriptionStatus) {"
Write-Host "      incomplete.push({uid: doc.id, email: data.email});"
Write-Host "    }"
Write-Host "  });"
Write-Host "  console.log('Incomplete users:', incomplete);"
Write-Host "});"
Write-Host ""

Write-Host "4. EXPORT AS JSON:" -ForegroundColor Blue
Write-Host "db.collection('users').get().then(snapshot => {"
Write-Host "  const users = [];"
Write-Host "  snapshot.docs.forEach(doc => {"
Write-Host "    users.push({uid: doc.id, ...doc.data()});"
Write-Host "  });"
Write-Host "  console.log(JSON.stringify(users, null, 2));"
Write-Host "});"
Write-Host ""

Write-Host "✅ Ready! Use the commands above in Firebase Console." -ForegroundColor Green
