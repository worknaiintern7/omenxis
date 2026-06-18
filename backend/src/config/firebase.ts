import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : path.resolve(__dirname, './serviceAccountKey.json');
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (serviceAccountBase64) {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
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
