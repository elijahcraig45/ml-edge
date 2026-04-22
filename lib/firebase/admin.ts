import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = getProjectId();

  if (!projectId) {
    return null;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  return initializeApp({
    credential:
      clientEmail && privateKey
        ? cert({
            projectId,
            clientEmail,
            privateKey,
          })
        : applicationDefault(),
    projectId,
  });
}

export function getAdminFirestore() {
  const app = getFirebaseAdminApp();

  return app ? getFirestore(app) : null;
}
