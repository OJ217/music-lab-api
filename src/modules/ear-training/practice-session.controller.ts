import dayjs from 'dayjs';
import { Types } from 'mongoose';

import { ModuleController } from '@/types';
import { objectIdParamSchema } from '@/util/validation.util';
import { zValidator } from '@hono/zod-validator';

import EarTrainingPracticeSession, { EarTrainingPracticeType } from './practice-session.model';
import { createEarTrainingPracticeSessionSchema, earTrainingExerciseTypeSchema, fetchEarTrainingPracticeSessionSchema } from './practice-session.validation';

const { private: earTrainingPracticeSessionPrivateEndpointController } = new ModuleController();

earTrainingPracticeSessionPrivateEndpointController.post('/', zValidator('json', createEarTrainingPracticeSessionSchema), async c => {
	const userId = c.env.authenticator?.id;
	const earTrainingracticeSessionData = c.req.valid('json');

	try {
		const practiceSession = await EarTrainingPracticeSession.create({ ...earTrainingracticeSessionData, userId });

		return c.json({
			success: true,
			data: {
				_id: practiceSession._id,
			},
		});
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not add practice session' });
	}
});

earTrainingPracticeSessionPrivateEndpointController.get('/', zValidator('query', fetchEarTrainingPracticeSessionSchema), async c => {
	const userId = c.env.authenticator?.id;
	const { type, limit, page } = c.req.valid('query');

	try {
		const practiceSessions = await EarTrainingPracticeSession.paginate(
			{
				userId,
				type,
			},
			{
				page,
				limit,
				sort: {
					createdAt: -1,
				},
				projection: {
					statistics: 0,
					userId: 0,
					__v: 0,
				},
				lean: true,
				leanWithId: false,
			}
		);

		return c.json({
			success: true,
			data: practiceSessions,
		});
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not fetch user practice sessions' });
	}
});

earTrainingPracticeSessionPrivateEndpointController.get('/activity', zValidator('query', earTrainingExerciseTypeSchema.partial()), async c => {
	const userId = new Types.ObjectId(c.env.authenticator?.id);
	const weekBeforeCurrentDate = dayjs().subtract(1, 'week').toDate();
	const exerciseTypeQuery = c.req.valid('query');

	try {
		let practiceSessionActivity = await EarTrainingPracticeSession.aggregate<{ date: string; activity: number }>([
			{
				$match: {
					userId,
					createdAt: {
						$gte: weekBeforeCurrentDate,
					},
					...(!!exerciseTypeQuery.type ? { type: exerciseTypeQuery.type } : {}),
				},
			},
			{
				$group: {
					_id: {
						$dateToString: {
							format: '%Y-%m-%d',
							date: '$createdAt',
						},
					},
					activity: { $sum: '$result.questionCount' },
				},
			},
			{
				$project: {
					_id: 0,
					date: '$_id',
					activity: 1,
				},
			},
		]);

		if (practiceSessionActivity.length > 0 && practiceSessionActivity.length < 7) {
			const practiceSessionActivityMap = new Map(practiceSessionActivity.map(item => [item.date, item.activity]));

			const currentDate = dayjs();

			practiceSessionActivity = Array.from({ length: 7 }, (_, index) => currentDate.subtract(index, 'day').format('YYYY-MM-DD')).map(date => ({
				date,
				activity: practiceSessionActivityMap.get(date) || 0,
			}));
		}

		return c.json({
			success: true,
			data: practiceSessionActivity,
		});
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not fetch practice session activity' });
	}
});

earTrainingPracticeSessionPrivateEndpointController.get('/scores', async c => {
	const userId = new Types.ObjectId(c.env.authenticator?.id);
	const startOfMonth = dayjs().startOf('month').toDate();

	try {
		const practiceSessionScores = await EarTrainingPracticeSession.aggregate<{ type: EarTrainingPracticeType; correct: number; questionCount: number }>([
			{
				$match: {
					userId,
					createdAt: {
						$gte: startOfMonth,
					},
				},
			},
			{
				$group: {
					_id: '$type',
					correct: {
						$sum: '$result.correct',
					},
					questionCount: {
						$sum: '$result.questionCount',
					},
				},
			},
			{
				$project: {
					_id: 0,
					type: '$_id',
					correct: 1,
					questionCount: 1,
				},
			},
		]);

		return c.json({
			success: true,
			data: practiceSessionScores,
		});
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not fetch practice session scores' });
	}
});

earTrainingPracticeSessionPrivateEndpointController.get('/progress', zValidator('query', earTrainingExerciseTypeSchema.partial()), async c => {
	const userId = new Types.ObjectId(c.env.authenticator?.id);
	const weekBeforeCurrentDate = dayjs().subtract(1, 'week').toDate();
	const exerciseTypeQuery = c.req.valid('query');

	try {
		let practiceSessionProgress = await EarTrainingPracticeSession.aggregate<{ date: string; correct: number; questionCount: number }>([
			{
				$match: {
					userId,
					createdAt: {
						$gte: weekBeforeCurrentDate,
					},
					...(!!exerciseTypeQuery?.type ? { type: exerciseTypeQuery.type } : {}),
				},
			},
			{
				$group: {
					_id: {
						$dateToString: {
							format: '%Y-%m-%d',
							date: '$createdAt',
						},
					},
					correct: { $sum: '$result.correct' },
					questionCount: { $sum: '$result.questionCount' },
				},
			},
			{
				$project: {
					_id: 0,
					date: '$_id',
					correct: 1,
					questionCount: 1,
				},
			},
		]);

		if (practiceSessionProgress.length > 0 && practiceSessionProgress.length < 7) {
			const practiceSessionProgressMap = new Map(practiceSessionProgress.map(item => [item.date, { correct: item.correct, questionCount: item.questionCount }]));

			const currentDate = dayjs();

			practiceSessionProgress = Array.from({ length: 7 }, (_, index) => currentDate.subtract(index, 'day').format('YYYY-MM-DD')).map(date => ({
				date,
				...(practiceSessionProgressMap.get(date) || { correct: 0, questionCount: 0 }),
			}));
		}

		return c.json({
			success: true,
			data: practiceSessionProgress,
		});
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not fetch practice session activity' });
	}
});

earTrainingPracticeSessionPrivateEndpointController.get('/:id', zValidator('param', objectIdParamSchema), async c => {
	const userId = c.env.authenticator?.id;
	const { id: practiceSessionId } = c.req.valid('param');

	try {
		const practiceSession = await EarTrainingPracticeSession.findOne(
			{
				_id: practiceSessionId,
				userId,
			},
			{
				userId: 0,
				__v: 0,
			}
		);

		if (!practiceSession) {
			c.status(404);
			return c.json({
				success: false,
				message: 'Not found',
			});
		}

		return c.json({
			success: true,
			data: practiceSession,
		});
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not fetch user practice session' });
	}
});

export { earTrainingPracticeSessionPrivateEndpointController };
