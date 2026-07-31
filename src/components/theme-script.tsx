/**
 * Applies the resolved theme to <html> *before* first paint, so a dark-mode
 * visitor never gets a white flash. Runs synchronously in <head>.
 *
 * Dark mode is an account feature. The only control that writes the stored
 * value is the theme picker on /account, so a stored "light"/"dark" already
 * means "a signed-in person chose this" and is always honoured — including on
 * the marketing and invite pages, so navigating between them doesn't flip the
 * page out from under them.
 *
 * With nothing stored we fall back to the OS preference *only for someone with
 * a session*. An anonymous visitor gets light, whatever their device says:
 * that's what makes dark mode a thing you get by signing up rather than a thing
 * the landing page does at random. The session check is presentation-only and
 * reads cookie presence, exactly like `SiteHeaderCta` — nothing is authorised
 * on the strength of it, so a stale cookie costs a wrong background, not access.
 *
 * Note the doubled backslashes: this is a template literal, where `\d` would
 * collapse to a bare `d` and quietly break the cookie match.
 */
const script = `(function(){
var e=document.documentElement;
function apply(d){e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}
function stored(){try{return localStorage.getItem("theme");}catch(_){return null;}}
function member(){return document.cookie.split("; ").some(function(c){return /^sb-.+-auth-token(\\.\\d+)?$/.test(c.split("=")[0]);});}
var m=window.matchMedia("(prefers-color-scheme: dark)");
var s=stored();
apply(s?s==="dark":member()&&m.matches);
m.addEventListener("change",function(ev){if(!stored())apply(member()&&ev.matches);});
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
