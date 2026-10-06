export function createRecipeImporter({ firebaseApp, sdkVersion, loadSdk = version => import(`https://www.gstatic.com/firebasejs/${version}/firebase-functions.js`), online = () => navigator.onLine !== false }) {
  const callables = new Map();
  let sdk;
  return async function importRecipe(input) {
    if (input?.mode === "url" && !input.url?.trim()) return { ok: false, code: "IMPORT_INPUT", message: "Lim inn en lenke først." };
    if (input?.mode === "text" && (input.text?.trim().length || 0) < 20) return { ok: false, code: "IMPORT_INPUT", message: "Lim inn oppskriftsteksten først." };
    if (input?.mode === "image" && !input.images?.length) return { ok: false, code: "IMPORT_INPUT", message: "Velg minst ett bilde først." };
    if (!online()) return { ok: false, code: "OFFLINE", message: "Oppskriftsimport krever nett." };
    try {
      const timeout = input?.mode === "image" ? 130000 : 70000;
      if (!callables.has(timeout)) {
        sdk ||= await loadSdk(sdkVersion);
        callables.set(timeout, sdk.httpsCallable(sdk.getFunctions(firebaseApp, "europe-west1"), "importRecipe", { timeout }));
      }
      const result = await callables.get(timeout)(input);
      if (!result?.data || typeof result.data.ok !== "boolean") throw new Error("invalid-response");
      return result.data;
    } catch (error) {
      return { ok: false, code: error?.code || "IMPORT_FAILED", message: error?.code === "functions/unauthenticated" || error?.code === "functions/permission-denied"
        ? "Innlogging eller tilgang mangler. Logg inn på nytt og prøv igjen."
        : error?.code === "functions/invalid-argument"
          ? input?.mode === "image" ? "Kunne ikke bruke bildene. Prøv et annet bilde eller et skjermbilde."
            : "Kunne ikke bruke lenken eller teksten. Sjekk lenken, eller lim inn mer av oppskriftsteksten."
          : "Kunne ikke kontakte oppskriftsimport. Sjekk nettforbindelsen og prøv igjen." };
    }
  };
}
