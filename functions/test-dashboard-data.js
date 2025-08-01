const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'rankpilot-h3jpc'
});

const db = admin.firestore();

// Test user for dashboard verification
const TEST_USER_ID = "Y0hv244mtsYk4dwsxBCS1xBOhab2"; // Starter User with 5 analyses, 17 keyword records

async function testDashboardDataIntegration() {
  console.log('🔍 TESTING DASHBOARD DATA INTEGRATION\n');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    console.log(`\n📋 Testing data retrieval for User ID: ${TEST_USER_ID}`);
    
    // 1. Check NeuroSEO Analyses for SEO Score Trend
    console.log('\n1. 🧠 CHECKING NEUROSEO ANALYSES (SEO Score Data):');
    const analysesRef = db.collection('neuroSeoAnalyses');
    const analysesQuery = analysesRef
      .where('userId', '==', TEST_USER_ID)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc')
      .limit(5);
    
    const analysesSnapshot = await analysesQuery.get();
    
    if (analysesSnapshot.size > 0) {
      console.log(`   ✅ Found ${analysesSnapshot.size} completed analyses`);
      
      analysesSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const score = data.summary?.overallScore || 'N/A';
        const date = data.completedAt?.toDate?.()?.toISOString()?.split('T')[0] || 'N/A';
        console.log(`   📊 Analysis ${index + 1}: Score ${score} (${date})`);
      });
    } else {
      console.log('   ❌ No completed analyses found');
    }

    // 2. Check Keyword Research for Tracked Keywords
    console.log('\n2. 🔍 CHECKING KEYWORD RESEARCH (Keyword Tracking Data):');
    const keywordRef = db.collection('keywordResearch');
    const keywordQuery = keywordRef
      .where('userId', '==', TEST_USER_ID)
      .limit(5);
    
    const keywordSnapshot = await keywordQuery.get();
    
    if (keywordSnapshot.size > 0) {
      console.log(`   ✅ Found ${keywordSnapshot.size} keyword research records`);
      
      keywordSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const keywords = data.keywords?.length || 0;
        const query = data.query || 'N/A';
        const date = data.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || 'N/A';
        console.log(`   🔑 Research ${index + 1}: "${query}" (${keywords} keywords, ${date})`);
      });
    } else {
      console.log('   ❌ No keyword research found');
    }

    // 3. Check Projects for Active Projects Count
    console.log('\n3. 📁 CHECKING PROJECTS (Active Projects Count):');
    const projectsRef = db.collection('projects');
    const projectsQuery = projectsRef.where('userId', '==', TEST_USER_ID);
    
    const projectsSnapshot = await projectsQuery.get();
    console.log(`   📊 Active Projects: ${projectsSnapshot.size}`);
    
    if (projectsSnapshot.size > 0) {
      projectsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   📋 Project ${index + 1}: "${data.name}" (${data.domain || 'No domain'})`);
      });
    } else {
      console.log('   ⚠️  No projects created yet');
    }

    // 4. Simulate Dashboard Data Service Logic
    console.log('\n4. 🎯 SIMULATING DASHBOARD DATA SERVICE:');
    
    const currentScore = analysesSnapshot.size > 0 ? 
      (analysesSnapshot.docs[0].data().summary?.overallScore || 0) : 0;
    const previousScore = analysesSnapshot.size > 1 ? 
      (analysesSnapshot.docs[1].data().summary?.overallScore || currentScore) : currentScore;
    const change = currentScore - previousScore;
    
    console.log(`   📊 SEO Score: ${currentScore} (${change >= 0 ? '+' : ''}${change} change)`);
    console.log(`   🔍 Tracked Keywords: ${keywordSnapshot.size}`);
    console.log(`   📁 Active Projects: ${projectsSnapshot.size}`);
    
    // 5. Check if data would display in dashboard
    console.log('\n5. 🎨 DASHBOARD DISPLAY SIMULATION:');
    
    if (currentScore > 0) {
      console.log('   ✅ SEO Score Chart: Would show real trend data');
    } else {
      console.log('   ⚠️  SEO Score Chart: Would show "No analysis data yet" message');
    }
    
    if (keywordSnapshot.size > 0) {
      console.log('   ✅ Keyword Metrics: Would show real keyword data');
    } else {
      console.log('   ⚠️  Keyword Metrics: Would show zero values');
    }
    
    if (projectsSnapshot.size > 0) {
      console.log('   ✅ Projects Section: Would show real project data');
    } else {
      console.log('   ⚠️  Projects Section: Would show "No projects" state');
    }

  } catch (error) {
    console.error('\n❌ ERROR testing dashboard data:', error.message);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 Dashboard Data Integration Test Complete');
}

// Run the test
testDashboardDataIntegration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Dashboard data test failed:', error);
    process.exit(1);
  });
