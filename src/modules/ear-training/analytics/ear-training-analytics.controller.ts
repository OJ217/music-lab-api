import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';

import schemaValidator from '@/middleware/validation.middleware';
import { ApiResponse, HttpStatus, PrivateApiController } from '@/utils/api.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';
import { earTrainingTypeSchema } from '@/utils/validation.util';

import { EarTrainingAnalyticsService } from '../ear-training.service';

const earTrainingAnalyticsController = new PrivateApiController();

earTrainingAnalyticsController.get('/', async c => {
	const currentDay = dayjs();
	const userId = new ObjectId(c.env.authenticator.id);

	try {
		const earTrainingOverallStatistics = await EarTrainingAnalyticsService.fetchOverallStatistics({ userId, currentDay });

		return ApiResponse.create(c, earTrainingOverallStatistics);
	} catch (error) {
		console.error(error);

		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			message: 'Could not fetch ear training overall statistics',
		});
	}
});

earTrainingAnalyticsController.get('/:type', schemaValidator('param', earTrainingTypeSchema), async c => {
	const currentDay = dayjs();
	const userId = new ObjectId(c.env.authenticator.id);
	const exerciseTypeParam = c.req.valid('param');

	try {
		const earTrainingExerciseStatistics = await EarTrainingAnalyticsService.fetchExerciseStatistics({
			userId,
			currentDay,
			exerciseType: exerciseTypeParam.type,
		});

		return ApiResponse.create(c, earTrainingExerciseStatistics);
	} catch (error) {
		console.error(error);

		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			message: 'Could not fetch ear training exercise statistics',
		});
	}
});

export default earTrainingAnalyticsController;
