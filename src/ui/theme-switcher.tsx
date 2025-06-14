import { Sun, Moon, ComputerDesktop } from "@medusajs/icons";
import { cn } from "@/utils/misc";
import { Select, Button } from "@medusajs/ui";
import { useEffect, useState } from "react";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: ComputerDesktop },
] as const;

type Theme = (typeof themes)[number]["value"];

const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  // Apply theme whenever it changes
  useEffect(() => {
    // Save to localStorage
    if (currentTheme === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", currentTheme);
    }

    // Apply theme to document
    const isDark =
      currentTheme === "dark" ||
      (currentTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, [currentTheme]);

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (currentTheme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Trigger a re-render to apply the system theme
      if (mediaQuery.matches) {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [currentTheme]);

  return [currentTheme, setCurrentTheme] as const;
};

export function ThemeSwitcher({ triggerClass }: { triggerClass?: string }) {
  const [currentTheme, setCurrentTheme] = useTheme();
  const current = themes.find((t) => t.value === currentTheme) || themes[2];

  return (
    <div className="w-[250px]">
      <Select
        value={currentTheme}
        onValueChange={(theme) => setCurrentTheme(theme as Theme)}
      >
        <Select.Trigger
          className={cn(
            "h-6 rounded border-primary/20 bg-secondary !px-2 hover:border-primary/40",
            triggerClass,
          )}
        >
          <div className="flex items-start gap-2">
            {/* <current.icon className="h-[14px] w-[14px]" /> */}
            <span className="text-xs font-medium">{current.label}</span>
          </div>
        </Select.Trigger>
        <Select.Content>
          {themes.map((theme) => (
            <Select.Item
              key={theme.value}
              value={theme.value}
              className={cn(
                "text-sm font-medium text-primary/60",
                theme.value === currentTheme && "text-primary",
              )}
            >
              <div className="flex items-center gap-2">
                {/* <theme.icon className="h-[14px] w-[14px]" /> */}
                {theme.label}
              </div>
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </div>
  );
}

export function ThemeSwitcherHome() {
  const [, setCurrentTheme] = useTheme();
  return (
    <div className="flex gap-3">
      {themes.map((theme) => (
        <Button
          key={theme.value}
          name="theme"
          onClick={() => setCurrentTheme(theme.value)}
        >
          <theme.icon className="h-4 w-4 text-primary/80 hover:text-primary" />
        </Button>
      ))}
    </div>
  );
}
