import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * AG Grid theme mapped to the shadcn CSS variables in index.css,
 * so tables match the rest of the UI and follow light/dark mode automatically.
 */
export const gridTheme = themeQuartz.withParams({
  fontFamily: "inherit",
  fontSize: 14,
  backgroundColor: "var(--card)",
  foregroundColor: "var(--card-foreground)",
  headerBackgroundColor: "var(--muted)",
  headerTextColor: "var(--muted-foreground)",
  borderColor: "var(--border)",
  accentColor: "var(--primary)",
  rowHoverColor: "var(--accent)",
  selectedRowBackgroundColor: "var(--accent)",
  oddRowBackgroundColor: "var(--card)",
  chromeBackgroundColor: "var(--card)",
  inputBorder: { color: "var(--input)" },
  borderRadius: 6,
  wrapperBorderRadius: 8,
});
