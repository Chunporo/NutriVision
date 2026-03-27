# Google OAuth Setup for NutriVision

This guide configures Google OAuth for both the Expo mobile app and FastAPI backend.

## 1) Create Google Cloud OAuth credentials

1. Open Google Cloud Console and create/select a project.
2. Configure OAuth consent screen (External/Internal, app name, support email).
3. Create OAuth Client IDs:
   - Android client
   - iOS client
   - Web client

You need all three because Expo Auth Session expects platform-specific IDs.

## 2) Configure Expo app env

In `nutrivision-mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

Restart Expo after changing env values.

## 3) Configure backend env

In `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
GOOGLE_TOKENINFO_URL=https://oauth2.googleapis.com/tokeninfo
```

`GOOGLE_CLIENT_ID` is used for audience validation in `/auth/google`.

## 4) Android setup details

For Android OAuth client creation, provide:

- Package name: `com.nutrivision.mobile`
- SHA-1 fingerprint: from your debug/release keystore

When using Expo dev builds, ensure the Android client is created with the package/signing config of that build.

### Get SHA-1 for debug build

On Linux/macOS:

```bash
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android
```

Use the printed `SHA1` value in Google Cloud Android OAuth client settings.

### If `~/.android/debug.keystore` does not exist

Create it with Android default values, then list fingerprints:

```bash
mkdir -p ~/.android
keytool -genkey -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android
```

## 5) How sign-in works in this codebase

1. Mobile starts OAuth with `expo-auth-session` Google provider.
2. Google returns an ID token.
3. Mobile sends that token to backend `POST /auth/google`.
4. Backend verifies token using Google tokeninfo endpoint.
5. Backend checks token audience against `GOOGLE_CLIENT_ID` (if configured), then issues app JWT.

## 6) Test checklist

1. Start backend (`uvicorn`) and mock AI service.
2. Start Expo app.
3. On auth screen, tap **Continue with Google**.
4. Complete Google account consent.
5. Confirm user enters app and can access tabs.

## 7) Common issues

- `Google token audience mismatch`: backend `GOOGLE_CLIENT_ID` does not match token audience.
- OAuth popup closes with no login: check Expo env vars and restart Expo bundler.
- Android login fails only on real device: verify SHA-1 + package name used in Google Android client.

## 8) Expo Go testing policy for this app

- Expo Go is supported for credential auth testing (signup/login with email + password).
- Google OAuth is intentionally disabled in Expo Go UI for this project.
- Google OAuth should be tested using a development build or production build.
- For Android USB-only Expo Go usage, see `docs/expo-go-usb.md`.
