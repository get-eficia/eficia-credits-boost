import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => changeLanguage("fr")}
        className={`h-8 w-8 p-0 ${
          i18n.language === "fr" ? "ring-2 ring-eficia-violet" : "opacity-60 hover:opacity-100"
        }`}
        title="Français"
      >
        <span className="text-xl">🇫🇷</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => changeLanguage("en")}
        className={`h-8 w-8 p-0 ${
          i18n.language === "en" ? "ring-2 ring-eficia-violet" : "opacity-60 hover:opacity-100"
        }`}
        title="English"
      >
        <span className="text-xl">🇬🇧</span>
      </Button>
    </div>
  );
};
