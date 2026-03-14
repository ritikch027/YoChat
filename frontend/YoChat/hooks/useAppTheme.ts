import { getTheme } from "@/constants/theme";
import { useThemeMode } from "@/contexts/themeContext";

export const useAppTheme = () => {
  const { resolvedScheme } = useThemeMode();
  return getTheme(resolvedScheme);
};
