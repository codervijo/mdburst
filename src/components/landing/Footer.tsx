import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xs text-muted-foreground">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <a href="/tools/pdf-to-markdown/" className="hover:text-foreground">PDF to Markdown</a>
          <a href="/tools/markdown-to-docx/" className="hover:text-foreground">Markdown to DOCX</a>
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#waitlist" className="hover:text-foreground">Waitlist</a>
          <a href="mailto:hello@mdburst.app" className="hover:text-foreground">hello@mdburst.app</a>
        </div>
      </div>
    </footer>
  );
}
