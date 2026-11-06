import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

type Entry = App.Locals["starlightRoute"]["sidebar"][number];

const containsCurrent = (e: Entry): boolean =>
  e.type === "link" ? e.isCurrent : e.entries.some(containsCurrent);

// Record the sidebar group the page sits in. The title block shows it as
// the small label above the page title. The sidebar itself shows every page.
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const group = route.sidebar.find((e) => e.type === "group" && containsCurrent(e));
  context.locals.vezo = { group: group?.label ?? null };
});
