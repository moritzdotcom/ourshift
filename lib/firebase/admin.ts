import {
  initializeApp,
  getApps,
  applicationDefault,
  cert,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Fix escaped newlines
if (privateKey && privateKey.includes('\\n'))
  privateKey = privateKey.replace(/\\n/g, '\n');

if (!getApps().length) {
  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: privateKey! }),
    });
  } else {
    initializeApp({ credential: applicationDefault() });
  }
}

export const adminMessaging = getMessaging();
