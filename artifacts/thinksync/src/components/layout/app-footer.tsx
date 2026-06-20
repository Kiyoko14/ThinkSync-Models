import { Container } from "@/components/layout/container";

export function AppFooter() {
  return (
    <footer className="border-t">
      <Container className="flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} ThinkSync Models.</p>
        <p>FastAPI backend + Vite frontend.</p>
      </Container>
    </footer>
  );
}
