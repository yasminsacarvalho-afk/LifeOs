import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/partners")({
  component: () => <ComingSoon title="Empresas Parceiras" />,
});

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <TopBar title={title} subtitle="Esta tela faz parte do roadmap do Voyage Flow." />
      <main className="grid place-items-center px-8 py-24">
        <div className="max-w-md rounded-2xl border border-border bg-card/70 p-10 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-primary/15 text-primary">
            <Construction className="size-6" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Disponível na próxima sprint. Use o Dashboard e a Torre de Controle por enquanto.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </main>
    </>
  );
}
