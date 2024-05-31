import { ObjectId } from 'mongodb';
import { z } from 'zod';

import schemaValidator from '@/middleware/validation.middleware';
import { EarTrainingType } from '@/types';
import { ApiResponse, HttpStatus, PrivateApiController } from '@/utils/api.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';
import { nonEmptyObjectSchema } from '@/utils/validation.util';

import { InstitutionType, UserEarTrainingProfileService, UserService } from './user.service';

const userController = new PrivateApiController();

userController.get('/', async c => {
	const user = await UserService.fetchById(new ObjectId(c.env.authenticator.id));

	if (!user) {
		throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, {
			isReadableMessage: true,
			message: 'err.not_found',
		});
	}

	delete user.password;

	return ApiResponse.create(c, user);
});

userController.patch(
	'/',
	schemaValidator(
		'json',
		nonEmptyObjectSchema(
			z
				.object({
					firstName: z.string().min(1).max(64),
					lastName: z.string().min(1).max(64),
					username: z.string().min(4).max(20),
					institution: z
						.object({
							name: z.string().min(1).max(100),
							type: z.nativeEnum(InstitutionType),
						})
						.optional(),
				})
				.partial()
		)
	),
	async c => {
		const userId = new ObjectId(c.env.authenticator.id);
		const userData = c.req.valid('json');

		const { updated, found } = await UserService.updateById(userId, userData);

		if (!found)
			throw new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, {
				isReadableMessage: true,
				message: 'err.not_found',
			});

		return ApiResponse.create(c, { updated });
	}
);

userController.patch(
	'/daily-goal',
	schemaValidator(
		'json',
		z.array(
			z.object({
				exerciseType: z.nativeEnum(EarTrainingType),
				target: z.number().min(10).max(100),
			})
		)
	),
	async c => {
		const userId = new ObjectId(c.env.authenticator.id);
		const dailyGoalData = c.req.valid('json');

		const { updated, found } = await UserEarTrainingProfileService.updateDailyGoal(userId, dailyGoalData);

		if (!found)
			throw new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, {
				isReadableMessage: true,
				message: 'err.not_found',
			});

		return ApiResponse.create(c, { updated });
	}
);

export default userController;
