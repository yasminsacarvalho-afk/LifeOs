import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "./partners";

export const Route = createFileRoute("/sellers")({
  component: () => <ComingSoon title="Vendedores & Comissões" />,
});
