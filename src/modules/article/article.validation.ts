import { z } from 'zod';

export const createArticleSchema = z.object({
	title: z.string().min(1).max(50),
	description: z.string().min(1).max(100),
	content: z.string().min(1).max(1000),
	thumbnailUrl: z.string().url(),
});

export const createArticlesSchema = z.object({
	docs: z.array(createArticleSchema).min(1).max(20),
});

export const updateArticleSchema = createArticleSchema.partial().refine(data => Object.keys(data).length >= 1, { message: 'At least one field must be provided' });
