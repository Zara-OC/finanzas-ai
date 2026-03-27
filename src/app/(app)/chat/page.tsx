import { MessageSquare } from "lucide-react";
import { Header } from "@/modules/shared/components/Header";
import { EmptyState } from "@/modules/shared/components/EmptyState";

export default function ChatPage() {
  return (
    <>
      <Header title="Chat" />
      <EmptyState
        icon={MessageSquare}
        title="Chatea con tus finanzas"
        description="Preguntale a la IA sobre tus gastos, ingresos y patrones financieros usando lenguaje natural."
      />
    </>
  );
}
