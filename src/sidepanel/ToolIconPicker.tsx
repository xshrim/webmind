import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { iconNames } from "lucide-react/dynamic";
import type { UiTextKey } from "../shared/i18n";
import { uiText } from "../shared/i18n";
import {
  lucideIconNameFromKebab,
  ToolIcon
} from "./toolIcons";

const TOOL_ICON_CHOICES = iconNames
  .map(lucideIconNameFromKebab)
  .sort((left, right) => left.localeCompare(right));

interface ToolIconPickerProps {
  currentIcon: string;
  language?: Parameters<typeof uiText>[0];
  onSelect: (icon: string) => void;
}

export function ToolIconPicker({
  currentIcon,
  language,
  onSelect
}: ToolIconPickerProps) {
  const [search, setSearch] = useState("");
  const filteredToolIconChoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return TOOL_ICON_CHOICES;
    return TOOL_ICON_CHOICES.filter((icon) =>
      icon.toLowerCase().includes(query)
    );
  }, [search]);
  const t = (key: UiTextKey) => uiText(language, key);

  return (
    <div
      className="tool-icon-picker"
      role="dialog"
      aria-label={t("chooseIcon")}
    >
      <label className="tool-icon-search">
        <Search />
        <input
          value={search}
          placeholder={t("searchIcon")}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="tool-icon-grid">
        <button
          className={`tool-icon-choice ${
            currentIcon ? "" : "active empty"
          }`}
          type="button"
          title={t("noIcon")}
          aria-label={t("noIcon")}
          onClick={() => onSelect("")}
        />
        {filteredToolIconChoices.map((icon) => (
          <button
            key={icon}
            className={`tool-icon-choice ${
              currentIcon === icon ? "active" : ""
            }`}
            type="button"
            title={icon}
            aria-label={icon}
            onClick={() => onSelect(icon)}
          >
            <ToolIcon name={icon} />
          </button>
        ))}
      </div>
      {!filteredToolIconChoices.length && (
        <div className="tool-icon-empty">{t("noIconMatches")}</div>
      )}
    </div>
  );
}
