import {
	DEFAULT_MODEL_ID,
	findModel,
	MODELS,
} from '@/lib/rag-playground-models'

describe('rag-playground-models', () => {
	it('MODELS array contains 3 entries', () => {
		expect(MODELS).toHaveLength(3)
	})

	it('DEFAULT_MODEL_ID is gpt-5.2', () => {
		expect(DEFAULT_MODEL_ID).toBe('gpt-5.2')
	})

	it('findModel returns gpt-5.2 with supportsReasoning: true', () => {
		const model = findModel('gpt-5.2')
		expect(model).toBeDefined()
		expect(model!.id).toBe('gpt-5.2')
		expect(model!.label).toBe('GPT-5.2')
		expect(model!.supportsReasoning).toBe(true)
	})

	it('findModel returns gpt-4o with supportsReasoning: false', () => {
		const model = findModel('gpt-4o')
		expect(model).toBeDefined()
		expect(model!.id).toBe('gpt-4o')
		expect(model!.supportsReasoning).toBe(false)
	})

	it('findModel returns gpt-4o-mini with supportsReasoning: false', () => {
		const model = findModel('gpt-4o-mini')
		expect(model).toBeDefined()
		expect(model!.id).toBe('gpt-4o-mini')
		expect(model!.supportsReasoning).toBe(false)
	})

	it('findModel returns undefined for nonexistent model', () => {
		expect(findModel('nonexistent')).toBeUndefined()
	})

	it('each model has required fields (id, label, provider)', () => {
		for (const model of MODELS) {
			expect(model.id).toBeTruthy()
			expect(model.label).toBeTruthy()
			expect(model.provider).toBe('openai')
		}
	})

	it('reasoning models have reasoningEffort and reasoningSummary set', () => {
		const reasoningModels = MODELS.filter((m) => m.supportsReasoning)
		expect(reasoningModels.length).toBeGreaterThan(0)
		for (const model of reasoningModels) {
			expect(model.reasoningEffort).toBeDefined()
			expect(model.reasoningSummary).toBeDefined()
		}
	})

	it('non-reasoning models do not have reasoningEffort or reasoningSummary', () => {
		const nonReasoningModels = MODELS.filter((m) => !m.supportsReasoning)
		expect(nonReasoningModels.length).toBeGreaterThan(0)
		for (const model of nonReasoningModels) {
			expect(model.reasoningEffort).toBeUndefined()
			expect(model.reasoningSummary).toBeUndefined()
		}
	})
})
