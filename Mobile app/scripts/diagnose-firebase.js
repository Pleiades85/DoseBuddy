const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// 1. Manually load .env file
console.log('--- Firebase Connection Diagnostic ---');
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: .env file not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
    envVars[key] = value;
  }
});

// 2. Check for required keys
const requiredKeys = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'
];

const missingKeys = requiredKeys.filter(k => !envVars[k]);
if (missingKeys.length > 0) {
  console.error('❌ ERROR: Missing keys in .env:', missingKeys.join(', '));
  process.exit(1);
}

console.log('✅ .env file read successfully');
console.log('   Project ID:', envVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID);

// 3. Initialize Firebase
const firebaseConfig = {
  apiKey: envVars.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: envVars.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: envVars.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.EXPO_PUBLIC_FIREBASE_APP_ID,
};

try {
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase App initialized');

  // 4. Test Firestore Connection
  console.log('Testing Firestore connection...');
  const db = getFirestore(app);
  
  // Try to fetch a non-existent document just to test connectivity
  const testRef = doc(db, 'test_connection', 'test');
  
  getDoc(testRef)
    .then(() => {
      console.log('✅ SUCCESS: Connected to Firestore!');
      console.log('   (The document might not exist, but the connection worked)');
    })
    .catch(error => {
      console.error('❌ CONNECTION FAILED:', error.code);
      console.error('   Message:', error.message);
      
      if (error.code === 'unavailable') {
        console.log('\nPossible causes:');
        console.log('- No internet connection');
        console.log('- Firewall blocking Firebase');
        console.log('- Incorrect Project ID');
      } else if (error.code === 'permission-denied') {
        console.log('\n✅ Connection worked, but permission denied (this is good! it means we reached the server)');
      }
    });

} catch (error) {
  console.error('❌ INITIALIZATION ERROR:', error.message);
}
