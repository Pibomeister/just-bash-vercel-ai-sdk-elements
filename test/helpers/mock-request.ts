export function createJsonRequest(body: unknown, init?: RequestInit): Request {
	return new Request('http://localhost:3000', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		...init,
	})
}

export function createFormDataRequest(
	formData: FormData,
	init?: RequestInit,
): Request {
	return new Request('http://localhost:3000', {
		method: 'POST',
		body: formData,
		...init,
	})
}
