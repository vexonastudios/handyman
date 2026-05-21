// Scheduler — loaded via Next.js instrumentation hook (instrumentation.js)
// Runs a node-cron job daily at the configured post time

let schedulerStarted = false;

export async function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Dynamically import node-cron (ESM compatible)
  const cron = (await import('node-cron')).default;
  const { getSetting } = await import('./db.js');

  console.log('[Scheduler] Starting daily post scheduler...');

  // Run every minute to check if it's time to post
  cron.schedule('* * * * *', async () => {
    try {
      const postTime = getSetting('post_time') || '09:00';
      const now = new Date();
      const [hour, minute] = postTime.split(':').map(Number);

      if (now.getHours() === hour && now.getMinutes() === minute) {
        console.log('[Scheduler] Triggering daily post...');
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/publish`, {
          method: 'POST',
          headers: { 'x-scheduler-secret': process.env.SCHEDULER_SECRET || 'handyman-scheduler' },
        });
        const data = await res.json();
        console.log('[Scheduler] Publish result:', data);
      }
    } catch (err) {
      console.error('[Scheduler] Error during scheduled publish:', err);
    }
  });

  console.log('[Scheduler] Scheduler is active.');
}
