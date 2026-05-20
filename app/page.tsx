export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FBF6EF] px-6 text-[#0F1B5C]">
      <div className="inline-block rounded-full bg-[#0F1B5C] px-4 py-1.5 text-xs font-medium tracking-wider text-white">
        CX · 6 MONTHS IN · DEPLOY OK
      </div>
      <h1 className="mt-6 max-w-xl text-center text-4xl font-medium leading-tight">
        Pipeline is live.
      </h1>
      <p className="mt-3 max-w-md text-center text-sm text-[#666]">
        Next.js {process.env.NODE_ENV === "production" ? "prod" : "dev"} · build verified.
      </p>
    </main>
  );
}
