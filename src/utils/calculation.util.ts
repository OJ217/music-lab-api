import { EarTrainingType } from '@/types';

/**
 * Rounds given number to specific decimial place
 */
export const roundNumber = (num: number, decimalPlaces = 1): number => {
	const multiplier = Math.pow(10, decimalPlaces);
	return Math.round(num * multiplier) / multiplier;
};

/**
 * Calculates percentage based on given part and total values
 * @param part Part of the total value
 * @param total Total value
 * @returns
 */
export const calculatePercentage = (part: number, total: number): number => {
	if (total === 0) {
		return 0;
	}

	return roundNumber((part / total) * 100);
};

/**
 * Calculates XP based on sesison result
 * @param correct Number of correct answers
 * @param score Session score
 * @param type Ear training type
 * @returns XP
 */
export const calculateXP = (correct: number, score: number, type: EarTrainingType) => {
	let accuracyBonus = 0;
	if (score >= 90) {
		accuracyBonus = 1;
	} else if (score >= 80) {
		accuracyBonus = 0.5;
	}

	let difficultyFactor = 1;
	switch (type) {
		case EarTrainingType.IntervalIdentification:
			difficultyFactor = 1;
			break;
		case EarTrainingType.ChordIdentification:
			difficultyFactor = 1.5;
			break;
		case EarTrainingType.ModeIdentification:
			difficultyFactor = 1.25;
			break;
		default:
			break;
	}

	const xp = roundNumber(correct * difficultyFactor + accuracyBonus);

	return xp;
};
