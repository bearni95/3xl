/**
 * One-shot MUGEN character importer.
 *
 * Takes the raw archives an author drops into `mugen-characters/` (.rar/.zip
 * straight off a MUGEN site) and turns each into a fully wired, playable
 * character with no manual steps:
 *
 *   mugen-characters/<Something>.rar
 *     → extract to a temp dir
 *     → locate the character's .sff / .air / .def (via the .def [Files] section)
 *     → copy those into static/<id>/
 *     → decode frames + manifest.json  (reuses scripts/generate-sprites.js)
 *     → auto-bind a static/characters/<id>.json definition from the manifest
 *     → regenerate the src/data/characters.ts registry from disk
 *
 * Run with `pnpm import:mugen` (all archives) or `pnpm import:mugen Foo.rar Bar`
 * to import a subset. Existing definitions are never clobbered — hand-tuned
 * bindings in static/characters/<id>.json are preserved across re-runs — so the
 * script is safe to run repeatedly.
 *
 * Requires the `unar` CLI (brew install unar) for archive extraction.
 */
import { execFileSync } from 'child_process';
import {
	readdirSync,
	readFileSync,
	writeFileSync,
	mkdtempSync,
	mkdirSync,
	copyFileSync,
	rmSync,
	existsSync
} from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname, basename } from 'path';
import { tmpdir } from 'os';
import { buildCharacter, resolveRelPath, STATIC_DIR, STANDARD_NAMES } from './generate-sprites.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARCHIVES_DIR = join(ROOT, 'mugen-characters');
const DEFINITIONS_DIR = join(STATIC_DIR, 'characters');
const REGISTRY_FILE = join(ROOT, 'src/data/characters.ts');

const ARCHIVE_EXTS = new Set(['.rar', '.zip', '.7z']);

// ---------------------------------------------------------------------------
// Small filesystem helpers
// ---------------------------------------------------------------------------

/** Recursively list every file path under `dir`. */
function walkFiles(dir) {
	const out = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walkFiles(full));
		else if (entry.isFile()) out.push(full);
	}
	return out;
}

/**
 * Resolve a filename referenced by a .def against a directory, case- and
 * separator-insensitively — MUGEN .def files routinely mismatch the real case
 * (e.g. `sprite = Goku.SFF` for a file named `goku.sff`). Returns the real
 * on-disk basename, or null when nothing matches.
 */
function resolveInDir(dir, name) {
	if (!name) return null;
	const target = basename(name.replace(/\\/g, '/')).toLowerCase();
	for (const entry of readdirSync(dir)) {
		if (entry.toLowerCase() === target) return entry;
	}
	return null;
}

/** First file in `dir` with the given (lower-cased) extension, or null. */
function firstWithExt(dir, ext) {
	for (const entry of readdirSync(dir)) {
		if (extname(entry).toLowerCase() === ext) return entry;
	}
	return null;
}

// ---------------------------------------------------------------------------
// MUGEN character discovery
// ---------------------------------------------------------------------------

/**
 * Pull the file references out of a .def [Files] section: sprite (.sff), anim
 * (.air), the command file (.cmd), every character state file (st, st0-st9;
 * `stcommon` is the engine-shared common1.cns and is deliberately skipped) and
 * the palette files (pal1-pal12 — SFF v1 characters often need pal1 for their
 * real colors, the embedded shared palette being a black placeholder).
 */
function parseDefFiles(defText) {
	const grab = (key) => {
		const m = defText.match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^";\\r\\n]*)`, 'im'));
		return m ? m[1].trim() : '';
	};
	const stFiles = [grab('st')];
	for (let i = 0; i <= 9; i++) stFiles.push(grab(`st${i}`));
	const palFiles = [];
	for (let i = 1; i <= 12; i++) palFiles.push(grab(`pal${i}`));
	return {
		sprite: grab('sprite'),
		anim: grab('anim'),
		cmd: grab('cmd'),
		stFiles: stFiles.filter(Boolean),
		palFiles: palFiles.filter(Boolean)
	};
}

