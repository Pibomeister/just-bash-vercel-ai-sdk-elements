export const MEXICAN_LEGAL_REGEX = {
	articles: String.raw`(?:Art[íi]culo|Art\.)\s+(?:Transitorio\s+)?\d{1,4}\s*(?:Bis|Ter|Qu[aá]ter)?`,
	articlesOcrAware: String.raw`(?:ART[IÍ]CULO|Art[íi]culo|Art\.)\s+\d{1,4}[oO0]?\.?(?:\s*(?:Bis|Ter|Qu[aá]ter)(?:\s+\d+)?)?(?:-[A-Z])?\.?`,
	fractions: String.raw`fracci[oó]n(?:es)?\s+[IVXLCDM]+(?:\s*[,y]\s*[IVXLCDM]+)*`,
	incisos: String.raw`inciso(?:s)?\s+[a-z]\)(?:\s*[,y]\s*[a-z]\))*`,
	noms: String.raw`NOM-\d{3}-[A-Z]{2,10}(?:\/[A-Z]{2,10})?-\d{4}`,
	dofShort: String.raw`DOF\s+\d{1,2}[-/]\d{1,2}[-/]\d{2,4}`,
	dofLong: String.raw`(?:publicad[oa]|reformad[oa])\s+en\s+el\s+Diario\s+Oficial\s+de\s+la\s+Federaci[oó]n\s+(?:el\s+)?\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}`,
	clausulas: String.raw`CL[AÁ]USULA\s+(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA(?:\s+(?:PRIMERA|SEGUNDA|TERCERA))?|VIG[ÉE]SIMA(?:\s+\w+)?|\d+)`,
	spanishDates: String.raw`\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}`,
	pesos: String.raw`\$[\d,]+(?:\.\d{1,2})?\s*(?:M\.?N\.?|pesos|MXN)?`,
	umas: String.raw`[\d,]+(?:\.\d{1,2})?\s*(?:UMA[Ss]?|UDI[Ss]?|VSM)`,
	legalEntities: String.raw`S\.A\.(?:\s*de\s*C\.V\.)?|S\.\s*de\s*R\.L\.(?:\s*de\s*C\.V\.)?|S\.A\.P\.I\.(?:\s*de\s*C\.V\.)?|A\.C\.|S\.A\.S\.`,
	tesis: String.raw`[Tt]esis\s+(?:\d{1,2}a\.\s*(?:\/J\.)?\s*)?\d{1,4}\/\d{4}\s*(?:\(\d{1,2}a\.\))?`,
	titulos: String.raw`T[IÍ]TULO\s+(?:PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|[IVXLC]+)`,
	capitulos: String.raw`CAP[IÍ]TULO\s+(?:[IVXLC]+|\d+)`,
	considerandos: String.raw`CONSIDERANDO\s*(?:PRIMERO|SEGUNDO|TERCERO|\d+)?`,
	resolutivos: String.raw`(?:PUNTOS?\s+)?RESOLUTIVOS?|R\s*E\s*S\s*U\s*E\s*L\s*V\s*E`,
	transitorios: String.raw`(?:TRANSITORIOS?|ART[IÍ]CULOS?\s+TRANSITORIOS?|DECRETO\s+(?:por|que))`,
	anexos: String.raw`ANEXO\s+\d+\s+(?:DE\s+LAS\s+)?(?:REGLAS\s+GENERALES)?`,
	fines: String.raw`(?:multa|sanci[oó]n|embargo|decomiso)\s+(?:de\s+)?\$[\d,]+`,
} as const

export type RegexKey = keyof typeof MEXICAN_LEGAL_REGEX

export interface RegexMatch {
	match: string
	line: number
	index: number
}

/** Run a regex pattern against text and return all matches with 1-based line numbers. */
export function matchAll(
	textOrLines: string | string[],
	pattern: string,
): RegexMatch[] {
	const lines = Array.isArray(textOrLines)
		? textOrLines
		: textOrLines.split('\n')
	const re = new RegExp(pattern, 'gi')
	const results: RegexMatch[] = []

	for (let i = 0; i < lines.length; i++) {
		re.lastIndex = 0
		let m: RegExpExecArray | null
		while ((m = re.exec(lines[i])) !== null) {
			if (m[0].length === 0) {
				re.lastIndex++
				continue
			}
			results.push({ match: m[0], line: i + 1, index: m.index })
		}
	}

	return results
}
