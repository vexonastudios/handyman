// Next.js instrumentation hook — runs once at server startup
// This is the correct place to initialize the background scheduler

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler.js');
    await startScheduler();
  }
}
