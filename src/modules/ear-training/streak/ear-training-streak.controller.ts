import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import schemaValidator from '@/middleware/validation.middleware';
import { ApiResponse, HttpStatus, PrivateApiController } from '@/utils/api.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';
import { objectIdSchema } from '@/utils/validation.util';

import { EarTrainingProfileService, EarTrainingSessionService, EarTrainingStreakService } from '../ear-training.service';

const earTrainingStreakController = new PrivateApiController();

//** Check for
earTrainingStreakController.get('/', async c => {
	const userId = new ObjectId(c.env.authenticator.id);
	let earTrainingStreak = await EarTrainingStreakService.fetchByUserId(userId);

	if (!earTrainingStreak) {
		const { currentStreak, bestStreak } = await EarTrainingProfileService.create(userId);
		return ApiResponse.create(c, { currentStreak, bestStreak }, HttpStatus.CREATED);
	}

	const lastLogDate = dayjs(earTrainingStreak.currentStreak.lastLogDate).startOf('day');
	const streakLost = lastLogDate.isBefore(dayjs().subtract(1, 'day').startOf('day'));

	if (streakLost) {
		const updatedEarTrainingStreak = await EarTrainingStreakService.resetStreak(userId);

		if (!updatedEarTrainingStreak)
			throw new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, {
				message: 'Ear trainig profile not found.',
			});

		earTrainingStreak = {
			_id: updatedEarTrainingStreak._id,
			bestStreak: updatedEarTrainingStreak.bestStreak,
			currentStreak: updatedEarTrainingStreak.currentStreak,
		};
	}

	return ApiResponse.create(c, earTrainingStreak);
});

earTrainingStreakController.patch('/', schemaValidator('json', z.object({ sessionId: objectIdSchema })), async c => {
	const currentDate = dayjs();
	const { sessionId } = c.req.valid('json');
	const userId = new ObjectId(c.env.authenticator.id);

	const earTrainingSession = await EarTrainingSessionService.fetchById({ sessionId, userId });
	const sessionCreatedToday = currentDate.isSame(earTrainingSession?.createdAt, 'day');

	if (!earTrainingSession || !sessionCreatedToday)
		throw new ApiException(HttpStatus.CONFLICT, ApiErrorCode.BAD_REQUEST, {
			message: 'Could not log streak.',
		});

	const earTrainingStreak = await EarTrainingStreakService.fetchByUserId(userId);

	if (!earTrainingStreak)
		throw new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, {
			message: 'Ear training profile not found.',
		});

	const { currentStreak, bestStreak } = earTrainingStreak;
	const streakLogged = currentDate.isSame(dayjs(currentStreak.lastLogDate), 'day');

	if (streakLogged)
		throw new ApiException(HttpStatus.CONFLICT, ApiErrorCode.BAD_REQUEST, {
			message: 'Streak already logged.',
		});

	const loggedEarTrainingStreak = await EarTrainingStreakService.logStreak({ userId, currentStreak, bestStreak, currentDate });

	return ApiResponse.create(c, loggedEarTrainingStreak, HttpStatus.CREATED);
});

export default earTrainingStreakController;
