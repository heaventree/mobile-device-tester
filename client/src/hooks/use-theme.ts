import * as React from "react";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  // Check for saved theme
  const savedTheme = localStorage.getItem("theme") as Theme;
  if (savedTheme) return savedTheme;

  // Check system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme);

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
