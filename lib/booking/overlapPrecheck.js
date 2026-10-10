// UI precheck only. Database transaction is still required for concurrency safety.
const RULES = {
  '1': { days: [1,3,5], hour: 18 },
  '2': { days: [2,4,6], hour: 18 },
  '3': { days: [6,0], hour: 8 },
  '4': { days: [6,0], hour: 14 },
};
export function buildProposedSessions(slotId, count, now = new Date()) {
  const rule = RULES[slotId];
  if (!rule || ![10,20,30].includes(count)) throw new Error('Invalid booking');
  const result = [];
  // Iterate Vietnamese calendar dates using UTC arithmetic, never device timezone.
  const today = new Date(now.getTime() + 7*3600000);
  const startDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  for (let i = 0; i < 200 && result.length < count; i++) {
    const day = new Date(startDay + i*86400000);
    if (!rule.days.includes(day.getUTCDay())) continue;
    const start = startDay + i*86400000 + (rule.hour - 7)*3600000;
    if (start <= now.getTime()) continue;
    result.push({start_at: new Date(start).toISOString(), end_at: new Date(start + 2*3600000).toISOString()});
  }
  if (result.length !== count) throw new Error('Insufficient schedule');
  return result;
}
export function overlapsExistingSessions(proposed, existing) {
  return existing.some(s => {
    const start = Date.parse(s.scheduled_start);
    const end = Date.parse(s.scheduled_end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return true;
    return proposed.some(p => Date.parse(p.start_at) < end && Date.parse(p.end_at) > start);
  });
}
