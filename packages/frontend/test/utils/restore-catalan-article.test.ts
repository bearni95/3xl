import { describe, it, expect } from 'vitest';
import restoreCatalanArticle from '$utils/string/restore-catalan-article';

describe('restoreCatalanArticle', () => {
	it("rejoins the apostrophe article (L') directly to the name", () => {
		expect(restoreCatalanArticle("Hospitalet de Llobregat, L'")).toBe(
			"L'Hospitalet de Llobregat"
		);
		expect(restoreCatalanArticle("Atzúbia, l'")).toBe("L'Atzúbia");
	});

	it('rejoins el/la/els/les with a space and capitalises the article', () => {
		expect(restoreCatalanArticle('Campello, el')).toBe('El Campello');
		expect(restoreCatalanArticle('Nucia, la')).toBe('La Nucia');
		expect(restoreCatalanArticle('Poblets, els')).toBe('Els Poblets');
		expect(restoreCatalanArticle('Cabanyes, Les')).toBe('Les Cabanyes');
	});

	it('rejoins the Balearic salat articles es/sa/ses', () => {
		expect(restoreCatalanArticle('Mercadal, Es')).toBe('Es Mercadal');
		expect(restoreCatalanArticle('Pobla, Sa')).toBe('Sa Pobla');
		expect(restoreCatalanArticle('Salines, Ses')).toBe('Ses Salines');
	});

	it('only sheds the trailing comma-part, keeping earlier commas', () => {
		expect(restoreCatalanArticle("Ràfol d'Almúnia, el")).toBe("El Ràfol d'Almúnia");
	});

	it('leaves names without a trailing article untouched', () => {
		expect(restoreCatalanArticle('Barcelona')).toBe('Barcelona');
		expect(restoreCatalanArticle('Castell de Guadalest')).toBe('Castell de Guadalest');
		expect(restoreCatalanArticle('Fondó de les Neus, el / Hondón de las Nieves')).toBe(
			'Fondó de les Neus, el / Hondón de las Nieves'
		);
	});
});
