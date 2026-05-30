import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "./partners";

export const Route = createFileRoute("/billing")({
  component: () => <ComingSoon title="Faturamento" />,
});
