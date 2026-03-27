# Expo Go over USB (Android)

Use this when you want Expo Go without local network discovery.

## Prerequisites

- Android phone with Developer Options enabled
- USB debugging enabled
- `adb` available in terminal

## Quick command

From repo root:

```bash
just android-go-usb
```

This command runs:

1. `adb devices`
2. `adb reverse tcp:8081 tcp:8081`
3. `expo start --go --localhost`

## Manual flow

```bash
adb devices
adb reverse tcp:8081 tcp:8081
cd nutrivision-mobile
bun run start -- --go --localhost
```

Open Expo Go on device and enter URL manually if needed:

```text
exp://localhost:8081
```

## Troubleshooting

### `adb devices` is empty

- Reconnect cable
- Set USB mode to File Transfer
- Revoke USB debugging authorizations on device and reconnect
- Accept RSA fingerprint prompt on device

### `java.io.IOException: failed to download remote update`

This means Expo Go cannot reach Metro bundle URL from the device.

Use the recovery command:

```bash
just android-go-usb-recover
```

Manual equivalent:

```bash
adb kill-server
adb start-server
adb devices
adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
cd nutrivision-mobile
bun run start -- --go --localhost --clear
```

Then in Expo Go, reopen the same project URL (`exp://localhost:8081`).

### Device shows `unauthorized`

- Accept the computer prompt on phone
- Run `adb kill-server && adb start-server`, reconnect, then `adb devices`

### Reload after reconnect

If cable reconnects, run reverse again:

```bash
adb reverse tcp:8081 tcp:8081
```

### iOS note

Expo Go USB-only flow with `adb reverse` is Android-specific.
For iOS OAuth and native redirect testing, use a development build.
