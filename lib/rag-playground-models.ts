export interface ModelDefinition {
	id: string
	label: string
	provider: 'openai'
	supportsReasoning: boolean
	reasoningEffort?: 'xhigh' | 'high' | 'medium' | 'low'
	reasoningSummary?: 'detailed' | 'auto'
}

export const MODELS: ModelDefinition[] = [
	{
		id: 'gpt-5.2',
		label: 'GPT-5.2',
		provider: 'openai',
		supportsReasoning: true,
		reasoningEffort: 'high',
		reasoningSummary: 'detailed',
	},
	{
		id: 'gpt-4o',
		label: 'GPT-4o',
		provider: 'openai',
		supportsReasoning: false,
	},
	{
		id: 'gpt-4o-mini',
		label: 'GPT-4o Mini',
		provider: 'openai',
		supportsReasoning: false,
	},
]

export const DEFAULT_MODEL_ID = 'gpt-5.2'

export function findModel(id: string): ModelDefinition | undefined {
	return MODELS.find((m) => m.id === id)
}
