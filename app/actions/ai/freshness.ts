"use server";

export async function freshness(date?: Date) {
  if (!date) {
    return { exists: false };
  }

  const ageDays =
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);

  return {
    exists: true,
    lastUpdated: date.toISOString(),
    ageDays: Math.round(ageDays),
    isStale: ageDays > 180,
  };
}

