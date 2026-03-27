import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Finanzas AI — Tus finanzas, claras como nunca",
  description:
    "Importá tus gastos, la IA los categoriza automáticamente. Preguntale a tu plata a dónde se va. Hecho para Argentina.",
  openGraph: {
    title: "Finanzas AI — Tus finanzas, claras como nunca",
    description:
      "Importá tus gastos, la IA los categoriza automáticamente. Preguntale a tu plata a dónde se va.",
    type: "website",
    locale: "es_AR",
  },
};

const painPoints = [
  {
    icon: "📊",
    title: "Planillas interminables",
    description: "Pasar horas categorizando gastos a mano en un Excel.",
  },
  {
    icon: "🤯",
    title: "Sin visibilidad",
    description: "No saber a dónde se va la plata cada mes.",
  },
  {
    icon: "💸",
    title: "Cuotas invisibles",
    description: "Perder el control de cuotas, suscripciones y gastos hormiga.",
  },
  {
    icon: "🇦🇷",
    title: "Herramientas gringas",
    description: "Apps que no entienden pesos, dólar blue ni inflación.",
  },
];

const features = [
  {
    icon: "🤖",
    title: "Categorización inteligente",
    description:
      "Subí un CSV de tu banco y la IA categoriza cada gasto automáticamente. Sin reglas manuales.",
  },
  {
    icon: "📈",
    title: "Mirá a dónde va tu plata",
    description:
      "Dashboard con gráficos claros. Entendé tus patrones de gasto de un vistazo.",
  },
  {
    icon: "💬",
    title: "Preguntale a tu plata",
    description:
      "Hacé preguntas en español: \"¿Cuánto gasté en delivery este mes?\" y obtené respuestas al instante.",
  },
  {
    icon: "🇦🇷",
    title: "Hecho para Argentina",
    description:
      "Pesos, dólares, cuotas, inflación. Pensado desde el día uno para la realidad financiera argentina.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Finanzas AI
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="absolute -top-24 right-0 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 left-0 -z-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:py-32">
            <div className="mb-4 inline-block rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              100% gratis para empezar
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Tus finanzas, claras{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                como nunca
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Importá tus gastos, la IA los categoriza automáticamente.
              Preguntale a tu plata a dónde se va.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="text-base">
                <Link href="/login">Empezar gratis</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link href="#features">Cómo funciona</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                El Excel no alcanza
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Manejar tus finanzas no debería ser un trabajo de medio tiempo.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {painPoints.map((point) => (
                <Card key={point.title} className="border-dashed">
                  <CardHeader>
                    <div className="text-3xl">{point.icon}</div>
                    <CardTitle className="text-base">{point.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="-mt-2">
                    <p className="text-sm text-muted-foreground">
                      {point.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Todo lo que necesitás
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Finanzas AI te da las herramientas para entender y controlar tu
                plata.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <div className="text-3xl">{feature.icon}</div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="-mt-2">
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Empezá a entender tu plata hoy
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              100% gratis para empezar. Sin tarjeta de crédito.
            </p>
            <Button asChild size="lg" className="mt-8 text-base">
              <Link href="/login">Empezar gratis</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Finanzas AI</p>
          <nav className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Términos
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
