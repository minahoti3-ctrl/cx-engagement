import { ComingSoon } from "@/app/components/ComingSoon";

export default function CommitmentsPlaceholder() {
  return (
    <ComingSoon
      pageNum={3}
      pageLabel="Commitments going forward"
      description="From discussion to decision — an AI synthesis of the room's health check + retro, plus a commitment wall where each person owns one move with a date."
    />
  );
}
