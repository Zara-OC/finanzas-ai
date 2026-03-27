import { Receipt } from "lucide-react";
import { Header } from "@/modules/shared/components/Header";
import { EmptyState } from "@/modules/shared/components/EmptyState";

export default function TransactionsPage() {
  return (
    <>
      <Header title="Transacciones" />
      <EmptyState
        icon={Receipt}
        title="Sin transacciones"
        description="Importa un archivo CSV de tu banco para comenzar a organizar tus finanzas."
        actionLabel="Importar CSV"
      />
    </>
  );
}
