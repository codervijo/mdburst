export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
        <span className="font-mono text-[13px] font-bold leading-none">{"{}"}</span>
      </div>
      <span className="text-[17px] font-semibold tracking-tight">mdburst</span>
    </div>
  );
}
