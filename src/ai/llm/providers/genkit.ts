import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  LLMProvider,
  LLMMessage,
  LLMCallOptions,
  LLMResponse,
  LLMProviderError,
  LLMTimeoutError,
  LLMInvalidResponseError,
} from '../types';

/**
 * Genkit provider implementation
 */
export class GenkitProvider implements LLMProvider {
  private readonly name = 'genkit';

  /**
   * Convert LLMMessage array to Genkit prompt format
   */
  private buildPromptString(messages: LLMMessage[]): string {
    return messages
      .map(message => {
        switch (message.role) {
          case 'system':
            return `System: ${message.content}`;
          case 'user':
            return `User: ${message.content}`;
          case 'assistant':
            return `Assistant: ${message.content}`;
          default:
            return message.content;
        }
      })
      .join('\n\n');
  }

  /**
   * Create a dynamic Genkit prompt for the given messages
   */
  private createDynamicPrompt(messages: LLMMessage[]) {
    const promptString = this.buildPromptString(messages);
    
    return ai.definePrompt({
      name: `dynamic_prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input: { schema: z.object({}) },
      output: { schema: z.string() },
      prompt: promptString,
    });
  }

  /**
   * Make a call to Genkit
   */
  async call(messages: LLMMessage[], options?: LLMCallOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      // Create timeout promise if timeout is specified
      const timeoutMs = options?.timeout || 30000; // 30 second default
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new LLMTimeoutError('Request timed out', this.name, timeoutMs));
        }, timeoutMs);
      });

      // Create the dynamic prompt
      const prompt = this.createDynamicPrompt(messages);

      // Make the Genkit call
      const genkitPromise = prompt({});

      // Race between the actual call and timeout
      const result = await Promise.race([genkitPromise, timeoutPromise]);

      const duration = Date.now() - startTime;

      // Validate response
      if (!result || typeof result.output !== 'string') {
        throw new LLMInvalidResponseError(
          'Invalid response format from Genkit',
          this.name
        );
      }

      return {
        content: result.output,
        metadata: {
          provider: this.name,
          model: 'googleai/gemini-2.0-flash', // From genkit.ts config
          duration,
          cached: false,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Re-throw our custom errors
      if (error instanceof LLMTimeoutError || 
          error instanceof LLMInvalidResponseError) {
        throw error;
      }

      // Handle Genkit-specific errors
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message);
        
        // Check for quota/rate limit errors
        if (errorMessage.includes('quota') || 
            errorMessage.includes('rate limit') ||
            errorMessage.includes('429')) {
          throw new LLMProviderError(
            `Genkit quota exceeded: ${errorMessage}`,
            this.name,
            'QUOTA_EXCEEDED',
            429
          );
        }

        // Check for authentication errors
        if (errorMessage.includes('unauthorized') || 
            errorMessage.includes('401') ||
            errorMessage.includes('API key')) {
          throw new LLMProviderError(
            `Genkit authentication failed: ${errorMessage}`,
            this.name,
            'AUTHENTICATION_FAILED',
            401
          );
        }

        // Generic Genkit error
        throw new LLMProviderError(
          `Genkit error: ${errorMessage}`,
          this.name,
          'GENKIT_ERROR'
        );
      }

      // Unknown error
      throw new LLMProviderError(
        `Unknown Genkit error: ${String(error)}`,
        this.name,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Check if Genkit provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check with minimal prompt
      const testMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];
      
      await this.call(testMessages, { timeout: 5000 });
      return true;
    } catch (error) {
      console.warn(`Genkit provider health check failed:`, error);
      return false;
    }
  }
}

/**
 * Create and export default Genkit provider instance
 */
export const genkitProvider = new GenkitProvider();
