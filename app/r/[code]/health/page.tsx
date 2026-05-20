import { ComingSoon } from "@/app/components/ComingSoon";

export default function HealthPlaceholder() {
  return (
    <ComingSoon
      pageNum={2}
      pageLabel="Health check & retro"
      description="The 60-second program pulse — 4 dials per participant, the direction-pin scatter, and the Continue / Stop / Change retro board. All ratings sync live across the room."
    />
  );
}
