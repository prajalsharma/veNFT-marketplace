import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { SECTIONS, sectionForGroup } from "./sections";

type Entry = App.Locals["starlightRoute"]["sidebar"][number];

const containsCurrent = (e: Entry): boolean =>
  e.type === "link" ? e.isCurrent : e.entries.some(containsCurrent);

// Work out which section the page belongs to, record it (with the page's
// group, for the breadcrumb), and narrow the sidebar to that section.
// Pagination is computed by Starlight before this runs, so previous/next
// still walk the whole manual across section boundaries.
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const groups = route.sidebar.filter((e): e is Extract<Entry, { type: "group" }> => e.type === "group");
  const currentGroup = groups.find(containsCurrent);
  const section = currentGroup ? sectionForGroup(currentGroup.label) : undefined;

  context.locals.vezo = { section: section?.id ?? null, group: currentGroup?.label ?? null };

  if (route.hasSidebar && section) {
    route.sidebar = route.sidebar.filter((e) => e.type === "group" && section.groups.includes(e.label));
  }
});

export { SECTIONS };
