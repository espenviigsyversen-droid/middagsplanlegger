export function createRecipeImporter({ firebaseApp, sdkVersion, loadSdk = version => import(`https://www.gstatic.com/firebasejs/${version}/firebase-functions.js`), online = () => navigator.onLine !== false }) {
  let callable;
  return async function importRecipe(input) {
    if (input?.mode === "url" && !input.url?.trim()) return { ok: false, code: "IMPORT_INPUT", message: "Lim inn en lenke først." };
    if (input?.mode === "text" && (input.text?.trim().length || 0) < 20) return { ok: false, code: "IMPORT_INPUT", message: "Lim inn oppskriftsteksten først." };
    if (!online()) return { ok: false, code: "OFFLINE", message: "Oppskriftsimport krever nett." };
    try {
      if (!callable) {
        const { getFunctions, httpsCallable } = await loadSdk(sdkVersion);
        callable = httpsCallable(getFunctions(firebaseApp, "europe-west1"), "importRecipe", { timeout: 70000 });
      }
      const result = await callable(input);
      if (!result?.data || typeof result.data.ok !== "boolean") throw new Error("invalid-response");
      return result.data;
    } catch (error) {
      return { ok: false, code: error?.code || "IMPORT_FAILED", message: error?.code === "functions/unauthenticated" || error?.code === "functions/permission-denied"
        ? "Innlogging eller tilgang mangler. Logg inn på nytt og prøv igjen."
        : error?.code === "functions/invalid-argument"
          ? "Kunne ikke bruke lenken eller teksten. Sjekk lenken, eller lim inn mer av oppskriftsteksten."
          : "Kunne ikke kontakte oppskriftsimport. Sjekk nettforbindelsen og prøv igjen." };
    }
  };
}
