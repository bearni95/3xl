// The achievement formula language.
//
// An achievement may declare variables of its own (see `variables` on
// {@link Achievement}), each a name plus a formula, and template them into its
// name and its description between braces — `Conquereix {target} municipalitats.`
// A variable belongs to the achievement that declares it and is visible nowhere
// else, so two badges may both call their own number `target` and mean different
// things by it.
//
// A formula is an arithmetic expression over what the game knows about the player
// it is being rendered for: their level, and the cards they own. Both are read
// through the named sources below — `level` is a number, and `cards` counts cards,
// either all of them or the ones matching a filter written in its parentheses:
//
//     level * 3
//     cards
//     cards(color = red)
//     cards(box = white and not color = orange)
//     cards(color in [red, blue, yellow]) / 2
//     (level + cards(team = true)) * 10
//
// Operators are `+ - * / % ^`, with the usual precedence, unary minus, and
// parentheses; `^` is right-associative. A formula reads sources and does
// arithmetic, and that is all it does: there are no functions to call, no way to
// reach another achievement's variables, and no way to name anything the context
// below does not carry — which is what makes a formula safe to evaluate on
// whatever the player turns out to be.
//
// Parsing is where every mistake is caught: an unknown source, an unknown card
// field, a colour that is not a colour, an unclosed parenthesis. Evaluation, by
// contrast, never fails — it is given an already-parsed formula and always
// produces a finite number (a division by zero reads as 0), because by then the
// value is going into a line of text a player is reading and that line has to say
// something.

import { SpawnBox, SpawnColor } from '../../types/character-spawn.type';

/**
 * A card as a formula reads it — the filterable face of a `CharacterSpawn`, which
 * satisfies this shape as it stands. Deliberately structural rather than the spawn
 * type itself: the admin's preview evaluates formulas against cards it invents,
 * and those are not rows anybody claimed.
 */
export interface FormulaCard {
	/** The claimed character, as a registry id. */
	characterId: string;
	/** The show the card was rolled from, or null when rolled across all shows. */
	showId: number | null;
	/** The municipality it was claimed in, as a geojson feature id. */
	locationId: string;
	/** The rolled colour ({@link SpawnColor}). */
	color: string;
	/** The box stock it came out of ({@link SpawnBox}). */
	box: string;
	/** The team lane it holds, or null when it is not fielded. */
	teamSlot: number | null;
}

/**
 * Everything a formula may read: the player the achievement is being rendered
 * for. Nothing else is reachable from a formula, so this is the whole of what one
 * can depend on.
 */
export interface FormulaContext {
	/** The player's level, as derived from their experience (`levelForExp`). */
	level: number;
	/** Every card the player owns. */
	cards: readonly FormulaCard[];
}

/**
 * A formula that could not be parsed, carrying the offset it gave up at so an
 * editor can point at the character rather than only report the trouble.
 */
export class FormulaError extends Error {
	/** Index into the formula source where the trouble is. */
	readonly position: number;

	constructor(message: string, position: number) {
		super(message);
		this.name = 'FormulaError';
		this.position = position;
	}
}

/** The named sources a formula can read. */
export const FORMULA_SOURCES = ['level', 'cards'] as const;

// ---------------------------------------------------------------------------
// The card fields a `cards(...)` filter can test
// ---------------------------------------------------------------------------

/** One filterable field of a card. */
export interface CardFieldSpec {
	/** The card's value for this field, as a string, or null when it has none. */
	read(card: FormulaCard): string | null;
	/**
	 * The values the field accepts, or null when any word goes. A closed list is
	 * checked at parse time, so a filter can never be authored against a colour
	 * that does not exist and then quietly match nothing forever.
	 */
	values: readonly string[] | null;
	/** One line describing the field, for the admin's help. */
	hint: string;
}

/**
 * The fields a filter may test, keyed by the name written in the formula. Values
 * compare case-insensitively — a location id is upper-case on the card and
 * nobody should have to remember that.
 */
export const CARD_FIELDS: Readonly<Record<string, CardFieldSpec>> = {
	color: {
		read: (card) => card.color,
		values: Object.values(SpawnColor),
		hint: 'the colour rolled for the card'
	},
	box: {
		read: (card) => card.box,
		values: Object.values(SpawnBox),
		hint: 'the box stock it came out of'
	},
	character: {
		read: (card) => card.characterId,
		values: null,
		hint: 'the character id, e.g. son-goku'
	},
	show: {
		read: (card) => (card.showId === null ? null : String(card.showId)),
		values: null,
		hint: 'the TMDB show id it was rolled from'
	},
	location: {
		read: (card) => card.locationId,
		values: null,
		hint: 'the municipality it was claimed in, e.g. ES_08028'
	},
	team: {
		read: (card) => (card.teamSlot === null ? 'false' : 'true'),
		values: ['true', 'false'],
		hint: 'whether the card is fielded on the team'
	}
};

