# WIRING

**Project:** Contactless Sleep & Environment Monitor
**Companion to:** [TECH-SPEC.md](TECH-SPEC.md)

One card per part. Every pin listed.

## DFRobot C1001 (mmWave radar)

5 V power · UART @ 115200 baud · mounted on the ball-joint outside the housing.

| C1001 pin | Connects to |
|---|---|
| VIN | Feather **USB** pin (5 V passthrough) |
| GND | Breadboard **−** rail (GND) |
| TX | Feather **RX** pin |
| RX | Feather **TX** pin |

## BME680 (temp / humidity / pressure / gas)

3.3 V power · I²C @ default address `0x77`. Adafruit-style breakout: leave **CS and SDO unconnected** (internal pull-ups keep it in I²C mode at the default address).

| BME680 pin | Connects to |
|---|---|
| VIN (or VCC) | Breadboard **+** rail (3 V3) |
| GND | Breadboard **−** rail (GND) |
| SCK | Feather **SCL** |
| SDI | Feather **SDA** |
| SDO | (leave unconnected) |
| CS | (leave unconnected) |

## SPW2430 (analog MEMS microphone)

3.3 V power · analog output, ESP32 ADC1.

| Mic pin | Connects to |
|---|---|
| Vin | Breadboard **+** rail (3 V3) |
| GND | Breadboard **−** rail (GND) |
| DC | Feather **A2** (ADC1) |

## Photoresistor + 3 kΩ (voltage divider)

Analog output, ESP32 ADC1. Three pieces wired together on the breadboard. The 3 kΩ is two 1.5 kΩ resistors in series.

| Divider piece | Connects to |
|---|---|
| Photoresistor leg A | Breadboard **+** rail (3 V3) |
| Photoresistor leg B | Junction row (shared with 3 kΩ and A3) |
| Junction row | Feather **A3** (ADC1) |
| 3 kΩ leg A | Junction row (shared with photoresistor and A3) |
| 3 kΩ leg B | Breadboard **−** rail (GND) |

## Feather V2 — pin usage summary

Plug the Feather across the breadboard's center channel. The pins below are the ones we use; the rest stay unconnected.

| Feather pin | Connects to |
|---|---|
| USB | C1001 VIN (the only 5 V load) |
| 3V3 | Breadboard **+** rail (drives BME680, mic, LDR top) |
| GND | Breadboard **−** rail (shared ground for everything) |
| SDA | BME680 SDI |
| SCL | BME680 SCK |
| TX | C1001 RX |
| RX | C1001 TX |
| A2 | Mic DC |
| A3 | Photoresistor / 3 kΩ junction |
