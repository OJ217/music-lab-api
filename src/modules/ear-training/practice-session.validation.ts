import { z } from 'zod';

import { EarTrainingPracticeType } from './practice-session.model';

export const fetchEarTrainingPracticeSessionSchema = z.object({
	type: z.nativeEnum(EarTrainingPracticeType),
});

export const createEarTrainingPracticeSessionSchema = z
	.object({
		type: z.nativeEnum(EarTrainingPracticeType),
		duration: z.number().min(0),
		result: z.object({
			score: z.number().min(0).max(100),
			correct: z.number().min(0).max(100),
			incorrect: z.number().min(0).max(100),
			questionCount: z.number().min(5).max(100),
		}),
		statistics: z
			.array(
				z.object({
					score: z.number().min(0).max(100),
					correct: z.number().min(0).max(100),
					incorrect: z.number().min(0).max(100),
					questionCount: z.number().min(1).max(100),
					questionType: z.string().min(1).max(50),
				})
			)
			.min(2),
	})
	.refine(({ result: { correct, incorrect, questionCount } }) => correct + incorrect === questionCount)
	.refine(({ statistics }) => statistics.map(s => s.correct + s.incorrect === s.questionCount).every(s => s), { message: 'Invalid practice result statistics', path: ['statistics'] });