/** The filterable field names, in the order the admin lists them. */
export const CARD_FIELD_NAMES: readonly string[] = Object.keys(CARD_FIELDS);

// ---------------------------------------------------------------------------
// Syntax tree
// ---------------------------------------------------------------------------

/** An arithmetic operator, in the two precedences plus the exponent. */
export type FormulaOperator = '+' | '-' | '*' | '/' | '%' | '^';

/** A parsed formula. */
export type FormulaNode =
	| { kind: 'number'; value: number }
	| { kind: 'unary'; op: '+' | '-'; operand: FormulaNode }
	| { kind: 'binary'; op: FormulaOperator; left: FormulaNode; right: FormulaNode }
	/** The player's level. */
	| { kind: 'level' }
	/** How many owned cards match — all of them when the filter is null. */
	| { kind: 'cards'; filter: FilterNode | null };

/** A parsed `cards(...)` filter. */
export type FilterNode =
	| { kind: 'and'; left: FilterNode; right: FilterNode }
	| { kind: 'or'; left: FilterNode; right: FilterNode }
	| { kind: 'not'; operand: FilterNode }
	/** A field against one value (`=`, or `!=` negated) or several (`in [...]`). */
	| { kind: 'match'; field: string; negated: boolean; values: string[] };

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenKind = 'number' | 'word' | 'string' | 'punct' | 'end';

interface Token {
	kind: TokenKind;
	value: string;
	start: number;
	end: number;
}

const SPACE_RE = /\s+/y;
const NUMBER_RE = /[0-9]+(?:\.[0-9]+)?/y;
const WORD_RE = /[A-Za-z_][A-Za-z0-9_]*/y;
const STRING_RE = /'([^']*)'|"([^"]*)"/y;

/** Two-character operators, tried before the single characters they start with. */
const LONG_PUNCT = ['!=', '=='];
const SHORT_PUNCT = '()[],+-*/%^=';

/** Read a sticky regex at `at`, returning the match or null without moving on. */
function match(re: RegExp, source: string, at: number): RegExpExecArray | null {
	re.lastIndex = at;
	return re.exec(source);
}

function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let at = 0;
	while (at < source.length) {
		const space = match(SPACE_RE, source, at);
		if (space) {
			at += space[0].length;
			continue;
		}
		const number = match(NUMBER_RE, source, at);
		if (number) {
			tokens.push({ kind: 'number', value: number[0], start: at, end: at + number[0].length });
			at += number[0].length;
			continue;
		}
		const word = match(WORD_RE, source, at);
		if (word) {
			tokens.push({ kind: 'word', value: word[0], start: at, end: at + word[0].length });
			at += word[0].length;
			continue;
		}
		const string = match(STRING_RE, source, at);
		if (string) {
			tokens.push({
				kind: 'string',
				value: string[1] ?? string[2] ?? '',
				start: at,
				end: at + string[0].length
			});
			at += string[0].length;
			continue;
		}
		const long = LONG_PUNCT.find((punct) => source.startsWith(punct, at));
		if (long) {
			tokens.push({ kind: 'punct', value: long, start: at, end: at + long.length });
			at += long.length;
			continue;
		}
		if (SHORT_PUNCT.includes(source[at])) {
			tokens.push({ kind: 'punct', value: source[at], start: at, end: at + 1 });
			at += 1;
			continue;
		}
		throw new FormulaError(`Unexpected character "${source[at]}"`, at);
	}
	tokens.push({ kind: 'end', value: '', start: source.length, end: source.length });
	return tokens;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Recursive-descent parser over the token list. One instance parses one formula;
 * `parseFormula` is the only way in.
 */
class Parser {
	private readonly tokens: Token[];
	private index = 0;

	constructor(source: string) {
		this.tokens = tokenize(source);
	}

	private get current(): Token {
		return this.tokens[this.index];
	}

	private get previous(): Token {
		return this.tokens[this.index - 1];
	}

	/** Consume and return the current token. */
	private advance(): Token {
		const token = this.current;
		if (token.kind !== 'end') this.index++;
		return token;
	}

	/** Consume the current token if it is this punctuation; say whether it was. */
	private eat(punct: string): boolean {
		if (this.current.kind === 'punct' && this.current.value === punct) {
			this.index++;
			return true;
		}
		return false;
	}

	/** Consume the current token if it is this keyword (words, case-insensitive). */
	private eatWord(keyword: string): boolean {
		if (this.current.kind === 'word' && this.current.value.toLowerCase() === keyword) {
			this.index++;
			return true;
		}
		return false;
	}

	private expect(punct: string, what: string): void {
		if (!this.eat(punct)) {
			throw new FormulaError(`Expected ${what}`, this.current.start);
		}
	}

