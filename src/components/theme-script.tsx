/**
 * Applies the resolved theme to <html> *before* first paint, so a dark-mode
 * visitor never gets a white flash. Runs synchronously in <head>.
 *
 * The stored value is only ever "light" or "dark"; its absence means "follow
 * the system", in which case we also keep listening so a mid-session OS theme
 * change is picked up straight away.
 */
const script = `(function(){
var e=document.documentElement;
function apply(d){e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}
function stored(){try{return localStorage.getItem("theme");}catch(_){return null;}}
var m=window.matchMedia("(prefers-color-scheme: dark)");
var s=stored();
apply(s?s==="dark":m.matches);
m.addEventListener("change",function(ev){if(!stored())apply(ev.matches);});
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
