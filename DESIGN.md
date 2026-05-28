# DESIGN: Sensor Node Hardware

**Companion to** [PRD.md](PRD.md) · **Date:** 2026-05-26

## 1. Enclosure

Wall-adhered housing with the C1001 mounted on the front via the ball-joint chain (joint plate → 18 mm ball → lock nut → cropped 3-leg adapter → L-bracket holder). Print and assembly details in [PRINT-PLAN.md](PRINT-PLAN.md).

## 2. Circuit Topology

```
USB-C wall ──> Feather V2 USB-C port
                Feather USB pin ──> C1001 (5V, GND)
                Feather 3V3 pin ──> BME280, mic, LDR
                Feather TX2/RX2 ──> C1001 UART
                Feather SDA/SCL ──> BME280
                Feather A2 ──> SPW2430 mic (analog)
                Feather A3 ──> Photoresistor + 10kΩ pull-down
                Feather D13 ──> LED + 330Ω
                Feather D14 <── Push button (INPUT_PULLUP)
```

No battery, no PMIC, no boost — Feather V2 directly powers everything from the USB-C wall.

## 3. Pin Map (Feather V2)

| Function | Pin | Notes |
|---|---|---|
| C1001 UART | TX2 / RX2 | HW Serial2 @ 115200; keeps USB serial free for debug |
| BME280 | SDA / SCL | I²C @ 0x76 |
| SPW2430 mic | A2 (ADC1) | Analog audio → onboard RMS → dB SPL |
| Photoresistor | A3 (ADC1) | With 10 kΩ pull-down |
| Status LED | D13 | Active high, 330 Ω series |
| Push button | D14 | INPUT_PULLUP |
| 5 V to C1001 | USB pin | Passthrough from USB-C wall power |

ESP32 ADC2 conflicts with Wi-Fi — both analog sensors are on ADC1 pins (A2, A3).

## 4. Open Items

- Mic dB SPL calibration constant — set during firmware bring-up by comparing to a phone SPL app under known sound levels.
- Cable routing from C1001 through the ball joint back to the breadboard — use a 4-wire cable, leave a small service loop.
