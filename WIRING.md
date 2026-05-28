# WIRING

**Project:** Contactless Sleep & Environment Monitor
**Companion to:** [TECH-SPEC.md](TECH-SPEC.md) · [CIRCUIT.md](CIRCUIT.md)

One card per part. Every pin listed.

## DFRobot C1001 (mmWave radar)

5 V power · UART @ 115200 baud · mounted on the ball-joint outside the housing.

| C1001 pin | Connects to |
|---|---|
| VIN | Feather **USB** pin (5 V passthrough) |
| GND | Breadboard **−** rail (GND) |
| TX | Feather **RX** pin |
| RX | Feather **TX** pin |

## BME280 (temp / humidity / pressure)

3.3 V power · I²C @ address `0x76` (clone) or `0x77` (Adafruit) · pull-ups on-board · firmware auto-detects.

| BME280 pin | Connects to |
|---|---|
| VIN | Breadboard **+** rail (3 V3) |
| GND | Breadboard **−** rail (GND) |
| SDA | Feather **SDA** |
| SCL | Feather **SCL** |

## SPW2430 (analog MEMS microphone)

3.3 V power · analog output, ESP32 ADC1.

| Mic pin | Connects to |
|---|---|
| Vin | Breadboard **+** rail (3 V3) |
| GND | Breadboard **−** rail (GND) |
| DC | Feather **A2** (ADC1) |

## Photoresistor + 10 kΩ (voltage divider)

Analog output, ESP32 ADC1. Three pieces wired together on the breadboard.

| Divider piece | Connects to |
|---|---|
| Photoresistor leg A | Breadboard **+** rail (3 V3) |
| Photoresistor leg B | Junction row (shared with 10 kΩ and A3) |
| Junction row | Feather **A3** (ADC1) |
| 10 kΩ leg A | Junction row (shared with photoresistor and A3) |
| 10 kΩ leg B | Breadboard **−** rail (GND) |

## Status LED + 330 Ω

Heartbeat indicator — blinks on each successful MQTT publish.

| Part | Connects to |
|---|---|
| Feather **D13** | 330 Ω resistor leg A |
| 330 Ω resistor leg B | LED **anode** (long leg) |
| LED **cathode** (short leg) | Breadboard **−** rail (GND) |

## Feather V2 — pin usage summary

Plug the Feather across the breadboard's center channel. The pins below are the ones we use; the rest stay unconnected.

| Feather pin | Connects to |
|---|---|
| USB | C1001 VIN (the only 5 V load) |
| 3V3 | Breadboard **+** rail (drives BME280, mic, LDR top) |
| GND | Breadboard **−** rail (shared ground for everything) |
| SDA | BME280 SDA |
| SCL | BME280 SCL |
| TX | C1001 RX |
| RX | C1001 TX |
| A2 | Mic DC |
| A3 | Photoresistor / 10 kΩ junction |
| D13 | LED via 330 Ω resistor |
