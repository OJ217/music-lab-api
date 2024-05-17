import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import schemaValidator from '@/middleware/validation.middleware';
import { EarTrainingSessionService } from '@/modules/ear-training/ear-training.service';
import { UserEarTrainingProfileService, UserService } from '@/modules/user/user.service';
import { EarTrainingType } from '@/types';
import { ApiResponse, HttpStatus, PrivateApiController } from '@/utils/api.util';
import { calculateXP } from '@/utils/calculation.util';
import { isSameDay } from '@/utils/date.util';
import { mongoInstance } from '@/utils/db.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';
import { earTrainingTypeSchema, paginationSchema } from '@/utils/validation.util';

const earTrainingSessionController = new PrivateApiController();

earTrainingSessionController.post(
	'/',
	schemaValidator(
		'json',
		z
			.object({
				type: z.nativeEnum(EarTrainingType),
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
			.refine(({ result: { correct, incorrect, questionCount } }) => correct + incorrect === questionCount, { message: 'Invalid practice session result', path: ['result'] })
			.refine(({ statistics }) => statistics.map(s => s.correct + s.incorrect === s.questionCount).every(s => s), { message: 'Invalid practice session statistics', path: ['statistics'] })
	),
	async c => {
		const currentDate = dayjs();
		const userId = new ObjectId(c.env.authenticator?.id);
		const earTrainingSessionData = c.req.valid('json');

		// ** Initialize db transaction
		const session = mongoInstance.startSession();
		session.startTransaction();

		// ** User fetch
		const user = await UserService.fetchById(userId);

		if (!user) {
			await session.abortTransaction();

			throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, {
				isReadableMessage: true,
				message: 'err.user_not_found',
			});
		}

		// ** Daily streak logging
		const earTrainingProfile = user.earTrainingProfile;

		if (!(isSameDay(currentDate, earTrainingProfile.currentStreak.lastLogDate) && earTrainingProfile.currentStreak.count !== 0)) {
			const updatedStreak = await UserEarTrainingProfileService.logStreak({
				userId,
				currentDate,
				currentStreak: earTrainingProfile.currentStreak,
				bestStreak: earTrainingProfile?.bestStreak,
				session,
			});

			if (updatedStreak?.currentStreak === undefined || updatedStreak?.currentStreak === null) {
				await session.abortTransaction();

				throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
					message: 'Could not log streak.',
				});
			}
		}

		// ** XP calculation
		const xp = calculateXP(earTrainingSessionData.result.correct, earTrainingSessionData.result.score, earTrainingSessionData.type);
		const updatedXP = await UserEarTrainingProfileService.addStatsAndXP({ userId, xp, duration: earTrainingSessionData.duration, session });

		if (updatedXP === undefined || updatedXP === null) {
			await session.abortTransaction();

			throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
				message: 'Could not log XP.',
			});
		}

		// ** Session creation
		const { _id } = await EarTrainingSessionService.create({ ...earTrainingSessionData, userId }, session);

		await session.commitTransaction();
		await session.endSession();

		return ApiResponse.create(
			c,
			{
				_id: _id.toString(),
				xp,
			},
			HttpStatus.CREATED
		);
	}
);

earTrainingSessionController.get('/', schemaValidator('query', paginationSchema.merge(earTrainingTypeSchema)), async c => {
	const userId = new ObjectId(c.env.authenticator?.id);
	const { type, limit, page } = c.req.valid('query');

	try {
		const practiceSessions = await EarTrainingSessionService.fetchList(
			{
				userId,
				type,
			},
			{
				page,
				limit,
			}
		);
		return ApiResponse.create(c, practiceSessions);
	} catch (error) {
		console.log(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'Could not fetch user ear training sessions.',
		});
	}
});

export default earTrainingSessionController;
