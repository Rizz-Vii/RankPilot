const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'rankpilot-h3jpc'
});

const db = admin.firestore();

// Test user UIDs to check
const TEST_USERS = [
  {
    uid: "vGZSfZA7yPOOCgUGtAS2ywvwP8l1",
    email: "abbas_ali_rizvi@hotmail.com",
    tier: "free",
    displayName: "Abbas Ali (Free)"
  },
  {
    uid: "Y0hv244mtsYk4dwsxBCS1xBOhab2", 
    email: "starter@rankpilot.com",
    tier: "starter",
    displayName: "Starter User"
  },
  {
    uid: "test_agency_user",
    email: "agency@rankpilot.com", 
    tier: "agency",
    displayName: "Agency User"
  },
  {
    uid: "m7nbs1tNrxYIlaclebE5sKI6ok53",
    email: "enterprise@rankpilot.com",
    tier: "enterprise", 
    displayName: "Enterprise User"
  },
  {
    uid: "UFGrzIf2N3UTPd5Xz7vT8tMZpHJ3",
    email: "admin@rankpilot.com",
    tier: "admin",
    displayName: "Admin User"
  }
];

async function checkTestUsers() {
  console.log('🔍 CHECKING TEST USERS IN PRODUCTION DATABASE\n');
  console.log('═══════════════════════════════════════════════════════════════');
  
  let foundUsers = 0;
  let totalAnalyses = 0;
  let totalProjects = 0;
  
  for (const testUser of TEST_USERS) {
    try {
      console.log(`\n📋 Checking ${testUser.tier.toUpperCase()} USER: ${testUser.displayName}`);
      console.log(`   UID: ${testUser.uid}`);
      console.log(`   Email: ${testUser.email}`);
      
      // Check if user document exists
      const userDoc = await db.collection('users').doc(testUser.uid).get();
      
      if (userDoc.exists) {
        foundUsers++;
        const userData = userDoc.data();
        console.log(`   ✅ USER FOUND in database`);
        console.log(`   📊 Tier: ${userData.subscriptionTier || 'N/A'}`);
        console.log(`   📧 Email: ${userData.email || 'N/A'}`);
        console.log(`   🎭 Role: ${userData.role || 'N/A'}`);
        console.log(`   📅 Created: ${userData.createdAt ? userData.createdAt.toDate().toISOString().split('T')[0] : 'N/A'}`);
        
        // Check for related data
        const projects = await db.collection('projects').where('userId', '==', testUser.uid).get();
        const analyses = await db.collection('neuroSeoAnalyses').where('userId', '==', testUser.uid).get();
        const keywordResearch = await db.collection('keywordResearch').where('userId', '==', testUser.uid).get();
        
        console.log(`   📁 Projects: ${projects.size} documents`);
        console.log(`   🧠 NeuroSEO Analyses: ${analyses.size} documents`);
        console.log(`   🔍 Keyword Research: ${keywordResearch.size} documents`);
        
        totalProjects += projects.size;
        totalAnalyses += analyses.size;
        
        // Show sample project if exists
        if (projects.size > 0) {
          const sampleProject = projects.docs[0].data();
          console.log(`   📋 Sample Project: "${sampleProject.name}" (${sampleProject.domain})`);
        }
        
        // Show sample analysis if exists  
        if (analyses.size > 0) {
          const sampleAnalysis = analyses.docs[0].data();
          console.log(`   🧠 Sample Analysis: Status "${sampleAnalysis.status}" (${sampleAnalysis.createdAt ? sampleAnalysis.createdAt.toDate().toISOString().split('T')[0] : 'N/A'})`);
        }
        
      } else {
        console.log(`   ❌ USER NOT FOUND in database`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  ERROR checking user: ${error.message}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 TEST USER DATABASE SUMMARY:');
  console.log(`├─ Users Found: ${foundUsers}/${TEST_USERS.length}`);
  console.log(`├─ Total Projects: ${totalProjects}`);
  console.log(`├─ Total Analyses: ${totalAnalyses}`);
  console.log(`├─ Database Status: ${foundUsers > 0 ? '✅ HAS TEST DATA' : '⚠️  EMPTY - NEEDS SEEDING'}`);
  console.log(`└─ Production Ready: ${foundUsers >= 3 ? '✅ SUFFICIENT TEST COVERAGE' : '⚠️  NEEDS MORE TEST DATA'}`);
  
  if (foundUsers === 0) {
    console.log('\n🚨 RECOMMENDATION: Run database seeding to create test users');
    console.log('   Command: npm run seed-database (if available)');
  }
  
  console.log('\n🎯 Test User Verification Complete');
}

// Run the check
checkTestUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Test user check failed:', error);
    process.exit(1);
  });
