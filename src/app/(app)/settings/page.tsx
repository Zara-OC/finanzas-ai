import { Settings } from "lucide-react";
import { Header } from "@/modules/shared/components/Header";
import { EmptyState } from "@/modules/shared/components/EmptyState";

export default function SettingsPage() {
  return (
    <>
      <Header title="Configuracion" />
      <EmptyState
        icon={Settings}
        title="Configuracion"
        description="Administra tus categorias, cuenta y preferencias de la aplicacion."
      />
    </>
  );
}