/**
 * Character state files found by extension when the .def declares none — .cns
 * and .st, minus anything common-looking (common1.cns is engine boilerplate).
 */
function stateFilesByExt(dir) {
	return readdirSync(dir).filter(
		(f) => ['.cns', '.st'].includes(extname(f).toLowerCase()) && !/common/i.test(f)
	);
}

/**
 * Locate the character inside an extracted archive. Prefers a .def whose [Files]
 * section resolves to a real .sff (+ .air) in the same folder; falls back to the
 * first .sff found paired with a sibling .air. Returns { dir, sff, air, def }
 * (basenames within `dir`) or null when no usable character is present.
 */
function locateCharacter(stageDir) {
	const files = walkFiles(stageDir);
	const defs = files.filter((f) => extname(f).toLowerCase() === '.def');

	for (const defPath of defs) {
		const dir = dirname(defPath);
		const { sprite, anim, cmd, stFiles, palFiles } = parseDefFiles(readFileSync(defPath, 'latin1'));
		const sff = resolveInDir(dir, sprite);
		if (!sff) continue; // This .def points elsewhere (alt palette/mode def) — skip.
		const air = resolveInDir(dir, anim) ?? firstWithExt(dir, '.air');
		if (!air) continue;
		const cmdFile = resolveRelPath(dir, cmd) ?? firstWithExt(dir, '.cmd');
		const declared = stFiles.map((f) => resolveRelPath(dir, f)).filter(Boolean);
		const sts = [...new Set(declared.length > 0 ? declared : stateFilesByExt(dir))];
		const pals = [...new Set(palFiles.map((f) => resolveRelPath(dir, f)).filter(Boolean))];
		return { dir, sff, air, def: basename(defPath), cmd: cmdFile, sts, pals };
	}

	// No .def resolved — pair the first .sff with a sibling .air.
	const sffPath = files.find((f) => extname(f).toLowerCase() === '.sff');
	if (sffPath) {
		const dir = dirname(sffPath);
		const air = firstWithExt(dir, '.air');
		if (air) {
			return {
				dir,
				sff: basename(sffPath),
				air,
				def: null,
				cmd: firstWithExt(dir, '.cmd'),
				sts: stateFilesByExt(dir),
				pals: []
			};
		}
	}

	return null;
}

/** Turn an archive filename into a stable, filesystem-safe character id. */
function slugify(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Core id slug of an archive name — the stem minus its author tag. */
function coreId(archiveName) {
	const stem = basename(archiveName, extname(archiveName));
	return slugify(stem.replace(/\([^)]*\)/g, '')) || slugify(stem);
}

/**
 * Find the id a previous run gave this same archive: an existing static/<id>/
 * folder whose id derives from this archive's name and which already holds the
 * same .sff. Lets re-imports refresh a character in place instead of minting a
 * `kikyo-2` style duplicate. The tag-qualified id is checked before the bare
 * core so `Moon (HSM).rar` re-binds to `moon-hsm`, never steals `moon` from
 * `Moon (Aquadora).rar`. Returns null for first-time imports.
 */
function findExistingId(archiveName, sff) {
	const stem = basename(archiveName, extname(archiveName));
	const paren = stem.match(/\(([^)]*)\)/);
	const core = coreId(archiveName);
	const target = sff.toLowerCase();

	const holdsSff = (id) => {
		const dir = join(STATIC_DIR, id);
		return existsSync(dir) && readdirSync(dir).some((f) => f.toLowerCase() === target);
	};

	if (paren && holdsSff(`${core}-${slugify(paren[1])}`)) return `${core}-${slugify(paren[1])}`;
	if (holdsSff(core)) return core;
	return null;
}

