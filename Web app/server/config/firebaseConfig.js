const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let db = null;
let auth = null;
let bucket = null;

console.log('Initializing Firebase Config...');

try {
  if (!admin.apps.length) {
    let credential;

    // Option 1: Service account JSON as env var (for Render/cloud deployment)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('Using FIREBASE_SERVICE_ACCOUNT env var...');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    }
    // Option 2: File path (for local development)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Using GOOGLE_APPLICATION_CREDENTIALS file...');
      credential = admin.credential.applicationDefault();
    }

    if (credential) {
      admin.initializeApp({
        credential,
        storageBucket: 'med-app-54c16.appspot.com'
      });
      console.log('Firebase Admin Initialized successfully');
      db = admin.firestore();
      auth = admin.auth();
      bucket = admin.storage().bucket();
    } else {
      console.log('No Firebase credentials found. Running in mock mode.');
    }
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
  db = null;
  auth = null;
  bucket = null;
}

module.exports = { admin, db, auth, bucket };