	// -- arithmetic -----------------------------------------------------------

	parse(): FormulaNode {
		if (this.current.kind === 'end') {
			throw new FormulaError('A formula cannot be empty', 0);
		}
		const node = this.expression();
		const trailing = this.current;
		if (trailing.kind !== 'end') {
			throw new FormulaError(`Unexpected "${trailing.value}"`, trailing.start);
		}
		return node;
	}

	private expression(): FormulaNode {
		let left = this.term();
		for (;;) {
			const op = this.eat('+') ? '+' : this.eat('-') ? '-' : null;
			if (!op) return left;
			left = { kind: 'binary', op, left, right: this.term() };
		}
	}

	private term(): FormulaNode {
		let left = this.power();
		for (;;) {
			const op = this.eat('*') ? '*' : this.eat('/') ? '/' : this.eat('%') ? '%' : null;
			if (!op) return left;
			left = { kind: 'binary', op, left, right: this.power() };
		}
	}

	/** `^` binds tighter than `*` and leans right, so `2^3^2` is `2^(3^2)`. */
	private power(): FormulaNode {
		const left = this.unary();
		if (!this.eat('^')) return left;
		return { kind: 'binary', op: '^', left, right: this.power() };
	}

	private unary(): FormulaNode {
		if (this.eat('-')) return { kind: 'unary', op: '-', operand: this.unary() };
		if (this.eat('+')) return { kind: 'unary', op: '+', operand: this.unary() };
		return this.atom();
	}

	private atom(): FormulaNode {
		if (this.current.kind === 'number') {
			return { kind: 'number', value: Number(this.advance().value) };
		}
		if (this.eat('(')) {
			const inner = this.expression();
			this.expect(')', 'a closing ")"');
			return inner;
		}
		if (this.current.kind === 'word') {
			return this.source();
		}
		throw new FormulaError(
			this.current.kind === 'end' ? 'The formula ends early' : `Unexpected "${this.current.value}"`,
			this.current.start
		);
	}

	/** `level`, or `cards` with an optional filter in parentheses. */
	private source(): FormulaNode {
		const token = this.advance();
		const name = token.value.toLowerCase();
		if (name === 'level') return { kind: 'level' };
		if (name === 'cards') {
			if (!this.eat('(')) return { kind: 'cards', filter: null };
			// `cards()` is `cards`: no filter, so every card counts.
			if (this.eat(')')) return { kind: 'cards', filter: null };
			const filter = this.filter();
			this.expect(')', 'a closing ")" for the card filter');
			return { kind: 'cards', filter };
		}
		throw new FormulaError(
			`Unknown value "${token.value}" — a formula can read ${FORMULA_SOURCES.join(' and ')}`,
			token.start
		);
	}

	// -- card filters ---------------------------------------------------------

	private filter(): FilterNode {
		let left = this.filterAnd();
		while (this.eatWord('or')) {
			left = { kind: 'or', left, right: this.filterAnd() };
		}
		return left;
	}

	/** `and`, with a comma as its shorthand: `cards(color = red, box = white)`. */
	private filterAnd(): FilterNode {
		let left = this.filterNot();
		for (;;) {
			if (!this.eatWord('and') && !this.eat(',')) return left;
			left = { kind: 'and', left, right: this.filterNot() };
		}
	}

	private filterNot(): FilterNode {
		if (this.eatWord('not')) return { kind: 'not', operand: this.filterNot() };
		if (this.eat('(')) {
			const inner = this.filter();
			this.expect(')', 'a closing ")"');
			return inner;
		}
		return this.comparison();
	}

	private comparison(): FilterNode {
		if (this.current.kind !== 'word') {
			throw new FormulaError(
				`Expected a card field (${CARD_FIELD_NAMES.join(', ')})`,
				this.current.start
			);
		}
		const fieldToken = this.advance();
		const field = fieldToken.value.toLowerCase();
		const spec = CARD_FIELDS[field];
		if (!spec) {
			throw new FormulaError(
				`Unknown card field "${fieldToken.value}" — one of ${CARD_FIELD_NAMES.join(', ')}`,
				fieldToken.start
			);
		}

		if (this.eatWord('in')) {
			this.expect('[', 'a "[" listing the values');
			const values: string[] = [];
			do {
				values.push(this.value(field, spec));
			} while (this.eat(','));
			this.expect(']', 'a closing "]"');
			return { kind: 'match', field, negated: false, values };
		}

		const negated = this.eat('!=');
		if (!negated && !this.eat('=') && !this.eat('==')) {
			throw new FormulaError(`Expected "=", "!=" or "in" after "${field}"`, this.current.start);
		}
		return { kind: 'match', field, negated, values: [this.value(field, spec)] };
	}

