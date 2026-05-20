import { ComingSoon } from "@/app/components/ComingSoon";

export default function BauPlaceholder() {
  return (
    <ComingSoon
      pageNum={4}
      pageLabel="Transition to BAU"
      description="What needs to be true before a workstream is ready for BAU? Drag-sortable criteria across Must / Nice / Risk columns, plus shared notes from the room."
    />
  );
}
