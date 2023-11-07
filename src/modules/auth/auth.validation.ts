import { z } from 'zod';

export const signInReqSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export const signUpReqSchema = z
	.object({
		email: z.string().email(),
		username: z.string().min(4).max(20),
		password: z.string().min(8).max(20),
		passwordConfirmation: z.string(),
	})
	.refine(
		({ password, passwordConfirmation }) => {
			return password === passwordConfirmation;
		},
		{ message: 'Passwords must match', path: ['passwordConfirmation'] }
	);

export const googleOAuthReSchema = z.object({
	code: z.string().min(1),
});
