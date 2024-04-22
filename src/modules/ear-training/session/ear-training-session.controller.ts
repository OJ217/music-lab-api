import { ObjectId } from 'mongodb';
import { z } from 'zod';

import schemaValidator from '@/middleware/validation.middleware';
import { EarTrainingSessionService } from '@/modules/ear-training/ear-training.service';
import { EarTrainingType } from '@/types';
import { ApiResponse, HttpStatus, PrivateApiController } from '@/utils/api.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';
import { earTrainingTypeSchema, objectIdParamSchema, paginationSchema } from '@/utils/validation.util';

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
		const userId = new ObjectId(c.env.authenticator?.id);
		const earTrainingSessionData = c.req.valid('json');

		try {
			const { _id } = await EarTrainingSessionService.create({ ...earTrainingSessionData, userId });
			return ApiResponse.create(c, { _id: _id.toString() }, HttpStatus.CREATED);
		} catch (error) {
			console.log(error);
			throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
				isReadableMessage: false,
				message: 'Could not add ear training session.',
			});
		}
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

earTrainingSessionController.get('/:id', schemaValidator('param', objectIdParamSchema), async c => {
	const userId = new ObjectId(c.env.authenticator?.id);
	const { id } = c.req.valid('param');

	try {
		const practiceSession = await EarTrainingSessionService.fetchById({
			userId,
			sessionId: id,
		});
		return ApiResponse.create(c, practiceSession);
	} catch (error) {
		console.log(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'Could not fetch user ear training sessions.',
		});
	}
});

export default earTrainingSessionController;
