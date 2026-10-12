# Local Android MQTT capture

This is the next required step for the missing live Zone-1/outdoor temperatures. The HTTP sensor response is a placeholder and the Home Assistant MQTT subscription is acknowledged but has received no application messages. A local app-runtime capture can show the exact publish/subscribe topics without sharing account access.

## Requirements

- Your own Android device with the official iLetComfort app, or an isolated Android emulator containing your own iLetComfort session.
- Android USB debugging and ADB on the PC.
- Frida tools on the PC and a matching `frida-server` on a **rooted** Android device/emulator. Version and CPU architecture must match. Do not root your everyday phone solely for this procedure; use an isolated emulator if the device is not rooted.
- This procedure does not need your password, certificates, private keys, or full account diagnostics. Never paste them into a chat or public issue.

## Install tools on Windows

In PowerShell:

```powershell
py -m pip install frida-tools
frida --version
adb devices
adb shell getprop ro.product.cpu.abi
```

Download the matching `frida-server` release from the official Frida releases page: https://github.com/frida/frida/releases . Match the exact version printed by `frida --version` and the phone's ABI.

For a rooted device, copy and start the server (replace the filename and ABI with the ones you actually downloaded):

```powershell
adb push .\frida-server-<version>-android-arm64 /data/local/tmp/frida-server
adb shell "su -c 'chmod 755 /data/local/tmp/frida-server; /data/local/tmp/frida-server >/data/local/tmp/frida-server.log 2>&1 &'"
frida-ps -Uai | findstr /i iletcomfort
```

If `su` is unavailable or Frida cannot list the app, stop here rather than changing phone security settings. A production Android app is normally not attachable on an unrooted phone. Use an isolated rooted emulator or ask for an alternative workflow.

## Record one controlled action

From the repository root, run:

```powershell
frida -U -f com.mbt.iletcomfort -l .\tools\frida_mqtt_capture.js --no-pause *> .\mqtt-capture.txt
```

The official app will launch under the probe. Sign in only in the official app if it requires it; the capture script does not hook login methods or print credentials.

1. Navigate to Zone 1 and note the displayed water temperature, outdoor temperature, target, and local time.
2. Leave the page open for about two minutes.
3. Change **only** the Zone-1 target by +1 °C once. Note the time and the new target.
4. Wait another two minutes. Do not touch other controls.
5. Press `Ctrl+C` in PowerShell to stop the capture, then restore the original target in the app.
6. Upload `mqtt-capture.txt` to this chat for analysis. Do not publish it on GitHub or attach it to a public issue.

The capture prints only topic shapes, event names, JSON key names, `messageType`, `commandHex`, and selected temperature/Zone-1 fields. Long numeric identifiers in topics are redacted. It deliberately excludes raw JSON envelopes and credential values.

## How to read the result

- If the app publishes on a different exact topic, we can add only that appliance-scoped topic to the HA probe.
- If the app receives live telemetry on a subscribed topic, we can correlate it with the same-time values and add a decoder only after the match is demonstrated.
- If the app uses no MQTT publish/subscribe path for those values, the trace will show the relevant topic boundary (or the absence of one) and we can investigate the actual API method instead.

Never widen the Home Assistant subscription to `#` or `+`; the broker does not guarantee per-appliance topic ACLs.
