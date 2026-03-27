import { LoginButton } from "@/modules/auth/components/LoginButton";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Finanzas AI</h1>
          <p className="text-sm text-muted-foreground">
            Tu asistente de finanzas personales con IA
          </p>
        </div>
        <LoginButton />
      </div>
    </div>
  );
}
