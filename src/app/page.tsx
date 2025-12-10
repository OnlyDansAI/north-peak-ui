import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">North Peak AI</h1>
      <p className="text-muted-foreground mb-8">
        AI-Powered Conversation Assistant
      </p>
      <div className="flex gap-4">
        <Link
          href="/chat"
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Open Chat
        </Link>
        <Link
          href="/settings"
          className="border border-input bg-background px-6 py-3 rounded-lg hover:bg-accent transition-colors"
        >
          Settings
        </Link>
      </div>
    </main>
  );
}
