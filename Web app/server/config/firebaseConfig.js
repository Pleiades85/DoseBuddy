const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let db = null;
let auth = null;
let bucket = null;

console.log('Initializing Firebase Config...');
// FORCE MOCK MODE FOR DEBUGGING
const FORCE_MOCK = false;

if (!FORCE_MOCK && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    if (!admin.apps.length) {
      console.log('Attempting to initialize Firebase Admin...');
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: 'med-app-54c16.appspot.com'
      });
      console.log('Firebase Admin Initialized successfully');
    }
    db = admin.firestore();
    auth = admin.auth();
    bucket = admin.storage().bucket();
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
    db = null;
    auth = null;
    bucket = null;
  }
} else {
  console.log('FORCING MOCK MODE (Credentials missing or disabled).');
  db = null;
  auth = null;
  bucket = null;
}

module.exports = { admin, db, auth, bucket };
