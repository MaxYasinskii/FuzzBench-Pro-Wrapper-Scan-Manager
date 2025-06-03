import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";

export default function LanguageSwitcher() {
  const { lang, toggleLanguage } = useLanguage();
  return (
    <Button variant="outline" size="sm" onClick={toggleLanguage} className="ml-2">
      {lang === "en" ? "Русский" : "English"}
    </Button>
  );
}
