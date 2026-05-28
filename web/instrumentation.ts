export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrate } = await import("./lib/migrate");
    await migrate().catch((e) => console.error("[migrate]", e));
    const { startMqtt } = await import("./lib/mqtt");
    startMqtt();
  }
}
