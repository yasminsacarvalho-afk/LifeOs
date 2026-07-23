import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { OperationalReportBoard } from "@/components/OperationalReportBoard";

export const Route = createFileRoute("/quadro-operacional")({
  component: QuadroOperacionalPage,
});

function QuadroOperacionalPage() {
  return (
    <>
      <TopBar
        title="Quadro Operacional Detalhado"
        subtitle="Importação e análise primária de relatórios diários JSON."
      />
      <main className="px-4 md:px-8 py-6 md:py-8 space-y-8 relative overflow-hidden">
        {/* Ambient Purple Nubank Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-[#8A05BE]/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#C135FF]/5 blur-[150px] rounded-full pointer-events-none -z-10" />
        
        <OperationalReportBoard />
      </main>
    </>
  );
}
