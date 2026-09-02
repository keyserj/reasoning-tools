/* Shared index of the topic-landing wireframe versions.
 *
 * Only the *list* lives here - the one thing that grows with every version and
 * would otherwise have to be copied into every file. Each wireframe still holds
 * its own "What's new" list inline, because that's a per-version fact: written
 * once when the version is cut, never edited afterwards.
 *
 * Loaded with a plain <script src>, which works over file:// as well as over a
 * served directory. If a wireframe is opened without this file next to it, the
 * version switcher hides itself and nothing else about the page changes.
 *
 * To add a version: append one entry here, and copy the newest wireframe to
 * topic-landing-v<N>.html with its own CURRENT_VERSION + "What's new" list.
 */
window.WIREFRAME_VERSIONS = [
  { v: "1", desc: "first pass at the topic-landing state" },
  { v: "2", desc: "layered diagram, smooth score gradients" },
  { v: "3", desc: "focus &amp; inspect: claim inspector, color key" },
  { v: "4", desc: "hard color bands, per-question views, resizable split" },
];
