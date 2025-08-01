const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'rankpilot-h3jpc'
});

const db = admin.firestore();

async function testMissingIndexes() {
  console.log('🔍 TESTING SPECIFIC QUERIES TO IDENTIFY MISSING INDEXES\n');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const TEST_USER_ID = "Y0hv244mtsYk4dwsxBCS1xBOhab2"; // Starter User with data
  
  const queries = [
    {
      name: "NeuroSEO Analyses (status + userId + completedAt DESC)",
      test: async () => {
        const analysesRef = db.collection('neuroSeoAnalyses');
        const q = analysesRef
          .where('userId', '==', TEST_USER_ID)
          .where('status', '==', 'completed')
          .orderBy('completedAt', 'desc')
          .limit(5);
        return await q.get();
      }
    },
    {
      name: "NeuroSEO Analyses (userId + completedAt DESC)",
      test: async () => {
        const analysesRef = db.collection('neuroSeoAnalyses');
        const q = analysesRef
          .where('userId', '==', TEST_USER_ID)
          .orderBy('completedAt', 'desc')
          .limit(10);
        return await q.get();
      }
    },
    {
      name: "Keyword Research (userId only)",
      test: async () => {
        const keywordRef = db.collection('keywordResearch');
        const q = keywordRef
          .where('userId', '==', TEST_USER_ID)
          .limit(5);
        return await q.get();
      }
    },
    {
      name: "Projects (userId only)",
      test: async () => {
        const projectsRef = db.collection('projects');
        const q = projectsRef
          .where('userId', '==', TEST_USER_ID);
        return await q.get();
      }
    },
    {
      name: "NeuroSEO Analyses (userId + createdAt DESC)",
      test: async () => {
        const analysesRef = db.collection('neuroSeoAnalyses');
        const q = analysesRef
          .where('userId', '==', TEST_USER_ID)
          .orderBy('createdAt', 'desc')
          .limit(5);
        return await q.get();
      }
    }
  ];

  for (const query of queries) {
    try {
      console.log(`\n🧪 Testing: ${query.name}`);
      const result = await query.test();
      console.log(`   ✅ SUCCESS: Found ${result.size} documents`);
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      
      // Extract the Firebase index URL if present
      if (error.message.includes('create it here:')) {
        const indexUrl = error.message.split('create it here: ')[1]?.split('\n')[0];
        if (indexUrl) {
          console.log(`   🔗 Index URL: ${indexUrl}`);
        }
      }
      
      // Show the specific index needed
      if (error.message.includes('FAILED_PRECONDITION')) {
        console.log(`   📋 This query needs a composite index to work`);
      }
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 Index Test Complete');
}

// Run the test
testMissingIndexes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Index test failed:', error);
    process.exit(1);
  });
