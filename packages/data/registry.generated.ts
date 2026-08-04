/**
 * Registry of playable MUGEN characters. Each entry points at a folder served
 * from the @3xl/assets package (manifest.json + frame PNGs) under `/assets/`.
 *
 * GENERATED from the character definitions in @3xl/data's
 * public/characters/<id>/definition.json by @3xl/mugen's registry.js — run
 * `pnpm import:mugen` to add characters rather than editing this file by hand.
 */
import type { CharacterOption } from './index';

export const registry: CharacterOption[] = [
	{ id: 'g6-androide-18', label: 'A-18', basePath: '/assets/g6-androide-18/frames', author: 'CobraG6' },
	{ id: 'beauty', label: 'Beauty', basePath: '/assets/beauty/frames', author: 'TYOwwOMAww' },
	{ id: 'bobobo', label: 'Bobobo', basePath: '/assets/bobobo/frames', author: 'Edtion' },
	{ id: 'brook', label: 'Brook', basePath: '/assets/brook/frames', author: 'Kenshiro99' },
	{ id: 'eb-perfectcell-kofm', label: 'Cèl·lula', basePath: '/assets/eb-perfectcell-kofm/frames', author: 'boryema' },
	{ id: 'chopper', label: 'Chopper', basePath: '/assets/chopper/frames', author: 'Kenshiro99' },
	{ id: 'piccolo', label: 'Cor Petit', basePath: '/assets/piccolo/frames', author: 'HIDDENSAGE121' },
	{ id: 'denbo', label: 'Denbo', basePath: '/assets/denbo/frames', author: 'ju' },
	{ id: 'dengaku-man', label: 'Dengaku Man', basePath: '/assets/dengaku-man/frames', author: 'ju' },
	{ id: 'dororo', label: 'Dororo', basePath: '/assets/dororo/frames', author: 'redblueyellow' },
	{ id: 'eva-00', label: 'EVA 00', basePath: '/assets/eva-00/frames', author: 'TonyADV' },
	{ id: 'evaunit01', label: 'EVA 01', basePath: '/assets/evaunit01/frames', author: 'TonyADV' },
	{ id: '02', label: 'EVA 02', basePath: '/assets/02/frames', author: 'Unknown' },
	{ id: 'unit04', label: 'EVA 04', basePath: '/assets/unit04/frames', author: 'TonyADV' },
	{ id: 'unit05', label: 'EVA 05', basePath: '/assets/unit05/frames', author: 'TonyADV' },
	{ id: 'franky', label: 'Franky', basePath: '/assets/franky/frames', author: 'Kenshiro99' },
	{ id: 'frieza', label: 'Frizer', basePath: '/assets/frieza/frames', author: 'CHOUJIN' },
	{ id: 'giroro', label: 'Giroro', basePath: '/assets/giroro/frames', author: 'redblueyellow' },
	{ id: 'gokufz', label: 'Goku', basePath: '/assets/gokufz/frames', author: 'Alizzon' },
	{ id: 'gotenks', label: 'Gotrunks', basePath: '/assets/gotenks/frames', author: 'Kenshiro99' },
	{ id: 'captain-battleship', label: 'Gunkan', basePath: '/assets/captain-battleship/frames', author: 'ju' },
	{ id: 'halekulani', label: 'Halekulani', basePath: '/assets/halekulani/frames', author: 'ju' },
	{ id: 'hatenko', label: 'Hatenko', basePath: '/assets/hatenko/frames', author: 'ju' },
	{ id: 'hikaru', label: 'Hikaru Hiyama', basePath: '/assets/hikaru/frames', author: 'Brucewayne74' },
	{ id: 'service-man', label: 'Home De Franc', basePath: '/assets/service-man/frames', author: 'ju' },
	{ id: 'inuyasha', label: 'Inuyasha', basePath: '/assets/inuyasha/frames', author: 'Meta Gouki' },
	{ id: 'kagome', label: 'Kagome', basePath: '/assets/kagome/frames', author: 'VinceJ' },
	{ id: 'kagura', label: 'Kagura', basePath: '/assets/kagura/frames', author: 'RicePigeon' },
	{ id: 'keroro', label: 'Keroro', basePath: '/assets/keroro/frames', author: 'Ploaj' },
	{ id: 'kikyo', label: 'Kikyo', basePath: '/assets/kikyo/frames', author: 'RicePigeon' },
	{ id: 'koga', label: 'Koga', basePath: '/assets/koga/frames', author: 'Nexus Gaming' },
	{ id: 'krillin', label: 'Krillin', basePath: '/assets/krillin/frames', author: 'Stig87' },
	{ id: 'kululu', label: 'Kululu', basePath: '/assets/kululu/frames', author: 'redblueyellow' },
	{ id: 'kyosuke', label: 'Kyosuke Kasuga', basePath: '/assets/kyosuke/frames', author: 'Brucewayne74' },
	{ id: 'madoka', label: 'Madoka Ayukawa', basePath: '/assets/madoka/frames', author: 'Brucewayne74' },
	{ id: 'fatbuu', label: 'Majin Buu', basePath: '/assets/fatbuu/frames', author: 'miaoyu' },
	{ id: 'miroku', label: 'Miroku', basePath: '/assets/miroku/frames', author: 'Alexei Roschak' },
	{ id: 'luffy', label: 'Monkey D. Luffy', basePath: '/assets/luffy/frames', author: 'Kenshiro99' },
	{ id: 'nami', label: 'Nami', basePath: '/assets/nami/frames', author: 'Kenshiro99' },
	{ id: 'robin', label: 'Nico Robin', basePath: '/assets/robin/frames', author: 'Kenshiro99' },
	{ id: 'torpedo-girl', label: 'Noia Torpede', basePath: '/assets/torpedo-girl/frames', author: 'ju' },
	{ id: 'zoro', label: 'Roronoa Zoro', basePath: '/assets/zoro/frames', author: 'Kenshiro99' },
	{ id: '03', label: 'Sachiel', basePath: '/assets/03/frames', author: 'TonyADV' },
	{ id: 'sango', label: 'Sango', basePath: '/assets/sango/frames', author: 'Alexei Roschak' },
	{ id: 'sanji', label: 'Sanji', basePath: '/assets/sanji/frames', author: 'Kenshiro99' },
	{ id: 'seshomaru', label: 'Sesshomaru', basePath: '/assets/seshomaru/frames', author: 'Akimoto' },
	{ id: 'softon', label: 'Softon', basePath: '/assets/softon/frames', author: 'ju' },
	{ id: 'supervegeta', label: 'Super Vegeta', basePath: '/assets/supervegeta/frames', author: 'CHOUJIN&557&Kinhyakushiki&barbatos' },
	{ id: 'tamama', label: 'Tamama', basePath: '/assets/tamama/frames', author: 'Ploaj' },
	{ id: 'jelly-jiggler', label: 'Tenosuke', basePath: '/assets/jelly-jiggler/frames', author: 'N500' },
	{ id: 'eb-trunks', label: 'Trunks', basePath: '/assets/eb-trunks/frames', author: 'boryema' },
	{ id: 'usopp', label: 'Usopp', basePath: '/assets/usopp/frames', author: 'Kenshiro99' },
	{ id: 'youkai-inuyasha', label: 'Youkai Inuyasha', basePath: '/assets/youkai-inuyasha/frames', author: 'YamiMario' }
];
