export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMqtt } = await import("./lib/mqtt");
    startMqtt();
  }
}
