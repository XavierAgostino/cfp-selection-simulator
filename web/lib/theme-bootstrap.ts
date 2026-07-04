export const THEME_STORAGE_KEY = "selection-room-theme";
export const LEGACY_THEME_STORAGE_KEY = "theme";

/** Blocking head script: default dark, ignore legacy light-only key. */
export const themeBootstrapScript = `(function(){try{var k="${THEME_STORAGE_KEY}",l="${LEGACY_THEME_STORAGE_KEY}";var t=localStorage.getItem(k);if(!t){t="dark";localStorage.setItem(k,t);localStorage.removeItem(l)}document.documentElement.classList.toggle("dark",t!=="light")}catch(e){document.documentElement.classList.add("dark")}})();`;
