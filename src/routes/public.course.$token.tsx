import { createFileRoute } from "@tanstack/react-router";
import { PublicStudentView } from "@/components/pos/PublicStudentView";

export const Route = createFileRoute("/public/course/$token")({
  component: PublicCoursePage,
});

function PublicCoursePage() {
  const { token } = Route.useParams();
  return <PublicStudentView token={token} />;
}
