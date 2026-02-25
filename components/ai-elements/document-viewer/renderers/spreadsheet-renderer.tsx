'use client'

import Papa from 'papaparse'
import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SheetData {
	headers: string[]
	rows: string[][]
}

function parseCSV(content: string): SheetData {
	const result = Papa.parse<string[]>(content, {
		header: false,
		skipEmptyLines: true,
	})
	const data = result.data
	if (data.length === 0) return { headers: [], rows: [] }
	return {
		headers: data[0],
		rows: data.slice(1),
	}
}

function parseExcel(
	content: string,
	sheetName?: string,
): { sheets: string[]; data: SheetData } {
	const workbook = XLSX.read(content, { type: 'base64' })
	const name = sheetName ?? workbook.SheetNames[0]
	const sheet = workbook.Sheets[name]
	const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
	const data = jsonData as string[][]

	if (data.length === 0) {
		return { sheets: workbook.SheetNames, data: { headers: [], rows: [] } }
	}

	return {
		sheets: workbook.SheetNames,
		data: {
			headers: data[0].map((v) => String(v ?? '')),
			rows: data.slice(1).map((row) => row.map((v) => String(v ?? ''))),
		},
	}
}

export function SpreadsheetRenderer({
	content,
	filepath,
	compact = false,
}: {
	content: string
	filepath: string
	compact?: boolean
}) {
	const isCSV = filepath.toLowerCase().endsWith('.csv')
	const [activeSheet, setActiveSheet] = useState<string | undefined>(undefined)

	const { sheets, sheetData } = useMemo(() => {
		if (isCSV) {
			return { sheets: [] as string[], sheetData: parseCSV(content) }
		}
		const result = parseExcel(content, activeSheet)
		return { sheets: result.sheets, sheetData: result.data }
	}, [content, isCSV, activeSheet])

	const displayRows = compact ? sheetData.rows.slice(0, 10) : sheetData.rows

	return (
		<div className="flex flex-col">
			{sheets.length > 1 && (
				<div className="flex gap-1 border-b p-2 overflow-x-auto">
					{sheets.map((name) => (
						<Button
							key={name}
							variant={
								(activeSheet ?? sheets[0]) === name ? 'secondary' : 'ghost'
							}
							size="sm"
							onClick={() => setActiveSheet(name)}
						>
							{name}
						</Button>
					))}
				</div>
			)}
			<div className="overflow-auto max-h-[80vh]">
				<table className="w-full border-collapse text-sm">
					<thead className="sticky top-0 z-10 bg-muted">
						<tr>
							{sheetData.headers.map((header, i) => (
								<th
									// biome-ignore lint/suspicious/noArrayIndexKey: tabular data with no stable identity
									key={`h-${header}-${i}`}
									className="border border-border px-3 py-2 text-left font-medium"
								>
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{displayRows.map((row, rowIdx) => (
							<tr
								// biome-ignore lint/suspicious/noArrayIndexKey: tabular data with no stable identity
								key={`r-${rowIdx}`}
								className={cn(rowIdx % 2 === 1 && 'bg-muted/30')}
							>
								{row.map((cell, cellIdx) => (
									<td
										// biome-ignore lint/suspicious/noArrayIndexKey: tabular data with no stable identity
										key={`c-${rowIdx}-${cellIdx}`}
										className="border border-border px-3 py-2"
									>
										{cell}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
