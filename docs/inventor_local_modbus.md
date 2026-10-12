# Inventor Matrix Split: local Modbus telemetry (read-only)

Target unit: Inventor Matrix Split ATS04S / HU060S3, cloud model code SN8 `171H120F`.

## Finding

The iLetComfort HTTP sensor response for this unit is a repeated placeholder frame, so its cloud sensor decoder cannot recover the live outdoor, water inlet/outlet, compressor frequency, pressure and energy readings. The wired controller has a separate local Modbus RTU interface over RS-485. Public Midea M-Thermal split documentation and a working community configuration for a `171H120F` controller describe the same register family.

Relevant source references:

- Inventor ATS04S/HU060S3 wired-controller manual: https://www.manualslib.de/manual/1287671/Inventor-Ats04S.html
- Inventor's 2026 Matrix Split catalog lists the ATS04S/HU060S3 among the models with Modbus as standard: https://www.mitsubishi-lumelco.com/wp-content/uploads/2026/03/Tarifa_Aerotermia-2026.pdf
- Midea M-Thermal Split service manual, Modbus function / switch S3: https://www.midea.com.ua/sites/default/files/downloadables-documents/pdf/sm-midea-series-split-m-thermal-heat-pump-20200424-v31.pdf
- Community Home Assistant register YAML, developed against a 171H120F wired controller: https://github.com/timlaing/modbus_local_gateway/blob/main/custom_components/modbus_local_gateway/device_configs/midea_heat_pump.yaml
- Register table / sensor documentation: https://taphome.com/de/compatibility/midea-heat-pump/
- Official Home Assistant Modbus integration: https://www.home-assistant.io/integrations/modbus/

Registers documented for this platform include compressor frequency H:100, operating state H:101, fan speed H:102, water inlet/outlet H:104/H:105, outdoor temperature H:107, DHW tank temperature H:115, high/low refrigerant pressure H:116/H:117, compressor runtime H:122, fault code H:124, water flow H:138, power H:140, energy words H:143/H:144 and COP H:151.

## Hardware path

`Wired controller H1/H2 (RS-485) → RS-485 gateway → LAN → Home Assistant Modbus`.

The wired controller and hydraulic module must remain connected as designed. Use the H1/H2 terminals on the **wired controller**, not similarly named terminals on the main PCB that may be used for cascade/other communications. Never connect RS-485 signal wires to an unknown terminal block.

For an Ethernet gateway, choose one that supports **Modbus TCP server/gateway mode** and configure 9600 baud, 8 data bits, no parity, 1 stop bit (8N1), with its TCP server port set to 502. Then edit the sample YAML: change `host` to the gateway IP and set `slave` to the actual Modbus address of the controller.

## Slave-ID note

Do not move switch S3 while powered. The older M-Thermal Split service manual says S3 position 0 maps to Modbus address 16; the TapHome profile for a later M-Thermal A-series family lists position 0 as address 1. Because controller/board revisions can differ, verify this on the actual HU060S3/controller manual. The sample file assumes address 16 as a starting point for the older M-Thermal Split manual; if no reply is received, check the physical S3 position and exact controller manual before changing the configuration. No writes are configured in the sample.

## Home Assistant

1. Make a Home Assistant backup before changing YAML.
2. Install/configure the RS-485 Ethernet gateway and confirm it is reachable from Home Assistant.
3. Start with `modbus/inventor_modbus_address_probe.yaml` and change the IP; this probes only read-only register 131 at slave IDs 1 and 16.
4. Once one probe value returns the controller version, remove the probe block and use `modbus/inventor_ats04s_readonly.yaml` with the responding `slave:` ID and the same gateway IP. Merge the `modbus:` block into an existing `modbus:` section if one already exists; do not create two top-level `modbus:` keys.
5. Run **Developer Tools → YAML → Check configuration**, then restart Home Assistant.
6. First confirm that `Inventor Wired Controller Version` returns a plausible value and that `Inventor Outdoor Temperature` matches the temperature shown on the controller. Only then trust the other readings.

This YAML intentionally defines **sensors only**. It contains no Modbus switches, numbers, climate, or writes. The register map is strong candidate evidence for the 171H120F controller family, but it has not yet been tested against this specific ATS04S/HU060S3 installation; exact controller version and register responses must be validated on the physical bus.
