# iLetComfort ATW Telemetry Test

Separate Home Assistant integration for investigating the ITS/BTRI C3 heat-pump model `171H120F`.

## What this test build does

- Uses the iLetComfort/Dollin cloud API and keeps the existing iLetComfort integration installed separately.
- Exposes only read-only sensor and binary-sensor entities; climate controls, switches, selects and numbers are not loaded.
- Applies the ATW 171H120F profile.
- Exposes a read-only **Zone 1 Heating Active** binary sensor based on the captured `0x04 → 0x05` status-bit change after heating was started on the test unit.
- Recognizes both the known Galmet placeholder frame and the repeated `03 <same byte> 00 00 00 00` sensor template observed on this unit.
- Reports untrusted sensor fields as unavailable instead of inventing values such as -35 °C.
- Uses one initial cloud snapshot during setup, then listens to exact appliance-scoped MQTT topics. It checks the confirmed C3 topic and the documented regional `dev`, `will`, and `hbt` topic variants; it does not poll every minute or subscribe to wildcards.

## Important limitation

This build does **not** make the missing outdoor/water sensor temperatures appear by itself. The observed sensor-query response does not carry trustworthy live measurements in this placeholder variant. The official app previously showed about 9 °C outdoor temperature and 55 °C tank temperature. The latest observed HA status frame decodes 50 °C tank temperature and a 44 °C DHW target; the app/HA tank reading was not simultaneous, so that difference still needs checking.

MQTT is enabled in the test build. Incoming JSON is inspected for temperature-like field names and values before the subtype 0x01 status decoder runs. Subscription acknowledgements are logged so we can distinguish a rejected topic from a quiet topic. The actual live-temperature source has not yet been identified. The new Zone 1 sensor is intentionally separate from compressor-running status and does not expose any control. This repository deliberately does not guess byte offsets or publish placeholder bytes as real measurements.

## Install with HACS

1. In Home Assistant, open **HACS → Integrations → ⋮ → Custom repositories**.
2. Add `https://github.com/gerocash/ha-iletcomfort-atwha-iletcomfort-atw` as category **Integration**.
3. Download **iLetComfort ATW Telemetry Test**.
4. Restart Home Assistant.
5. Add the new integration from **Settings → Devices & services → Add integration** and choose the **Europe (EU)** account region.

Use the existing account only when the official phone app is closed; the cloud has a single active account session. This is an independent config entry and does not overwrite the original `iletcomfort` folder, but the cloud account session may still conflict while account-based requests overlap.

## Safety

- This integration exposes no heat-pump control entities. It is telemetry-only.
- Never commit passwords, access tokens, private keys, certificates, appliance codes, or diagnostic exports.
- It does not replace or disable the original integration.

## Current status

Experimental test build `0.1.3` (MQTT-only, read-only). The placeholder-pattern fix is based on captured 171H120F response bytes and is intended to remove fabricated readings. A successful Home Assistant connection and valid live outdoor-temperature reading still need to be verified on the user's instance.