	/**
	 * One value on the right of a comparison. Barewords may contain hyphens —
	 * character ids are slugs and location ids are not — which is read off token
	 * adjacency rather than by widening the tokenizer, since a hyphen between two
	 * words with a space anywhere near it is a subtraction everywhere else.
	 */
	private value(field: string, spec: CardFieldSpec): string {
		const first = this.current;
		if (first.kind === 'string') {
			this.advance();
			return this.checkValue(field, spec, first.value, first.start);
		}
		if (first.kind !== 'word' && first.kind !== 'number') {
			throw new FormulaError(`Expected a value for "${field}"`, first.start);
		}
		this.advance();
		let text = first.value;
		while (
			this.current.kind === 'punct' &&
			this.current.value === '-' &&
			this.current.start === this.previous.end &&
			(this.tokens[this.index + 1]?.kind === 'word' ||
				this.tokens[this.index + 1]?.kind === 'number') &&
			this.tokens[this.index + 1].start === this.current.end
		) {
			this.advance();
			text += '-' + this.advance().value;
		}
		return this.checkValue(field, spec, text, first.start);
	}

	/** Hold a value against the field's closed list, when it has one. */
	private checkValue(field: string, spec: CardFieldSpec, value: string, at: number): string {
		if (spec.values && !spec.values.includes(value.toLowerCase())) {
			throw new FormulaError(
				`"${value}" is not a ${field} — one of ${spec.values.join(', ')}`,
				at
			);
		}
		return value;
	}
}

/**
 * Parse a formula into a tree, or throw {@link FormulaError}. Every mistake a
 * formula can contain is found here, so a parsed tree always evaluates.
 */
export function parseFormula(source: string): FormulaNode {
	return new Parser(source).parse();
}

/**
 * The reason a formula will not parse, or null when it parses cleanly. For the
 * many callers that want to report the trouble rather than handle it.
 */
export function formulaError(source: string): string | null {
	try {
		parseFormula(source);
		return null;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/** Whether one card satisfies a filter. */
function matches(card: FormulaCard, filter: FilterNode): boolean {
	switch (filter.kind) {
		case 'and':
			return matches(card, filter.left) && matches(card, filter.right);
		case 'or':
			return matches(card, filter.left) || matches(card, filter.right);
		case 'not':
			return !matches(card, filter.operand);
		case 'match': {
			const actual = CARD_FIELDS[filter.field].read(card);
			// A card with no value for the field (a pack rolled across all shows has
			// no show) is not any of the listed values, and so *is* `!=` every one.
			const hit =
				actual !== null &&
				filter.values.some((value) => value.toLowerCase() === actual.toLowerCase());
			return filter.negated ? !hit : hit;
		}
	}
}

/** How many of the player's cards a `cards(...)` node counts. */
function countCards(context: FormulaContext, filter: FilterNode | null): number {
	if (!filter) return context.cards.length;
	let total = 0;
	for (const card of context.cards) if (matches(card, filter)) total++;
	return total;
}

function evaluateNode(node: FormulaNode, context: FormulaContext): number {
	switch (node.kind) {
		case 'number':
			return node.value;
		case 'level':
			return Number.isFinite(context.level) ? context.level : 0;
		case 'cards':
			return countCards(context, node.filter);
		case 'unary': {
			const value = evaluateNode(node.operand, context);
			return node.op === '-' ? -value : value;
		}
		case 'binary': {
			const left = evaluateNode(node.left, context);
			const right = evaluateNode(node.right, context);
			switch (node.op) {
				case '+':
					return left + right;
				case '-':
					return left - right;
				case '*':
					return left * right;
				case '/':
					return right === 0 ? 0 : left / right;
				case '%':
					return right === 0 ? 0 : left % right;
				case '^':
					return left ** right;
			}
		}
	}
}

/**
 * The number a formula produces for one player. Takes source text or an
 * already-parsed tree; unparseable source reads as 0 rather than throwing,
 * because a badge on screen has to show something and the place a formula's
 * mistakes are reported is the editor that wrote it.
 *
 * The result is always finite: a division or modulo by zero is 0, and so is
 * anything that overflows or lands on NaN.
 */
export function evaluateFormula(
	formula: string | FormulaNode,
	context: FormulaContext
): number {
	let node: FormulaNode;
	if (typeof formula === 'string') {
		try {
			node = parseFormula(formula);
		} catch {
			return 0;
		}
	} else {
		node = formula;
	}
	const value = evaluateNode(node, context);
	return Number.isFinite(value) ? value : 0;
}

/**
 * A formula's value as it goes into a line of text: whole numbers plain, anything
 * else to two decimals with no trailing zeros, so `level / 2` reads as `2.5` and
 * `level * 2` as `10` rather than `10.00`.
 */
export function formatFormulaValue(value: number): string {
	if (!Number.isFinite(value)) return '0';
	if (Number.isInteger(value)) return String(value);
	return String(Math.round(value * 100) / 100);
}
