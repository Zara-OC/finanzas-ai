import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Finanzas AI</h1>
      <p className="text-muted-foreground">
        Tu asistente de finanzas personales con IA
      </p>
      <Button asChild>
        <Link href="/login">Comenzar</Link>
      </Button>
    </div>
  );
}