/**
 * Derive a unique id for an archive. Drops the parenthetical author tag
 * (`Kagome (VinceJ)` → `kagome`); on collision with an already-claimed id it
 * folds that tag back in, then falls back to numeric suffixes.
 */
function deriveId(archiveName, taken) {
	const stem = basename(archiveName, extname(archiveName));
	const paren = stem.match(/\(([^)]*)\)/);
	const core = coreId(archiveName);

	if (!taken.has(core)) return core;
	if (paren) {
		const withTag = `${core}-${slugify(paren[1])}`;
		if (withTag && !taken.has(withTag)) return withTag;
	}
	let n = 2;
	while (taken.has(`${core}-${n}`)) n++;
	return `${core}-${n}`;
}

// ---------------------------------------------------------------------------
// MUGEN moveset extraction (.cmd commands + .cns/.st states)
// ---------------------------------------------------------------------------
//
// A character's attacks live across two file kinds: the .cmd declares input
// commands ([Command] blocks) and the [State -1] ChangeState triggers that map
// those inputs to state numbers, while the .cns/.st state files define each
// state ([Statedef N] — animation, movetype) and its HitDefs (damage). We
// parse all of it into a static/<id>/mugen-moves.json the admin page can fetch.

/**
 * Split a MUGEN ini-ish file into `[header]` sections. Comments (`;`) and
 * blank lines are dropped; lines before the first header are ignored.
 */
function parseSections(text) {
	const sections = [];
	let current = null;
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.split(';')[0].trim();
		if (!line) continue;
		const header = line.match(/^\[(.+)\]$/);
		if (header) {
			current = { header: header[1].trim(), lines: [] };
			sections.push(current);
			continue;
		}
		if (current) current.lines.push(line);
	}
	return sections;
}

/**
 * Every `[Command]` block, as a name → input-notation map. A name declared
 * multiple times (alternate inputs for the same command) keeps its first input.
 */
