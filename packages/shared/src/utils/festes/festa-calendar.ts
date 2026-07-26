// Pure helpers that turn the baked festes-locals collection into the shapes the
// /seasons calendar renders: a date→municipalities index and per-month grids of
// day cells. No framework, no side effects.

import type { FestesCollection, MunicipalityFesta } from '../../types/festa.type';

/** A single day cell in a month grid. */
export interface FestaDayCell {
	/** `YYYY-MM-DD`, the key into the date index. */
	date: string;
	/** Day of the month, 1–31. */
	day: number;
}

/** One month's calendar grid: weeks of 7 cells, Monday-first, padded with nulls. */
export interface FestaMonthGrid {
	/** 0-based month index (0 = January). */
	month: number;
	/** Rows of 7 day cells; leading/trailing blanks are null. */
	weeks: (FestaDayCell | null)[][];
}

/** Zero-pad a number to two digits. */
const pad = (value: number): string => String(value).padStart(2, '0');

/** Compose a `YYYY-MM-DD` key from calendar parts (month is 0-based). */
export function isoDate(year: number, month: number, day: number): string {
	return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * Index a baked collection by festival date: `YYYY-MM-DD` → the municipalities
 * celebrating that day, each kept in the collection's (name-sorted) order.
 */
export function indexFestesByDate(
	collection: FestesCollection | null
): Map<string, MunicipalityFesta[]> {
	const index = new Map<string, MunicipalityFesta[]>();
	if (!collection) return index;
	for (const festa of collection.festes) {
		for (const date of festa.dates) {
			const bucket = index.get(date);
			if (bucket) bucket.push(festa);
			else index.set(date, [festa]);
		}
	}
	return index;
}

/**
 * Build the twelve Monday-first month grids for a year. Each grid is padded with
 * leading/trailing nulls so every week row holds exactly seven cells.
 */
export function buildMonthGrids(year: number): FestaMonthGrid[] {
	const grids: FestaMonthGrid[] = [];
	for (let month = 0; month < 12; month++) {
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		// JS getDay(): 0 = Sunday. Shift so Monday = 0 for a Catalan week.
		const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

		const cells: (FestaDayCell | null)[] = [];
		for (let blank = 0; blank < firstWeekday; blank++) cells.push(null);
		for (let day = 1; day <= daysInMonth; day++) {
			cells.push({ date: isoDate(year, month, day), day });
		}
		while (cells.length % 7 !== 0) cells.push(null);

		const weeks: (FestaDayCell | null)[][] = [];
		for (let start = 0; start < cells.length; start += 7) {
			weeks.push(cells.slice(start, start + 7));
		}
		grids.push({ month, weeks });
	}
	return grids;
}
