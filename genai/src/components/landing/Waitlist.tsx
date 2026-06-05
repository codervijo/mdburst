import { useState } from "react";
import { Check } from "lucide-react";

export function WaitlistForm({ size = "default" }: { size?: "default" | "lg" }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setDone(true);
  };

  const lg = size === "lg";

  if (done) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] px-5 ${
          lg ? "py-3.5 text-sm" : "py-2.5 text-sm"
        } text-foreground`}
      >
        <Check className="h-4 w-4 text-[var(--success)]" />
        You're on the list. We'll be in touch soon.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`flex w-full flex-col gap-2 sm:flex-row ${lg ? "max-w-md" : "max-w-md"}`}
    >
      <input
        type="email"
        required
        placeholder="you@domain.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`flex-1 rounded-full border border-input bg-background px-5 outline-none ring-ring transition-all placeholder:text-muted-foreground focus:ring-2 ${
          lg ? "py-3.5 text-sm" : "py-2.5 text-sm"
        }`}
      />
      <button
        type="submit"
        className={`rounded-full bg-foreground px-6 font-medium text-background transition-colors hover:bg-foreground/90 ${
          lg ? "py-3.5 text-sm" : "py-2.5 text-sm"
        }`}
      >
        Join the waitlist
      </button>
    </form>
  );
}
