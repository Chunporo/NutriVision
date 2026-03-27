set shell := ["bash", "-cu"]

default:
  @just --list

install:
  (cd backend && uv sync)
  (cd nutrivision-mobile && bun install)

env:
  test -f backend/.env || cp backend/.env.example backend/.env
  test -f nutrivision-mobile/.env || cp nutrivision-mobile/.env.example nutrivision-mobile/.env

backend:
  (cd backend && uv run uvicorn nutrivision_backend.main:app --app-dir src --host 0.0.0.0 --reload --port 8000)

mock-ai:
  (cd backend && uv run python mock_ai.py)

seed:
  (cd backend && uv run python seed.py)

backend-smoke:
  (cd backend && uv run python -c "from fastapi.testclient import TestClient; from nutrivision_backend.main import app; c=TestClient(app); r=c.get('/health'); print(r.status_code, r.json()['status'])")

mobile:
  (cd nutrivision-mobile && bun run start)

android:
  (cd nutrivision-mobile && export ANDROID_HOME=$HOME/Android/Sdk && export PATH=$PATH:$ANDROID_HOME/platform-tools && bun run android)

android-go:
  (cd nutrivision-mobile && export ANDROID_HOME=$HOME/Android/Sdk && bun run start -- --go)

# USB debugging via physical cable
android-go-usb:
  export ANDROID_HOME=$HOME/Android/Sdk && export PATH=$PATH:$ANDROID_HOME/platform-tools && \
  adb reverse tcp:8081 tcp:8081 && \
  adb reverse tcp:8000 tcp:8000 && \
  (cd nutrivision-mobile && bun run start -- --go --localhost)

# Kill server and re-apply ports (best for flaky connections)
android-go-usb-recover:
  export ANDROID_HOME=$HOME/Android/Sdk && export PATH=$PATH:$ANDROID_HOME/platform-tools && \
  adb kill-server && \
  adb start-server && \
  adb devices && \
  adb reverse tcp:8081 tcp:8081 && \
  adb reverse tcp:8000 tcp:8000 && \
  (cd nutrivision-mobile && bun run start -- --go --localhost --clear)

# If USB reverse still fails, try this to use your Wi-Fi/Network IP (requires same network)
android-usb-ip:
  (cd nutrivision-mobile && export EXPO_PUBLIC_API_URL=http://192.168.96.130:8000 && bun run start -- --go --clear)

ios:
  (cd nutrivision-mobile && bun run ios)

lint:
  (cd nutrivision-mobile && bun run lint)

typecheck:
  (cd nutrivision-mobile && bunx tsc --noEmit)  

mobile-verify: typecheck lint

verify: backend-smoke mobile-verify

oauth-debug-keystore:
  mkdir -p ~/.android
  keytool -genkey -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"

oauth-sha1:
  keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android
