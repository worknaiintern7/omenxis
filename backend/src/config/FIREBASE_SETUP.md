# Firebase Service Account Key Setup

To enable Firebase Admin SDK (push notifications), you need to download your service account key:

## Steps:

1. Go to Firebase Console → https://console.firebase.google.com
2. Select project: **chessApplication** (chessapplication-14ced)
3. Click ⚙️ Project Settings → **Service accounts** tab
4. Click **"Generate new private key"**
5. Download the JSON file
6. Rename it to **serviceAccountKey.json**
7. Place it in this folder: `backend/src/config/serviceAccountKey.json`

## Project Details:
- Project ID: chessapplication-14ced
- Project Number: 1038790065894
- App ID: 1:1038790065894:android:62d6924bcdd23f60d2c527
- Package Name: com.chessApp.WorknAi

## IMPORTANT:
- Never commit serviceAccountKey.json to git
- It is already added to .gitignore
