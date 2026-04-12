// @client-reason: useTheme hook requires client component for theme switching
"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptySubscribe = (): (() => void) => () => undefined;
const getClientSnapshot = (): boolean => true;
/* c8 ignore start -- SSR-only: called by useSyncExternalStore during server rendering */
const getServerSnapshot = (): boolean => false;
/* c8 ignore stop */

interface ThemeToggleProps {
  label?: string;
}

export function ThemeToggle({ label }: Readonly<ThemeToggleProps>): React.ReactElement {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const toggleTheme = (): void => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  /* c8 ignore start -- SSR fallback: mounted is always true in client rendering */
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={label ?? "Toggle theme"}
        disabled
      >
        <Sun className="h-5 w-5" />
      </Button>
    );
  }
  /* c8 ignore stop */

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={label ?? "Toggle theme"}
      aria-pressed={isDark}
      className="focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
