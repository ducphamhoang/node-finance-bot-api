import { config } from 'dotenv';
config();

import '@/ai/flows/handle-missing-transaction-data.ts';
import '@/ai/flows/extract-transaction-details.ts';