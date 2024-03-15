import { ObjectId } from 'mongodb';
import { z } from 'zod';

import schemaValidator from '@/middleware/validation.middleware';
import { ApiResponse, HttpStatus, PrivateApiController } from '@/utils/api.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';
import { nonEmptyObjectSchema } from '@/utils/validation.util';

import { UserService } from './user.service';

const userController = new PrivateApiController();

userController.get('/', async c => {
	const user = await UserService.fetchById(new ObjectId(c.env.authenticator.id));

	if (!user) {
		throw new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, {
			message: 'User not found.',
		});
	}

	return ApiResponse.create(c, {
		_id: user._id,
		email: user.email,
		username: user.username,
		picture: user.picture,
		createdAt: user.createdAt,
	});
});

userController.patch(
	'/',
	schemaValidator(
		'json',
		nonEmptyObjectSchema(
			z
				.object({
					username: z.string().min(4).max(20),
					picture: z.string().url(),
				})
				.partial()
		)
	),
	async c => {
		const userId = new ObjectId(c.env.authenticator.id);
		const userData = c.req.valid('json');

		const { updated, found } = await UserService.updateById(userId, userData);

		if (!found)
			throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, {
				message: 'User not found.',
			});

		return ApiResponse.create(c, { updated });
	}
);

export default userController;
