import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';

import schemaValidator from '@/middleware/validation.middleware';
import { ApiResponse, HttpStatus, PrivateApiController } from '@/utils/api.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';
import { earTrainingTypeSchema } from '@/utils/validation.util';

import { EarTrainingAnalyticsService } from '../ear-training.service';

const earTrainingAnalyticsController = new PrivateApiController();

earTrainingAnalyticsController.get('/activity', schemaValidator('query', earTrainingTypeSchema.partial()), async c => {
	const userId = new ObjectId(c.env.authenticator?.id);
	const exerciseTypeQuery = c.req.valid('query');

	try {
		const earTrainingActivity = await EarTrainingAnalyticsService.fetchActivity({
			userId,
			exerciseType: exerciseTypeQuery.type,
		});

		return ApiResponse.create(c, earTrainingActivity);
	} catch (error) {
		console.log(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'Could not fetch ear training activity.',
		});
	}
});

earTrainingAnalyticsController.get('/scores', async c => {
	const userId = new ObjectId(c.env.authenticator?.id);
	const startOfMonth = dayjs().startOf('month').toDate();

	try {
		const earTrainingExerciseScores = await EarTrainingAnalyticsService.fetchExerciseScores({
			userId,
			startOfMonth,
		});
		return ApiResponse.create(c, earTrainingExerciseScores);
	} catch (error) {
		console.log(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'Could not fetch ear training scores.',
		});
	}
});

earTrainingAnalyticsController.get('/progress', schemaValidator('query', earTrainingTypeSchema.partial()), async c => {
	const userId = new ObjectId(c.env.authenticator?.id);
	const weekBeforeCurrentDate = dayjs().subtract(1, 'week').toDate();
	const exerciseTypeQuery = c.req.valid('query');

	try {
		const earTrainingProgress = await EarTrainingAnalyticsService.fetchProgress({
			userId,
			weekBeforeCurrentDate,
			exerciseType: exerciseTypeQuery.type,
		});
		return ApiResponse.create(c, earTrainingProgress);
	} catch (error) {
		console.log(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'Could not fetch ear training progress.',
		});
	}
});

export default earTrainingAnalyticsController;
