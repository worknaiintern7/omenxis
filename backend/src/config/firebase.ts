import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, './serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    // Use service account key file if available
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    // Fallback to application default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
}

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data,
    });
  } catch (error) {
    console.error('Push notification error:', error);
  }
};

export default admin;
