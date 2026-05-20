import { SessionProvider } from "@/app/components/SessionProvider";
import { normalizeCode } from "@/lib/rooms";

// Next 16: params is a Promise — await before reading.
export default async function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = normalizeCode(code);
  return <SessionProvider code={normalized}>{children}</SessionProvider>;
}
