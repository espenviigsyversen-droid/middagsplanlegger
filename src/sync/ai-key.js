export function sanitizeAiKeyStatus(data) {
  return { configured: data?.configured === true, masked: typeof data?.masked === "string" && /^sk-[^\s]…[^\s]{4}$/.test(data.masked) ? data.masked : "",
    status: ["connected", "invalid", "unavailable"].includes(data?.status) ? data.status : "unavailable",
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : null, canManage: data?.canManage === true,
    model: typeof data?.model === "string" ? data.model : "" };
}
export function createAiKeyClient({ firebaseApp, sdkVersion,
  loadSdk = version => import(`https://www.gstatic.com/firebasejs/${version}/firebase-functions.js`),
  online = () => navigator.onLine !== false }) {
  let sdkPromise;
  const callables = new Map();
  const formatMessage = "Nøkkelen ser ikke riktig ut. Den skal starte med sk- og ikke inneholde mellomrom.";
  async function call(action, input = {}) {
    if (!online()) return { ok: false, code: "OFFLINE", message: "OpenAI-innstillinger krever innlogging og nett." };
    try {
      if (!sdkPromise) sdkPromise = loadSdk(sdkVersion).catch(error => { sdkPromise = null; throw error; });
      const { getFunctions, httpsCallable } = await sdkPromise;
      if (!callables.has(action)) callables.set(action, httpsCallable(getFunctions(firebaseApp, "europe-west1"), action, { timeout: 35000 }));
      const { data } = await callables.get(action)(input);
      if (!data || typeof data.ok !== "boolean") throw new Error("Invalid response");
      return data.ok ? { ok: true, ...sanitizeAiKeyStatus(data), ...(typeof data.message === "string" ? { message: data.message } : {}) }
        : { ok: false, code: data.code, message: data.message || "Kunne ikke kontrollere OpenAI-tilkoblingen." };
    } catch (error) {
      if (error?.code === "functions/invalid-argument") return { ok: false, code: "KEY_FORMAT", message: formatMessage };
      if (["functions/unauthenticated", "functions/permission-denied"].includes(error?.code)) return { ok: false, code: "KEY_ACCESS", message: "Innlogging eller tilgang mangler. Logg inn på nytt og prøv igjen." };
      return { ok: false, code: "KEY_REQUEST_FAILED", message: "Kunne ikke kontakte serveren. Sjekk innlogging og nettforbindelse og prøv igjen." };
    }
  }
  return {
    status: () => call("aiKeyStatus"), test: () => call("aiKeyTest"), delete: () => call("aiKeyDelete"),
    saveFromInput(input) {
      // The raw value exists only in the outgoing request, never in app state.
      const value = input?.value || "";
      if (input) input.value = "";
      const key = value.trim();
      if (!key) return Promise.resolve({ ok: false, code: "KEY_FORMAT", message: "Lim inn nøkkelen først." });
      if (!/^sk-\S{17,297}$/.test(key)) return Promise.resolve({ ok: false, code: "KEY_FORMAT", message: formatMessage });
      return call("aiKeySave", { key });
    },
  };
}
