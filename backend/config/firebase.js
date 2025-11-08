const admin = require('firebase-admin');

// Initialize Firebase Admin
if (process.env.NODE_ENV === 'production') {
  // In Cloud Run or local Docker with credentials
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    console.error('GOOGLE_CLOUD_PROJECT environment variable is required in production mode');
    throw new Error('GOOGLE_CLOUD_PROJECT is not set');
  }
  
  // If GOOGLE_APPLICATION_CREDENTIALS is set (local Docker), use it
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Using service account from GOOGLE_APPLICATION_CREDENTIALS');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId
    });
  } else {
    // Cloud Run uses Application Default Credentials automatically
    console.log('Using Application Default Credentials (Cloud Run)');
    admin.initializeApp({
      projectId: projectId
    });
  }
  
  console.log(`Firebase initialized for project: ${projectId}`);
} else {
  // In development, use service account key
  try {
    const serviceAccount = require('../../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.GOOGLE_CLOUD_PROJECT || serviceAccount.project_id
    });
    console.log('Firebase initialized with service account');
  } catch (error) {
    console.warn('Service account key not found, using default credentials');
    admin.initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT
    });
  }
}

const db = admin.firestore();

module.exports = {
  admin,
  db
};

