import { FinanceFlow } from '@/components/finance-flow';
import { Bot } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col">
       <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <div className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-6 w-6" />
            </div>
            <span className="sr-only">FinanceFlow AI</span>
          </div>
          <h1 className="text-xl font-semibold">FinanceFlow AI</h1>
        </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
        <div className="w-full max-w-4xl mx-auto">
          <header className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Transaction Analysis, Simplified
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Paste any text describing a financial transaction, and our AI will instantly extract the key details for you.
            </p>
          </header>
          <FinanceFlow />
        </div>
      </main>
    </div>
  );
}
