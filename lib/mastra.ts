import { google } from '@ai-sdk/google'
import { Memory } from '@mastra/memory'
import { memoryStorage } from './memory-storage'

// HMR guard for Next.js hot reload — prevent duplicate initialization
const g = globalThis as typeof globalThis & { __mastraMemory?: Memory }

function createMemory(): Memory {
	return new Memory({
		storage: memoryStorage,
		options: {
			lastMessages: 50,
			semanticRecall: false,
			observationalMemory: {
				model: google('gemini-2.5-flash'),
				scope: 'thread',
				observation: {
					messageTokens: 30_000,
				},
				reflection: {
					observationTokens: 40_000,
				},
			},
		},
	})
}

export const memory: Memory =
	g.__mastraMemory ?? (g.__mastraMemory = createMemory())
