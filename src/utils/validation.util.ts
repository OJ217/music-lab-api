import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { EarTrainingType } from '@/types';

export const nonEmptyObjectSchema = <T extends z.Schema>(schema: T, errorMessage: string = 'At least one key must be provided'): z.ZodEffects<T> =>
	schema.refine(
		val => {
			const keys = Object.keys(val);
			return keys.length >= 1;
		},
		{ message: errorMessage }
	);

export const numericString = (schema: z.ZodString) => schema.refine(s => !isNaN(parseInt(s)));

export const objectIdSchema = z
	.string()
	.refine(id => ObjectId.isValid(id), {
		message: 'String must be valid ObjectId',
	})
	.transform(id => new ObjectId(id));

export const objectIdParamSchema = z.object({
	id: objectIdSchema,
});

export const paginationSchema = z.object({
	page: z.string().pipe(z.coerce.number().int().min(1)).optional().default('1'),
	limit: z.string().pipe(z.coerce.number().int().min(5).max(20)).optional().default('10'),
});

export const earTrainingTypeSchema = z.object({
	type: z.nativeEnum(EarTrainingType),
});
