const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { firebase } = require("./env");

if (firebase.projectId && !getApps().length) {
  initializeApp({ credential: cert(firebase) });
}

module.exports = {
  isReady: () => getApps().length > 0,
  messaging: () => getMessaging(),
};
