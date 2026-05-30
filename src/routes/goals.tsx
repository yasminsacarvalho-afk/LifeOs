import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "./partners";

export const Route = createFileRoute("/goals")({
  component: () => <ComingSoon title="Metas & Ranking" />,
});
