import type { TranslationKey } from "@/i18n/en";
import type { WidgetId } from "@/types/settings";

/**
 * Widget labels shared by the dashboard customiser and the settings page.
 * Keeping this in one place ensures the two surfaces never drift apart.
 */
export const WIDGET_LABELS: Record<WidgetId, TranslationKey> = {
  nowcast: "widgetNowcast",
  summary: "widgetSummary",
  hourly: "widgetHourly",
  daily: "widgetDaily",
  suggestions: "widgetSuggestions",
  air: "widgetAir",
  sun: "widgetSun",
  history: "widgetHistory",
  astronomy: "widgetAstronomy",
  favorites: "widgetFavorites",
};
