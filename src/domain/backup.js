import { emptyWeekServings } from "./weeks.js";

export function buildBackup({ data, appVersion, familyId, now = new Date() }) {
  const copy = structuredClone(data);
  if (Number(String(appVersion).replace(/^v/, "")) >= 106) {
    const weeks = new Set(["plansByWeek", "lockedPlansByWeek", "dayTypesByWeek", "servingsByWeek", "dayModesByWeek", "dayNotesByWeek"]
      .flatMap(key => Object.keys(copy[key] || {})));
    copy.servingsByWeek = Object.fromEntries([...weeks].map(week => [week, { ...emptyWeekServings(), ...copy.servingsByWeek?.[week] }]));
  }
  return {
    app: "middagsapp",
    exportVersion: 1,
    appVersion,
    familyId,
    exportedAt: new Date(now).toISOString(),
    data: copy,
  };
}

export function backupFileName(now = new Date()) {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `middagsapp-backup-${year}-${month}-${day}.json`;
}
