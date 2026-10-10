import { useLocation } from "wouter";

// Keeps a dashboard's tab in the URL (/client/questions, /admin/projects), so each tab
// has its own link, the back button works and a refresh stays on the same tab.
export function useUrlTab<T extends string>(base: string, tabs: readonly T[], fallback: T) {
  const [location, setLocation] = useLocation();
  const segment = location.slice(base.length).replace(/^\/+/, "").split("/")[0] as T;
  const tab = tabs.includes(segment) ? segment : fallback;
  const setTab = (next: T) => {
    if (next === tab) return;
    setLocation(next === fallback ? base : `${base}/${next}`);
    window.scrollTo(0, 0);
  };
  return [tab, setTab] as const;
}
