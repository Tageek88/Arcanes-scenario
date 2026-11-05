# Tutorial (interactive tours) — developer notes

Three guided tours, started from Settings › Tutoriel. A tour NEVER makes the user use the app: it navigates, shows an element, opens and closes what it needs, and explains. The explanation bubble sits beside the element, never over it, and there is no dimming veil.

## Files
- `src/config/tutorials.js`: `TOURS` (`tour-1` empty app, `tour-2` secondary features, `tour-3` advanced features), `getTour`, `stepsFor(tour, mobile)`. A tour with `needsDemo: true` adds and selects the demo campaign first.
- Step: `{ id, route?, target? | selector? + selectorText?, side?, only? ("mobile"|"desktop"), title, text, run?: [{ demo, args }], undo?: [{ demo, args }] }`. `target` is a `data-tutorial` value; `selector` is CSS (use it when the page has no anchor); `selectorText` is a text the element must contain. `run` starts on arrival, `undo` when leaving (close what `run` opened). Anything that opens a dialog MUST have an `undo`.
- `src/components/Tutorial/`: `TutorialProvider` (state, navigation, `run`/`undo`, demo enter/leave, auto-start of tour-1 once for someone with no completed tour), `TutorialOverlay` (ring + bubble, placement from `lib/tutorial/placement.js`, docked bar on mobile), `TutorialCenter` (Settings: tours list, reset, demo campaign add/remove), `useTutorial`.
- `src/lib/tutorial/dom.js`: `targetSpec`, `findVisible`, `waitForVisible` and the generic actions `dom.click` ({ selector | selectors, text, skipIf, blur }) and `dom.closeDialog` (Escape). `blur` drops the cursor after a dialog opens so the Android keyboard does not hide the screen.
- `src/lib/context/tutorialBridge.js` + `src/hooks/useDemoAction.js`: a page declares an action with `useDemoAction("name", handler)`; the tour calls it by name (`runDemoAction`, never throws, waits for the page to declare it). Prefer `dom.click` on existing elements; add a page action only when a click cannot do it (example: `home.openCampaignDialog`).
- `src/lib/services/demoTour.js`: `enterDemo` (import the demo campaign, remember the user's campaign, select the demo and check that the choice holds against the `useCampaigns` reload) and `leaveDemo` (restore the user's campaign if it still exists).
- Demo campaign: `src/data/demoCampaign.json` (fixed uuid5 ids), `lib/meta/demoCampaign.js`, `lib/meta/demoDates.js` (session dates are recomputed at import), `lib/services/demoCampaign.js` (`importDemoCampaign`, `removeDemoCampaign`, one transaction, idempotent), `hooks/useDemoCampaign.js`.
- Storage: `utils/tutorialStorage.js` keeps only completed tours and the auto-start flag.

## Rules
- Texts are French and were approved one by one. Do not reword them without asking.
- Each tour step must point at something that exists. `tests/tours.test.js` checks anchors, demo action names, scene/character/table ids and NPC/location names cited in selectors, mobile/desktop variants, and that dialog openers have an `undo`. Add a step → run `npm test`.
- Renaming a UI label or an `aria-label` used in a selector (`Modifier <name>`, `Tirer une entrée de <table>`, tab names, placeholders, `title="Changer le statut"`, `title^="Imprimer"`) breaks the tour: update `tutorials.js` in the same change.
- Changing the demo campaign (ids, names, session titles) → update the selectors in `tutorials.js`; the test catches most cases.
- The demo campaign is user data: it is in backups, and removing it deletes everything it contains (nothing goes to the trash).
- Radix modal dialogs dismiss on outside pointerdown/focus: the bubble is a portal and stops propagation of both. Escape is deliberately not bound by the tour.
- A step that depends on a feature only shown in some states (for example the « Toutes les campagnes » switch needs 2+ campaigns) simply shows its bubble without a ring after 1.2 s.
