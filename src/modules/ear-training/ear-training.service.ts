import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';
import { DocumentForInsert, schema, types } from 'papr';

import { PaginationService } from '@/services/db.service';
import { EarTrainingType } from '@/types';
import { mongoModelClient } from '@/utils/db.util';

const earTrainingSessionSchema = schema(
	{
		type: types.enum(Object.values(EarTrainingType), { required: true }),
		userId: types.objectId({ required: true }),
		duration: types.number({ required: true, minimum: 1 }),
		result: types.object(
			{
				score: types.number({ required: true, minimum: 0, maximum: 100 }),
				correct: types.number({ required: true, minimum: 0, maximum: 100 }),
				incorrect: types.number({ required: true, minimum: 0, maximum: 100 }),
				questionCount: types.number({ required: true, minimum: 1, maximum: 100 }),
			},
			{ required: true }
		),
		statistics: types.array(
			types.object({
				score: types.number({ required: true, minimum: 0, maximum: 100 }),
				correct: types.number({ required: true, minimum: 0, maximum: 100 }),
				incorrect: types.number({ required: true, minimum: 0, maximum: 100 }),
				questionCount: types.number({ required: true, minimum: 1, maximum: 100 }),
				questionType: types.string({ required: true, minLength: 1, maxLength: 50 }),
			}),
			{ required: true }
		),
	},
	{ timestamps: true }
);

export type EarTrainingSessionDocument = (typeof earTrainingSessionSchema)[0];
export type EarTrainingSessionOptions = (typeof earTrainingSessionSchema)[1];

const EarTrainingSession = mongoModelClient.model('music_lab_app.ear_training_sessions', earTrainingSessionSchema);

export class EarTrainingSessionService {
	private constructor() {}

	private static readonly EarTrainingSession = EarTrainingSession;

	public static async create(earTrainingSessionData: DocumentForInsert<EarTrainingSessionDocument, EarTrainingSessionOptions>) {
		return await this.EarTrainingSession.insertOne(earTrainingSessionData);
	}

	public static async fetchList(filter: { userId: ObjectId; type: EarTrainingType }, paginationOptions: { page: number; limit: number }) {
		const paginationService = new PaginationService(this.EarTrainingSession);
		return await paginationService.paginate(filter, paginationOptions, {
			sort: { createdAt: -1 },
			projection: {
				type: 1,
				duration: 1,
				result: 1,
				statistics: 1,
				createdAt: 1,
				_id: 1,
			},
		});
	}

	public static async fetchById({ sessionId, userId }: { sessionId: ObjectId; userId: ObjectId }) {
		return await this.EarTrainingSession.findOne({ _id: sessionId, userId });
	}
}

export class EarTrainingAnalyticsService {
	private constructor() {}

	private static readonly EarTrainingSession = EarTrainingSession;

