import {
  ThemeToggleButton,
  useThemeTransition,
} from "~/components/ui/shadcn-io/theme-toggle-button"
import { useTheme } from "~/components/theme-provider"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const { startTransition } = useThemeTransition()

  const currentTheme =
    theme === "system"
      ? typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme

  const handleThemeToggle = () => {
    startTransition(() => {
      const newTheme = currentTheme === "dark" ? "light" : "dark"
      setTheme(newTheme)
    })
  }

  return (
    <ThemeToggleButton
      theme={currentTheme}
      onClick={handleThemeToggle}
      variant="circle"
      start="top-right"
    />
  )
}
