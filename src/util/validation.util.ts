import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

export const nonEmptyObjectSchema = (schema: z.Schema, errorMessage: string = 'At least one key must be provided') =>
	z.lazy(() =>
		schema.refine(
			val => {
				const keys = Object.keys(val);
				return keys.length >= 1;
			},
			{ message: errorMessage }
		)
	);

export const objectIdSchema = z.string().refine(
	id => {
		if (isValidObjectId(id)) {
			return true;
		}
		return false;
	},
	{
		message: 'String must be valid ObjectId',
	}
);

export const objectIdParamSchema = z.object({
	id: objectIdSchema,
});

export const paginationSchema = z.object({
	pageNumber: z.coerce.number().positive().optional().default(1),
	pageSize: z.coerce.number().lte(100).positive().optional().default(20),
});
