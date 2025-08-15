'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTransactionDetails, type ActionResult } from '@/app/actions';
import type { ExtractTransactionDetailsOutput } from '@/ai/flows/extract-transaction-details';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tag,
  ArrowRightLeft,
  CircleDollarSign,
  Calendar,
  FileText,
  AlertCircle,
  Sparkles,
  Loader2,
  Store,
  CreditCard,
  MapPin,
} from 'lucide-react';

type TaskType = 'full' | 'categorize' | 'get_transaction_type' | 'get_amount';

const ResultItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
}) => (
  <div className="flex items-center rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md">
    <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      {icon}
    </div>
    <div className="flex-grow">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-md font-semibold text-foreground">
        {value === null || value === undefined ? (
          <span className="text-sm font-normal text-muted-foreground">
            Not found
          </span>
        ) : (
          String(value)
        )}
      </p>
    </div>
  </div>
);

const ResultSkeleton = () => (
    <div className="flex items-center rounded-lg border bg-card p-3">
        <Skeleton className="mr-4 h-10 w-10 rounded-lg" />
        <div className="flex-grow space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-5 w-1/2" />
        </div>
    </div>
);

export function FinanceFlow() {
  const [text, setText] = useState('');
  const [task, setTask] = useState<TaskType>('full');
  const [omnibusMode, setOmnibusMode] = useState(true);
  const [loading, setLoading] = useState(false);
  // UPDATE state to hold an array of results
  const [results, setResults] = useState<ExtractTransactionDetailsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      setError('Please enter some text to analyze.');
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null); // Clear previous results

    const actionResult: ActionResult = await getTransactionDetails({
      text,
      task: task === 'full' ? undefined : task,
      omnibusMode,
    });

    if (actionResult.error) {
      setError(actionResult.error);
    } else if (actionResult.data) {
      setResults(actionResult.data); // Set the array of results
    }

    setLoading(false);
  };
  
  const getTaskDescription = (currentTask: TaskType) => {
    switch (currentTask) {
        case 'full':
            return 'Extracts all available details from the text.';
        case 'categorize':
            return 'Focuses only on identifying the transaction category.';
        case 'get_transaction_type':
            return 'Determines if the transaction is income or an expense.';
        case 'get_amount':
            return 'Extracts only the numerical amount of the transaction.';
        default:
            return '';
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Enter Transaction Text</CardTitle>
          <CardDescription>
            Provide the text you want to analyze below.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid w-full gap-2">
              <Label htmlFor="transaction-text">Transaction Details</Label>
              <Textarea
                id="transaction-text"
                placeholder="e.g., 'Coffee with Sarah at Blue Bottle Cafe for $5.50 yesterday'"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                className="text-base"
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="task-select">Analysis Task</Label>
                    <Select
                    value={task}
                    onValueChange={(value) => setTask(value as TaskType)}
                    disabled={loading}
                    >
                    <SelectTrigger id="task-select">
                        <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="full">Full Extraction</SelectItem>
                        <SelectItem value="categorize">Categorize</SelectItem>
                        <SelectItem value="get_transaction_type">Get Type</SelectItem>
                        <SelectItem value="get_amount">Get Amount</SelectItem>
                    </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{getTaskDescription(task)}</p>
                </div>
                <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <Label>Omnibus Mode</Label>
                        <p className="text-xs text-muted-foreground">
                        Allow AI to assign 'null' if uncertain.
                        </p>
                    </div>
                    <Switch
                        checked={omnibusMode}
                        onCheckedChange={setOmnibusMode}
                        disabled={loading}
                        aria-label="Toggle Omnibus Mode"
                    />
                </div>
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || !text.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                   Process Transaction
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Extracted Details</CardTitle>
          <CardDescription>
            {/* UPDATE description based on results array */}
            {results ? `Found ${results.length} transaction(s).` : 'Results from the AI analysis will appear here.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-4">
              <ResultSkeleton />
              <ResultSkeleton />
              <ResultSkeleton />
              <ResultSkeleton />
              <ResultSkeleton />
            </div>
          )}

          {/* UPDATE rendering logic to map over the results array */}
          {results && !loading && (
            <div className="space-y-6 animate-in fade-in-50 duration-500">
              {results.map((result, index) => (
                <div key={index} className="space-y-4 rounded-lg border p-4">
                  <h3 className="font-semibold text-lg">Transaction #{index + 1}</h3>
                  <ResultItem icon={<FileText size={20} />} label="Description" value={result.description} />
                  <ResultItem icon={<Tag size={20} />} label="Category" value={result.category} />
                  <ResultItem icon={<ArrowRightLeft size={20} />} label="Type" value={result.type} />
                  <ResultItem icon={<CircleDollarSign size={20} />} label="Amount" value={result.amount} />
                  <ResultItem icon={<Calendar size={20} />} label="Date" value={result.date} />
                  {result.merchant && <ResultItem icon={<Store size={20} />} label="Merchant" value={result.merchant} />}
                  {result.paymentMethod && <ResultItem icon={<CreditCard size={20} />} label="Payment Method" value={result.paymentMethod} />}
                  {result.location && <ResultItem icon={<MapPin size={20} />} label="Location" value={result.location} />}
                </div>
              ))}
            </div>
          )}

           {/* UPDATE the initial empty state message */}
           {!loading && !results && !error && (
             <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 rounded-lg border-2 border-dashed">
                <Sparkles className="h-10 w-10 mb-4" />
                <p>Your results are waiting to be discovered.</p>
                <p className="text-sm">Enter one or more transactions and click "Process".</p>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
