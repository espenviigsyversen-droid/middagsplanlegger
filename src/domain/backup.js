export function buildBackup({ data, appVersion, familyId, now = new Date() }) {
  return {
    app: "middagsapp",
    exportVersion: 1,
    appVersion,
    familyId,
    exportedAt: new Date(now).toISOString(),
    data: structuredClone(data),
  };
}

export function backupFileName(now = new Date()) {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `middagsapp-backup-${year}-${month}-${day}.json`;
}
