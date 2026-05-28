# Firmware

Adafruit ESP32 Feather V2 · PlatformIO · Arduino framework.

## Setup

1. Install [PlatformIO](https://platformio.org/install) (VS Code extension recommended).
2. Copy `include/config.h.example` to `include/config.h` and fill in your Wi-Fi + HiveMQ credentials.
3. `pio run -t upload` to build and flash.
4. `pio device monitor` to view serial debug.

## What it does

- Connects to Wi-Fi, then to HiveMQ Cloud over TLS.
- Reads BME280 (temp/humidity/pressure), SGP30 (eCO₂/TVOC), photoresistor, microphone (dB SPL from 1024-sample RMS burst), and C1001 (presence, sleep state, breathing, heart rate, turnover, body movement, apnea events).
- Publishes a JSON payload to `yousef/sleep01/telemetry` every 10 s.
- Blinks the LED on D13 on each successful publish.

See [../TECH-SPEC.md](../TECH-SPEC.md) for full JSON schema and behavior details.
