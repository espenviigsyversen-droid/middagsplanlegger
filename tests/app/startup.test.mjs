import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(inlineScripts.length, 1);
const guard = inlineScripts[0][1];
assert.ok(html.indexOf(guard) < html.indexOf('<script type="module"'));
assert.match(html, /id="app-loading-retry" hidden/);
const appSource = await readFile(new URL("../../app.js", import.meta.url), "utf8");
const hideLoading = appSource.slice(appSource.indexOf("function hideLoadingScreen()"), appSource.indexOf("function syncMealPickerScrollLock("));

function createStartup() {
  const app = { innerHTML: "" };
  const spinner = { hidden: false };
  const message = { textContent: "Synker middagsplanen..." };
  const retry = { hidden: true, addEventListener: (name, callback) => { retry[name] = callback; } };
  const screen = {
    querySelector: () => spinner,
    classList: { add: (name) => { screen.className = name; } },
    remove: () => { screen.removed = true; },
  };
  const elements = { app, "app-loading-screen": screen, "app-loading-message": message, "app-loading-retry": retry };
  const timers = new Map();
  const listeners = new Map();
  let timerId = 0;
  let reloads = 0;
  let observer;
  const context = vm.createContext({
    document: {
      getElementById: (id) => elements[id],
      querySelector: (selector) => elements[selector.slice(1)],
    },
    window: {
      addEventListener: (name, callback, capture) => { listeners.set(name, { callback, capture }); },
      removeEventListener: (name, callback, capture) => {
        assert.equal(listeners.get(name)?.callback, callback);
        assert.equal(capture, true);
        listeners.delete(name);
      },
    },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe(target, options) { assert.equal(target, app); assert.equal(options.childList, true); }
      disconnect() { this.disconnected = true; }
    },
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    location: { reload: () => { reloads += 1; } },
  });
  vm.runInContext(guard, context);
  vm.runInContext(hideLoading, context);
  return {
    app, spinner, message, retry, screen, timers, listeners, observer, context,
    reloads: () => reloads,
    error: (target) => listeners.get("error")?.callback({ target }),
    render: () => { app.innerHTML = "<main>Kalender</main>"; observer.callback(); vm.runInContext("hideLoadingScreen()", context); },
  };
}

function assertFailed(startup) {
  assert.equal(startup.spinner.hidden, true);
  assert.equal(startup.message.textContent, "Appen kunne ikke starte. Sjekk nettforbindelsen og prøv igjen.");
  assert.equal(startup.retry.hidden, false);
}

const missingModule = createStartup();
assert.equal(missingModule.listeners.get("error").capture, true);
missingModule.error({ tagName: "SCRIPT", src: "app.js?v=92" });
assertFailed(missingModule);
missingModule.retry.click();
assert.equal(missingModule.reloads(), 1);

const runtimeError = createStartup();
runtimeError.error(runtimeError.context.window);
assertFailed(runtimeError);

const timeout = createStartup();
const startupTimer = [...timeout.timers.values()][0];
assert.equal(startupTimer.delay, 12000);
assert.equal(timeout.retry.hidden, true);
startupTimer.callback();
assertFailed(timeout);
timeout.render();
assert.equal(timeout.observer.disconnected, true);
assert.equal(timeout.listeners.has("error"), false);
assert.equal(timeout.screen.className, "hide");
const hideTimer = [...timeout.timers.values()].find(timer => timer.delay === 320);
hideTimer.callback();
assert.equal(timeout.screen.removed, true);

const successful = createStartup();
successful.render();
assert.equal(successful.retry.hidden, true);
assert.equal(successful.timers.size, 1); // Only the existing loading-screen removal timer remains.
assert.equal(successful.listeners.has("error"), false);

const alreadyRendered = createStartup();
alreadyRendered.app.innerHTML = "<main>Kalender</main>";
alreadyRendered.error(alreadyRendered.context.window);
assert.equal(alreadyRendered.retry.hidden, true);
assert.equal(alreadyRendered.timers.size, 0);

console.log("startup guard tests ok (inline syntax, errors, timeout, retry and late render)");
