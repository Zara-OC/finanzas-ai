import { LayoutDashboard } from "lucide-react";
import { Header } from "@/modules/shared/components/Header";
import { EmptyState } from "@/modules/shared/components/EmptyState";

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <EmptyState
        icon={LayoutDashboard}
        title="Tu dashboard esta vacio"
        description="Importa tus transacciones para ver metricas, graficos y un resumen de tus finanzas."
        actionLabel="Importar transacciones"
        actionHref="/transactions"
      />
    </>
  );
}
