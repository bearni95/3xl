import { ThemeColors } from '$types/core.type';

export enum PlayerCardKind {
	Move = 'move',
	Melee = 'melee',
	Ranged = 'ranged',
	Final = 'final'
}

export interface PlayerCard {
	kind: PlayerCardKind;
	label: string;
	description: string;
	icon: string;
	color: ThemeColors;
}

export const PLAYER_CARDS: PlayerCard[] = [
	{
		kind: PlayerCardKind.Move,
		label: 'Move',
		description: 'Reposition on the board.',
		icon: '🏃',
		color: ThemeColors.Info
	},
	{
		kind: PlayerCardKind.Melee,
		label: 'Melee',
		description: 'Strike an adjacent enemy.',
		icon: '⚔️',
		color: ThemeColors.Error
	},
	{
		kind: PlayerCardKind.Ranged,
		label: 'Ranged',
		description: 'Attack from a distance.',
		icon: '🏹',
		color: ThemeColors.Warning
	},
	{
		kind: PlayerCardKind.Final,
		label: 'Final',
		description: 'Unleash a decisive blow.',
		icon: '💥',
		color: ThemeColors.Accent
	}
];
