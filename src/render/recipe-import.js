import { socialRecipeSource } from "../domain/meal-editor.js";

function importIcon(name) {
  const paths={link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',text:'<path d="M4 6h16M4 12h16M4 18h10"/>',camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3Z"/><circle cx="12" cy="13" r="4"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/>',check:'<path d="m5 12 4 4L19 6"/>'};
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||'')+'</svg>';
}

export function renderRecipeImport({isNew=false,meal={},recipeImport={},aiKeyStatus=null,aiKeyMessage="",isAdmin=false,importAvailable=false,escapeHtml=String}) {
  const expanded=recipeImport.expanded ?? (isNew || recipeImport.pending || recipeImport.busy || recipeImport.showText || recipeImport.showImages || Boolean(meal.recipeUrl && !meal.ingredients?.length && !meal.steps?.length));
  if (!expanded) return '<button class="import-expand" type="button" data-import-expand aria-expanded="false">'+importIcon('link')+'<span>Fyll ut fra lenke, bilde eller tekst</span><span aria-hidden="true">›</span></button>';
  const tab=recipeImport.tab || (recipeImport.showImages ? 'image' : recipeImport.showText ? 'text' : 'url');
  const busy=recipeImport.busy || recipeImport.preparing, images=recipeImport.images || [];
  const usable=importAvailable && aiKeyStatus?.configured && aiKeyStatus.status!=='invalid';
  const social=socialRecipeSource(recipeImport.url);
  const modes=[['url','link','Lenke'],['image','image','Bilde'],['text','text','Tekst']];
  return `
  <section class="recipe-import-panel" aria-label="Fyll ut automatisk">
    <div class="import-heading"><div><h3>Fyll ut automatisk</h3><p>Hent ingredienser og fremgangsmåte fra</p></div>${!isNew?'<button class="text-action" type="button" data-import-collapse aria-expanded="true" '+(busy?'disabled':'')+'>Lukk</button>':''}</div>
    <div class="import-modes">${modes.map(([key,icon,label])=>'<button class="import-mode" type="button" data-import-mode="'+key+'" aria-pressed="'+(tab===key)+'" '+(busy?'disabled':'')+'>'+importIcon(icon)+'<span>'+label+'</span></button>').join('')}</div>
    ${tab==='url'?`
      <label for="recipeImportUrl">Lenke til oppskriften</label>
      <input id="recipeImportUrl" class="input" type="url" inputmode="url" data-import-url value="${escapeHtml(recipeImport.url || '')}" maxlength="2000" placeholder="Lim inn lenken her" ${busy?'disabled':''}>
      <p class="import-explanation">Ingredienser og fremgangsmåte hentes, og lenken lagres med oppskriften.</p>
      <div data-import-url-feedback>${renderSocialImportNotice(recipeImport,meal,escapeHtml)}</div>
      <button class="button import-primary" type="button" data-import-fetch ${social?'hidden':''} ${busy || !usable || !String(recipeImport.url||'').trim()?'disabled':''}>Hent oppskrift</button>
    `:tab==='image'?`
      <p class="import-explanation">Kokebok, skjermbilde eller bilde av en lapp. Inntil fire bilder, for eksempel når oppskriften går over flere sider.</p>
      <div class="import-image-grid">${images.map((_,index)=>'<div class="import-image-tile"><span>Bilde '+(index+1)+'</span><button type="button" data-import-remove-image="'+index+'" aria-label="Fjern bilde '+(index+1)+'" '+(busy?'disabled':'')+'>×</button></div>').join('')}${images.length<4?'<button class="import-image-add" type="button" data-import-pick-images aria-label="Legg til bilde" '+(busy||!usable?'disabled':'')+'>+</button>':''}</div>
      <input id="recipeImportImages" class="visually-hidden" aria-label="Velg bilder" tabindex="-1" type="file" accept="image/*" multiple data-import-image-files ${busy||!usable?'disabled':''}>
      <button class="import-image-picker" type="button" data-import-pick-images aria-controls="recipeImportImages" ${busy||!usable?'disabled':''}>${importIcon('camera')} Velg bilder eller ta bilde</button>
      <button class="button import-primary" type="button" data-import-images ${busy||!usable||!images.length?'disabled':''}>Hent fra ${images.length} ${images.length===1?'bilde':'bilder'}</button>
    `: `
      <label for="recipeImportText">Oppskriftstekst</label><textarea id="recipeImportText" class="textarea" data-import-text maxlength="20000" ${busy?'disabled':''}>${escapeHtml(recipeImport.text || '')}</textarea>
      <button class="button import-primary" type="button" data-import-interpret ${busy||!usable||String(recipeImport.text||'').trim().length<20?'disabled':''}>Hent fra tekst</button>
    `}
    ${!aiKeyStatus || !aiKeyStatus.configured || aiKeyStatus.status==='invalid'?`<p role="status">${!importAvailable?'Oppskriftsimport krever innlogging og nett.':!aiKeyStatus?escapeHtml(aiKeyMessage||'Kontrollerer OpenAI-tilkoblingen …'):aiKeyStatus.status==='invalid'?'OpenAI-nøkkelen virker ikke.':'Oppskriftsimport er ikke satt opp.'}</p>${isAdmin?'<button class="button secondary" type="button" data-open-ai-settings>Åpne AI-innstillinger</button>':'<p>Be en administrator legge inn OpenAI-nøkkel.</p>'}`:''}
        ${!importAvailable && aiKeyStatus?.configured && aiKeyStatus.status!=="invalid" ? '<p class="field-hint">Oppskriftsimport krever innlogging og nett.</p>' : ""}
        ${recipeImport.preparing ? '<p role="status">Klargjør bilder …</p>' : ""}
        ${recipeImport.busy ? `<p role="status">${recipeImport.mode === "image" ? "Leser bildene … Det kan ta opptil et minutt." : "Henter oppskrift … Det kan ta opptil et halvt minutt."}</p>` : ""}
        ${recipeImport.message && !(recipeImport.pending && recipeImport.message === "Ingenting ble endret.") ? `<p role="status">${escapeHtml(recipeImport.message)}</p>` : ""}
        ${recipeImport.pending ? `<div class="recipe-import-choice" data-import-choice role="group" aria-labelledby="recipeImportChoiceTitle">
          <h4 id="recipeImportChoiceTitle">Ikke alt ble byttet</h4>
          <p role="status">Oppskriften hadde ${recipeImport.pending.conflictIngredients && recipeImport.pending.conflictSteps ? "ingredienser og fremgangsmåte fra før, og de står urørt" : recipeImport.pending.conflictIngredients ? "ingredienser fra før, og de står urørt" : "fremgangsmåte fra før, og den står urørt"}.
          Importen fant ${[recipeImport.pending.conflictIngredients ? `${recipeImport.pending.recipe.ingredients?.length || 0} ingredienser` : "", recipeImport.pending.conflictSteps ? `${recipeImport.pending.recipe.steps?.length || 0} steg` : ""].filter(Boolean).join(" og ")}.</p>
          <div class="button-row"><button class="button" type="button" data-import-replace>Bytt til de importerte</button>
          <button class="button secondary" type="button" data-import-keep>Behold mine</button></div>
        </div>` : ""}
        ${recipeImport.warnings?.length ? `<ul>${recipeImport.warnings.map(message => `<li>${escapeHtml(message)}</li>`).join("")}</ul>` : ""}
        ${Number.isInteger(recipeImport.remainingToday) && recipeImport.remainingToday >= 0 && recipeImport.remainingToday <= 30 ? `<p role="status">${recipeImport.remainingToday} importer igjen i dag.</p>` : ""}

  </section>`;
}

export function renderSocialImportNotice(recipeImport,meal,escapeHtml=String) {
  const social=socialRecipeSource(recipeImport.url); if(!social)return '';
  const retained=String(meal.recipeUrl||'').trim()===String(recipeImport.url||'').trim() && Boolean(String(meal.recipeUrl||'').trim());
  return '<div class="import-social">'+importIcon('info')+'<p>'+escapeHtml(social)+' kan ikke hentes direkte. Lim inn teksten fra innlegget, eller ta et skjermbilde.</p><div><button class="import-social-action" type="button" data-import-mode="text">Bruk tekst</button><button class="import-social-action" type="button" data-import-mode="image">Bruk bilde</button></div></div>'
    +(retained?'<p class="import-source-confirmation">'+importIcon('check')+' Lenken er lagret som kilde på oppskriften.</p>':'');
}
