import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';
import { DocumentForInsert, PaprFilter, Projection, schema, types } from 'papr';

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

type EarTrainingSessionDocument = (typeof earTrainingSessionSchema)[0];
type EarTrainingSessionOptions = (typeof earTrainingSessionSchema)[1];

export class EarTrainingSessionService {
	private constructor() {}

	private static readonly EarTrainingSession = mongoModelClient.model('music_lab_app.ear_training_sessions', earTrainingSessionSchema);

	public static async create(earTrainingSessionData: DocumentForInsert<EarTrainingSessionDocument, EarTrainingSessionOptions>) {
		return await this.EarTrainingSession.insertOne(earTrainingSessionData);
	}

	public static async fetchList(filter: PaprFilter<EarTrainingSessionDocument>, paginationOptions: { page: number; limit: number }, projection?: Projection<EarTrainingSessionDocument>) {
		const paginationService = new PaginationService(this.EarTrainingSession);
		return await paginationService.paginate(filter, paginationOptions, {
			sort: { createdAt: -1 },
			projection: projection ?? {
				statistics: 0,
				userId: 0,
			},
		});
	}

	public static async fetchById({ sessionId, userId }: { sessionId: ObjectId; userId: ObjectId }) {
		return await this.EarTrainingSession.findOne({ _id: sessionId, userId }, { projection: { userId: 0 } });
	}

	public static async fetchActivity({ userId, weekBeforeCurrentDate, exerciseType }: { userId: ObjectId; weekBeforeCurrentDate: Date; exerciseType: EarTrainingType | undefined }) {
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

// ** Indexes
// ** earTrainingSessionSchema.index({ type: 1 });
// ** earTrainingSessionSchema.index({ userId: 1 });
// ** earTrainingSessionSchema.index({ createdAt: 1 });