function parseCommands(sections) {
	const commands = new Map();
	for (const section of sections) {
		if (section.header.toLowerCase() !== 'command') continue;
		let name = '';
		let input = '';
		for (const line of section.lines) {
			let m;
			if ((m = line.match(/^name\s*=\s*"?([^"]*)"?\s*$/i))) name = m[1].trim();
			else if ((m = line.match(/^command\s*=\s*(.+)$/i))) input = m[1].trim();
		}
		if (name && !commands.has(name)) commands.set(name, input);
	}
	return commands;
}

/**
 * Every `[State -1, Label]` ChangeState in the .cmd: which state it jumps to,
 * its human label, and the command names that trigger it. `command != "..."`
 * exclusions are not triggers and are ignored (the `\s*=` after `command`
 * cannot match the `!` of a `!=`).
 */
function parseTriggeredStates(sections) {
	const triggered = [];
	for (const section of sections) {
		const header = section.header.match(/^state\s*-1\s*(?:,\s*(.*))?$/i);
		if (!header) continue;
		let type = '';
		let value = NaN;
		const commands = [];
		for (const line of section.lines) {
			let m;
			if ((m = line.match(/^type\s*=\s*(\w+)/i))) type = m[1];
			else if ((m = line.match(/^value\s*=\s*(-?\d+)/i))) value = Number(m[1]);
			if ((m = line.match(/^trigger\w*\s*=.*?\bcommand\s*=\s*"([^"]+)"/i))) {
				if (!commands.includes(m[1])) commands.push(m[1]);
			}
		}
		if (type.toLowerCase() !== 'changestate' || Number.isNaN(value)) continue;
		triggered.push({ label: (header[1] ?? '').trim(), stateNo: value, commands });
	}
	return triggered;
}

/**
 * Fold a state file's sections into `states` (stateNo → { anim, movetype,
 * damage, anims, targets }). `[State N, …]` blocks belong to the preceding
 * [Statedef] (MUGEN ignores the number in state headers). Besides the statedef
 * header params we track every animation the state can play (`anims`: header
 * anim + ChangeAnim values, in order) and every internal ChangeState/SelfState
 * target (`targets`) — multi-part moves chain through follow-up states that
 * hold the real animation and HitDef. First definition wins on re-declares;
 * `1000+var(x)` style expressions contribute their leading constant.
 */
function parseStates(sections, states = new Map()) {
	let current = null;
	for (const section of sections) {
		const def = section.header.match(/^statedef\s+(-?\d+)/i);
		if (def) {
			const stateNo = Number(def[1]);
			current = states.get(stateNo) ?? {
				anim: null,
				movetype: '',
				damage: null,
				anims: [],
				targets: []
			};
			states.set(stateNo, current);
			for (const line of section.lines) {
				let m;
				if ((m = line.match(/^anim\s*=\s*(-?\d+)/i))) {
					current.anim ??= Number(m[1]);
					current.anims.push(Number(m[1]));
				} else if ((m = line.match(/^movetype\s*=\s*([A-Za-z])/i)))
					current.movetype ||= m[1].toUpperCase();
			}
			continue;
		}
		if (!current || !/^state\b/i.test(section.header)) continue;
		const type = section.lines
			.find((l) => /^type\s*=/i.test(l))
			?.match(/^type\s*=\s*(\w+)/i)?.[1]
			.toLowerCase();
		const value = section.lines
			.find((l) => /^value\s*=\s*\d/i.test(l))
			?.match(/^value\s*=\s*(\d+)/i)?.[1];
		if (type === 'hitdef' || type === 'projectile') {
			for (const line of section.lines) {
				const m = line.match(/^damage\s*=\s*(-?\d+)/i);
				if (m && current.damage == null) current.damage = Number(m[1]);
			}
		} else if ((type === 'changeanim' || type === 'changeanim2') && value != null) {
			current.anims.push(Number(value));
		} else if ((type === 'changestate' || type === 'selfstate') && value != null) {
			current.targets.push(Number(value));
		}
	}
	return states;
}

/**
 * Assemble the full imported moveset for a character whose raw files sit in
 * `dir`. Triggers firing the same state (ground/air variants, CPU/human
 * duplicates) merge into one move; the label of a command-triggered (human)
 * entry wins over an AI-only one. `animation` is the manifest key the state's
 * anim number decodes to, verified against the manifest ('' when absent).
 */
function extractMoveset(dir, cmdFile, stFiles, manifest) {
	const readSections = (file) => parseSections(readFileSync(join(dir, file), 'latin1'));
	const cmdSections = readSections(cmdFile);
	const commands = parseCommands(cmdSections);
	const triggered = parseTriggeredStates(cmdSections);

	// States live in the .cns/.st files and occasionally in the .cmd itself.
	const states = new Map();
	for (const file of [...stFiles, cmdFile]) parseStates(readSections(file), states);

	const byState = new Map();
	for (const t of triggered) {
		const move = byState.get(t.stateNo) ?? { label: '', labelHasCommand: false, commands: [] };
		if (t.label && (!move.label || (!move.labelHasCommand && t.commands.length > 0))) {
			move.label = t.label;
			move.labelHasCommand = t.commands.length > 0;
		}
		for (const c of t.commands) if (!move.commands.includes(c)) move.commands.push(c);
		byState.set(t.stateNo, move);
	}

	const animationKey = (anim) => {
		if (anim == null) return '';
		const key = STANDARD_NAMES[anim] ?? `action-${anim}`;
		return manifest.animations?.[key] ? key : '';
	};

	// Walk every state a move passes through: multi-part moves chain via
	// internal ChangeState/SelfState into follow-up states holding the real
	// animation and HitDef. Jumps back below 200 (idle/movement/guard) end the
	// move and are not followed.
	const resolveChain = (stateNo) => {
		const anims = [];
		let damage = null;
		let movetype = '';
		const visited = new Set();
		const queue = [stateNo];
		while (queue.length > 0 && visited.size < 16) {
			const no = queue.shift();
			if (visited.has(no)) continue;
			visited.add(no);
			const state = states.get(no);
			if (!state) continue;
			anims.push(...state.anims);
			damage ??= state.damage;
			movetype ||= state.movetype;
			queue.push(...state.targets.filter((t) => t >= 200));
		}
		return { anims, damage, movetype };
	};

	const moves = [...byState.entries()]
		.sort(([a], [b]) => a - b)
		.map(([stateNo, { label, commands: cmds }]) => {
			const own = states.get(stateNo);
			const { anims, damage, movetype } = resolveChain(stateNo);
			// The move's signature animation. Chained moves open on a shared
			// startup anim and switch to their own later, so prefer an anim
			// numbered with/right after the state (the near-universal authoring
			// convention), then the statedef's own starting anim, then anything
			// else the chain plays, then the raw stateNo (engine-common states —
			// jump, guard, … — play the anim of their own number).
			const candidates = [
				...anims.filter((a) => a >= stateNo && a < stateNo + 20),
				...(own?.anim != null ? [own.anim] : []),
				...anims,
				stateNo
			];
			const animation = candidates.map(animationKey).find((key) => key !== '') ?? '';
			return {
				name: label || cmds[0] || `State ${stateNo}`,
				stateNo,
				commands: cmds,
				inputs: cmds.map((c) => commands.get(c) ?? ''),
				movetype,
				damage,
				anim: own?.anim ?? null,
				animation
			};
		});

	return {
		name: manifest.name,
		commands: [...commands.entries()].map(([name, input]) => ({ name, input })),
		moves
	};
}

// ---------------------------------------------------------------------------
// Definition auto-binding
// ---------------------------------------------------------------------------

/**
 * Auto-bind a CharacterDefinition from the raw manifest animation keys, using
 * MUGEN's standard action-number conventions. Movement/direction slots are
 * always present (empty source '' when unmapped); moves are a per-character
 * list — one seeded entry per shared move type we can confidently map, each
 * tagged with its type and given a starter name for the /admin/characters
 * editor to rename. Keeps the same shape the write API validates, so these
 * files round-trip cleanly through the editor.
 */
function autoBindDefinition(id, manifest, basePath) {
	const keys = new Set(Object.keys(manifest.animations ?? {}));
	const has = (name) => keys.has(name);
	const pick = (...names) => names.find(has) ?? '';
	// First raw `action-<N>` key whose number falls in [lo, hi].
	const pickRange = (lo, hi) => {
		for (const key of keys) {
			const m = key.match(/^action-(\d+)$/);
			if (m) {
				const n = Number(m[1]);
				if (n >= lo && n <= hi) return key;
			}
		}
		return '';
	};

	return {
		id,
		label: manifest.name || id,
		basePath,
		animations: {
			idle: { source: pick('idle'), loop: true },
			jump: { source: pick('jump', 'jump-start'), loop: false },
			fall: { source: pick('fall'), loop: false },
			hurt: { source: pick('action-5000') || pickRange(5000, 5099), loop: false }
		},
		directions: {
			'move-left': { source: pick('walk-back', 'walk'), loop: true },
			'move-right': { source: pick('run', 'walk'), loop: true }
		},
		// One seeded move per type we can map; unmappable types are simply absent
		// (the editor adds them). Projectiles are too character-specific to guess
		// reliably — the binding ships empty for the admin editor to fill in.
		moves: [
			{ name: 'Melee', type: 'melee', source: pickRange(200, 299) },
			{
				name: 'Ranged',
				type: 'ranged',
				source: pickRange(1000, 1999),
				projectile: { source: '', loop: true }
			},
			{
				name: 'Final',
				type: 'final',
				source: pickRange(3000, 3999) || pickRange(2000, 2999),
				projectile: { source: '', loop: true }
			},
			{ name: 'Defent', type: 'defent', source: pick('guard-stand', 'guard-crouch') }
		].filter((move) => move.source !== ''),
		stats: { atk: 5, def: 5, hp: 5 }
	};
}

// ---------------------------------------------------------------------------
// Registry regeneration
// ---------------------------------------------------------------------------

/** Rewrite src/data/characters.ts from every definition JSON on disk. */
function regenerateRegistry() {
	const defs = readdirSync(DEFINITIONS_DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => JSON.parse(readFileSync(join(DEFINITIONS_DIR, f), 'utf-8')))
		// Only list characters whose decoded frames actually exist.
		.filter((d) => existsSync(join(STATIC_DIR, d.id, 'frames', 'manifest.json')))
		.sort((a, b) => a.label.localeCompare(b.label));

	// Single-quote strings to match the repo's Prettier style; escape any quote
	// the display name might contain.
	const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
	const entries = defs
		.map(
			(d) => `\t{ id: ${quote(d.id)}, label: ${quote(d.label)}, basePath: ${quote(d.basePath)} }`
		)
		.join(',\n');

	const contents = `/**
 * Registry of playable MUGEN characters. Each entry points at a folder under
 * the static root produced by scripts/generate-sprites.js (manifest.json +
 * frame PNGs).
 *
 * This file is generated by scripts/import-mugen.js from the character
 * definitions in static/characters/*.json — run \`pnpm import:mugen\` to add
 * characters rather than editing it by hand.
 */
export interface CharacterOption {
	/** Stable id, matches the static/<id>/ folder name. */
	id: string;
	/** Human-readable name shown in the picker. */
	label: string;
	/** Folder (relative to the static root) with manifest.json + frames. */
	basePath: string;
}

export const characters: CharacterOption[] = [
${entries}
];

export const defaultCharacterId = characters[0].id;
`;

	writeFileSync(REGISTRY_FILE, contents, 'utf-8');
	return defs.length;
}

// ---------------------------------------------------------------------------
// Import one archive
// ---------------------------------------------------------------------------

function importArchive(archivePath, taken) {
	const name = basename(archivePath);
	const stage = mkdtempSync(join(tmpdir(), 'mugen-import-'));
	try {
		execFileSync('unar', ['-quiet', '-force-overwrite', '-output-directory', stage, archivePath], {
			stdio: 'ignore'
		});

		const found = locateCharacter(stage);
		if (!found) {
			console.warn(`  ⚠ ${name}: no .sff/.air pair found — skipped`);
			return null;
		}

		const id = findExistingId(name, found.sff) ?? deriveId(name, taken);
		taken.add(id);

		// Copy the raw MUGEN files into static/<id>/ so generate-sprites can decode
		// them (and so a re-run / `pnpm gen:sprites` stays reproducible). The .cmd
		// and state files ride along so the moveset extraction is reproducible too.
		const destDir = join(STATIC_DIR, id);
		mkdirSync(destDir, { recursive: true });
		copyFileSync(join(found.dir, found.sff), join(destDir, found.sff));
		copyFileSync(join(found.dir, found.air), join(destDir, found.air));
		// Subfolder references (Luffy_unotag/Luffy.cmd) flatten to their basename.
		const cmdFile = found.cmd ? basename(found.cmd) : null;
		const stFiles = [...new Set(found.sts.map((f) => basename(f)))];
		for (const [src, dest] of [
			...(found.cmd ? [[found.cmd, cmdFile]] : []),
			...found.sts.map((f) => [f, basename(f)])
		]) {
			copyFileSync(join(found.dir, src), join(destDir, dest));
		}
		// Palette .act files keep their relative paths (pal/rice/kagura1.act) so
		// the .def's palN references still resolve when the decoder looks them up.
		for (const pal of found.pals) {
			mkdirSync(dirname(join(destDir, pal)), { recursive: true });
			copyFileSync(join(found.dir, pal), join(destDir, pal));
		}

		let defFile = found.def;
		if (defFile) {
			copyFileSync(join(found.dir, defFile), join(destDir, defFile));
		} else {
			// Archive shipped no .def — synthesise a minimal one so the decoder still
			// gets a display name and file mapping.
			defFile = `${id}.def`;
			const label =
				basename(name, extname(name))
					.replace(/\([^)]*\)/g, '')
					.trim() || id;
			writeFileSync(
				join(destDir, defFile),
				`[Info]\nname = "${label}"\nauthor = "Unknown"\n\n[Files]\nsprite = ${found.sff}\nanim = ${found.air}\n`
			);
		}

		const manifest = buildCharacter({ dir: id, sff: found.sff, air: found.air, def: defFile });

		// Extract the raw MUGEN moveset into a fetchable JSON next to the frames.
		// Always rewritten — it is generated data, never hand-edited.
		if (cmdFile) {
			const moveset = extractMoveset(destDir, cmdFile, stFiles, manifest);
			writeFileSync(
				join(destDir, 'mugen-moves.json'),
				JSON.stringify(moveset, null, '\t') + '\n',
				'utf-8'
			);
			console.log(`    ↳ ${moveset.moves.length} MUGEN move(s) → static/${id}/mugen-moves.json`);
		} else {
			console.warn(`    ⚠ no .cmd file found — skipped moveset extraction`);
		}

		// Write a definition only when one doesn't already exist, so hand-tuned
		// bindings in the /admin editor survive re-imports.
		const defJsonPath = join(DEFINITIONS_DIR, `${id}.json`);
		if (existsSync(defJsonPath)) {
			console.log(`    ↳ definition static/characters/${id}.json exists — kept as-is`);
		} else {
			const definition = autoBindDefinition(id, manifest, `/${id}/frames`);
			writeFileSync(defJsonPath, JSON.stringify(definition, null, '\t') + '\n', 'utf-8');
		}

		return id;
	} catch (error) {
		console.error(`  ✗ ${name}: ${error instanceof Error ? error.message : error}`);
		return null;
	} finally {
		rmSync(stage, { recursive: true, force: true });
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	if (!existsSync(ARCHIVES_DIR)) {
		console.error(`No mugen-characters/ directory at ${ARCHIVES_DIR}`);
		process.exit(1);
	}
	mkdirSync(DEFINITIONS_DIR, { recursive: true });

	// Optional CLI args select a subset of archives (by name substring).
	const filters = process.argv.slice(2).map((a) => a.toLowerCase());
	const archives = readdirSync(ARCHIVES_DIR)
		.filter((f) => ARCHIVE_EXTS.has(extname(f).toLowerCase()))
		.filter(
			(f) => filters.length === 0 || filters.some((needle) => f.toLowerCase().includes(needle))
		)
		.sort()
		.map((f) => join(ARCHIVES_DIR, f));

	if (archives.length === 0) {
		console.error('No matching archives found in mugen-characters/.');
		process.exit(1);
	}

	// Reserve ids already claimed by characters on disk so re-runs don't collide
	// with (or clobber) existing folders.
	const taken = new Set(
		readdirSync(STATIC_DIR, { withFileTypes: true })
			.filter((e) => e.isDirectory() && e.name !== 'characters')
			.map((e) => e.name)
	);

	console.log(`Importing ${archives.length} archive(s) from mugen-characters/\n`);
	const imported = [];
	for (const archive of archives) {
		console.log(`• ${basename(archive)}`);
		const id = importArchive(archive, taken);
		if (id) imported.push(id);
	}

	const total = regenerateRegistry();
	console.log(`\nImported ${imported.length}/${archives.length} archive(s).`);
	console.log(`Registry src/data/characters.ts now lists ${total} character(s).`);
}

main();
