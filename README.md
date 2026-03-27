# NutriVision

NutriVision is an Android-first Expo app with a FastAPI backend for AI-powered food nutrition tracking.

## Structure

- `nutrivision-mobile/`: Expo Router mobile app
- `backend/`: FastAPI backend (uv)
- `backend/mock_ai.py`: local mock nutrition prediction API

## Quick Start

### Everyday commands with `just`

```bash
just env
just install
just backend
just mock-ai
just android
```

Useful helpers:

- `just verify` (backend smoke + mobile typecheck/lint)
- `just android-go` (Expo Go mode, no Android SDK/emulator required on local machine)
- `just android-go-usb` (Expo Go over USB via `adb reverse`, no LAN dependency)
- `just android-go-usb-recover` (fix common "failed to download remote update" issue)
- `just adb-fix` (restart adb daemon + list devices)
- `just android-sdk-check` (prints SDK env + detected paths)
- `just oauth-debug-keystore` (create debug keystore)
- `just oauth-sha1` (print SHA fingerprints)

If `just android` says Android SDK path is missing, set:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH
```

If you installed Android tools from distro packages and only have `adb` on PATH but no SDK folder,
Expo still cannot launch emulators automatically. In that case, use `just android-go` until full SDK is installed.

### Expo Go over USB (Android)

```bash
just android-go-usb
```

This runs:

- `adb reverse tcp:8081 tcp:8081`
- Expo in `--localhost` mode

On device, open Expo Go and enter URL manually if needed: `exp://localhost:8081`.

### 1) Backend API

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn nutrivision_backend.main:app --app-dir src --reload --port 8000
```

### 2) Mock AI service

```bash
cd backend
uv run python mock_ai.py
```

### 3) Mobile app

```bash
cd nutrivision-mobile
cp .env.example .env
bun install
bun run android
```

For Android emulator, `EXPO_PUBLIC_API_URL` should stay at `http://10.0.2.2:8000`.
Android package name for OAuth/client config is `com.nutrivision.mobile`.

## Features

- Credential signup/login
- Google token login endpoint support
- Add meal via image URL or camera/gallery upload
- Home, History, Add, Insights, Settings tabs
- Nutrition prediction proxied to configurable AI service URL

## Docs

- Google OAuth setup: `docs/google-oauth-setup.md`
- Expo Go USB (Android): `docs/expo-go-usb.md`
