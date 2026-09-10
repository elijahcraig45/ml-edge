/**
 * The site is now DS&A-first.
 *
 * The v1 curriculum, daily quiz, news and signal features still work and are
 * still deployed — they are reachable by URL, just not advertised, while the
 * new curriculum fills out. They come out of the codebase entirely once Tier
 * III is published; see the plan's "Archiving v1" sequence.
 */
export const navigationItems = [
  { href: "/learn", label: "Learn", icon: "GraduationCap" },
  { href: "/problems", label: "Problems", icon: "Target" },
  { href: "/interview", label: "Interview", icon: "Timer" },
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
] as const;

/** Kept out of the sidebar but still routable while v1 is wound down. */
export const legacyNavigationItems = [
  { href: "/curriculum", label: "Legacy curriculum", icon: "BookOpen" },
  { href: "/quiz", label: "Daily quiz", icon: "Brain" },
  { href: "/practice", label: "Legacy question bank", icon: "Brain" },
  { href: "/signal", label: "Signal", icon: "Radio" },
  { href: "/news", label: "News", icon: "Newspaper" },
] as const;