	public static async fetchActivity({ userId, exerciseType }: { userId: ObjectId; exerciseType: EarTrainingType | undefined }) {
		const weekBeforeCurrentDate = dayjs().subtract(1, 'week').toDate();

		let earTrainingActivity = await this.EarTrainingSession.aggregate<{ date: string; activity: number }>([
			{
				$match: {
					userId,
					createdAt: {
						$gte: weekBeforeCurrentDate,
					},
					...(!!exerciseType ? { type: exerciseType } : {}),
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

		if (earTrainingActivity.length > 0 && earTrainingActivity.length < 7) {
			const earTrainingActivityMap = new Map(earTrainingActivity.map(item => [item.date, item.activity]));

			const currentDate = dayjs();

			earTrainingActivity = Array.from({ length: 7 }, (_, index) => currentDate.subtract(index, 'day').format('YYYY-MM-DD')).map(date => ({
				date,
				activity: earTrainingActivityMap.get(date) || 0,
			}));
		}

		return earTrainingActivity;
	}

	public static async fetchExerciseScores({ userId, startOfMonth }: { userId: ObjectId; startOfMonth: Date }) {
		return await this.EarTrainingSession.aggregate<{ type: EarTrainingType; correct: number; questionCount: number }>([
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
	}

	public static async fetchProgress({ userId, weekBeforeCurrentDate, exerciseType }: { userId: ObjectId; weekBeforeCurrentDate: Date; exerciseType: EarTrainingType | undefined }) {
		let earTrainingProgress = await this.EarTrainingSession.aggregate<{ date: string; correct: number; questionCount: number }>([
			{
				$match: {
					userId,
					createdAt: {
						$gte: weekBeforeCurrentDate,
					},
					...(!!exerciseType ? { type: exerciseType } : {}),
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

		if (earTrainingProgress.length > 0 && earTrainingProgress.length < 7) {
			const practiceSessionProgressMap = new Map(earTrainingProgress.map(item => [item.date, { correct: item.correct, questionCount: item.questionCount }]));

			const currentDate = dayjs();

			earTrainingProgress = Array.from({ length: 7 }, (_, index) => currentDate.subtract(index, 'day').format('YYYY-MM-DD')).map(date => ({
				date,
				...(practiceSessionProgressMap.get(date) || { correct: 0, questionCount: 0 }),
			}));
		}

		return earTrainingProgress;
	}
}

const earTrainingProfileSchema = schema(
	{
		userId: types.objectId({ required: true }),
		currentStreak: types.object(
			{
				count: types.number({ required: true, minimum: 0 }),
				startDate: types.date({ required: true }),
				lastLogDate: types.date({ required: true }),
			},
			{ required: true }
		),
		bestStreak: types.object(
			{
				count: types.number({ required: true, minimum: 0 }),
				startDate: types.date({ required: true }),
				endDate: types.date({ required: true }),
			},
			{ required: true }
		),
		goals: types.array(
			types.object({
				exerciseType: types.enum(Object.values(EarTrainingType), { required: true }),
				target: types.number({ minimum: 10, maximum: 100, required: true }),
			}),
			{ maxItems: Object.keys(EarTrainingType).length, uniqueItems: true, required: true }
		),
	},
	{
		defaults: {
			goals: [
				{ exerciseType: EarTrainingType.IntervalIdentification, target: 10 },
				{ exerciseType: EarTrainingType.ChordIdentification, target: 10 },
				{ exerciseType: EarTrainingType.ModeIdentification, target: 10 },
			],
		},
	}
);

export type EarTrainingProfileDocument = (typeof earTrainingProfileSchema)[0];
export type EarTrainingProfileOptions = (typeof earTrainingProfileSchema)[1];

const EarTrainingProfile = mongoModelClient.model('music-lab-app.ear_training_profiles', earTrainingProfileSchema);

export class EarTrainingProfileService {
	private constructor() {}

	private static readonly EarTrainingProfile = EarTrainingProfile;

	public static async create(userId: ObjectId) {
		const currentDate = new Date();
		return await this.EarTrainingProfile.insertOne({
			userId,
			currentStreak: {
				count: 0,
				startDate: currentDate,
				lastLogDate: dayjs(currentDate).subtract(1, 'day').toDate(),
			},
			bestStreak: {
				count: 0,
				startDate: currentDate,
				endDate: currentDate,
			},
		});
	}
}

export class EarTrainingStreakService {
	private constructor() {}

	private static readonly EarTrainingProfile = EarTrainingProfile;

	public static async fetchByUserId(userId: ObjectId) {
		return await this.EarTrainingProfile.findOne(
			{ userId },
			{
				projection: {
					bestStreak: 1,
					currentStreak: 1,
					_id: 0,
				},
			}
		);
	}

	public static async logStreak({
		userId,
		currentStreak,
		bestStreak,
		currentDate,
	}: {
		userId: ObjectId;
		currentStreak: EarTrainingProfileDocument['currentStreak'];
		bestStreak: EarTrainingProfileDocument['bestStreak'];
		currentDate: dayjs.Dayjs;
	}) {
		const nativeCurrentDate = currentDate.toDate();
		const loggedYesterday = dayjs(currentStreak.lastLogDate).isSame(currentDate.subtract(1, 'day'), 'day');

		const updatedCurrentStreak = loggedYesterday
			? {
					count: currentStreak.count + 1,
					lastLogDate: nativeCurrentDate,
					startDate: currentStreak.startDate,
			  }
			: { count: 1, startDate: nativeCurrentDate, lastLogDate: nativeCurrentDate };

		const streakUpdate = await this.EarTrainingProfile.findOneAndUpdate(
			{ userId },
			{
				$set: {
					currentStreak: updatedCurrentStreak,
					...(updatedCurrentStreak.count > (bestStreak?.count ?? 0)
						? {
								bestStreak: {
									count: updatedCurrentStreak.count,
									startDate: updatedCurrentStreak.startDate,
									endDate: updatedCurrentStreak.lastLogDate,
								},
						  }
						: {}),
				},
			}
		);

		return {
			currentStreak: streakUpdate?.currentStreak,
			bestStreak: streakUpdate?.bestStreak,
		};
	}

	public static async resetStreak(userId: ObjectId) {
		const currentDate = new Date();
		return await this.EarTrainingProfile.findOneAndUpdate(
			{ userId },
			{
				$set: {
					currentStreak: {
						count: 0,
						startDate: currentDate,
						lastLogDate: dayjs(currentDate).subtract(1, 'day').toDate(),
					},
				},
			}
		);
	}
}
