import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The pseudo-locale is the app's own catalogue with every value blanked, so it is
// generated from the catalogue the app actually registers. Only the key set matters —
// the values all become QQQQQ — which is precisely why it has to be this file: a key
// added to ca.json and missed here would leave a qq run quietly falling back.
const sourcePath = join(__dirname, '../src/services/i18n/locales/ca.json');
const qqPath = join(__dirname, '../src/services/i18n/locales/qq.json');

/**
 * Recursively replace all string values with 'QQQQQ'
 */
function replaceWithQQ(obj) {
	if (typeof obj === 'string') {
		return 'QQQQQ';
	}

	if (Array.isArray(obj)) {
		return obj.map(replaceWithQQ);
	}

	if (obj !== null && typeof obj === 'object') {
		const result = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = replaceWithQQ(value);
		}
		return result;
	}

	return obj;
}

try {
	// Read the app's catalogue
	const sourceContent = readFileSync(sourcePath, 'utf-8');
	const sourceData = JSON.parse(sourceContent);

	// Replace all values with 'QQQQQ'
	const qqData = replaceWithQQ(sourceData);

	// Write the QQ translation file
	writeFileSync(qqPath, JSON.stringify(qqData, null, '\t'));

	console.log('✓ Generated qq.json successfully');
} catch (error) {
	console.error('Error generating qq.json:', error);
	process.exit(1);
}
