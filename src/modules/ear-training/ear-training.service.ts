import { Dayjs } from 'dayjs';
import { ClientSession, ObjectId } from 'mongodb';
import { DocumentForInsert, schema, types } from 'papr';

import { PaginationService } from '@/services/db.service';
import { EarTrainingType, earTrainingTypes } from '@/types';
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

	public static async create(earTrainingSessionData: DocumentForInsert<EarTrainingSessionDocument, EarTrainingSessionOptions>, session?: ClientSession) {
		return await this.EarTrainingSession.insertOne(earTrainingSessionData, { session: session ?? undefined });
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

// ** Ear Training Analytics Service Types
interface IEarTrainingStatisticsBase {
	correct: number;
	activity: number;
}

type IDateRangeStatistics = { date: string } & IEarTrainingStatisticsBase;
type IExerciseTypeStatistics = { type: string } & IEarTrainingStatisticsBase;

interface IOverallStatisticsResponse {
	dateRangeStatistics: Array<IDateRangeStatistics>;
	exerciseTypeStatistics: Array<IExerciseTypeStatistics>;
}

type IExerciseStatisticsResponse = Array<IDateRangeStatistics>;

// ** Ear Training Analytics Services
export class EarTrainingAnalyticsService {
	private constructor() {}

	private static readonly EarTrainingSession = EarTrainingSession;

	private static calculateDateRange(currentDay: Dayjs) {
		const range = Math.max(7, currentDay.date());
		const rangeEnd = currentDay.date(range);
		const rangeStartDate = currentDay.startOf('month').startOf('day').toDate();
		const rangeEndDate = rangeEnd.toDate();

		return {
			range,
			rangeEnd,
			rangeStartDate,
			rangeEndDate,
		};
	}

	public static async fetchOverallStatistics({ userId, currentDay }: { userId: ObjectId; currentDay: Dayjs }): Promise<IOverallStatisticsResponse> {
		const { range, rangeEnd, rangeEndDate, rangeStartDate } = this.calculateDateRange(currentDay);

		const overallStatistics = await this.EarTrainingSession.aggregate<IOverallStatisticsResponse>([
			{
				$match: {
					userId,
					createdAt: { $gte: rangeStartDate, $lte: rangeEndDate },
				},
			},
			{
				$facet: {
					dateRangeStatistics: [
						{
							$group: {
								_id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
								correct: { $sum: '$result.correct' },
								activity: { $sum: '$result.questionCount' },
							},
						},
						{
							$project: { _id: 0, date: '$_id', correct: 1, activity: 1 },
						},
					],
					exerciseTypeStatistics: [
						{
							$group: {
								_id: '$type',
								correct: { $sum: '$result.correct' },
								activity: { $sum: '$result.questionCount' },
							},
						},
						{
							$project: { _id: 0, type: '$_id', correct: 1, activity: 1 },
						},
					],
				},
			},
		]);

		if (!overallStatistics || overallStatistics.length === 0) {
			return {
				dateRangeStatistics: [],
				exerciseTypeStatistics: [],
			};
		}

		let { dateRangeStatistics, exerciseTypeStatistics } = overallStatistics[0];

		// ** Date range statistics normalization
		if (dateRangeStatistics.length > 0 && dateRangeStatistics.length < range) {
			const dateRangeStatisticsMap = new Map(dateRangeStatistics.map(a => [a.date, { activity: a.activity, correct: a.correct }]));

			dateRangeStatistics = Array.from({ length: range }, (_, index) => rangeEnd.subtract(index, 'day').format('YYYY-MM-DD')).map(date => ({
				date,
				...(dateRangeStatisticsMap.get(date) || {
					activity: 0,
					correct: 0,
				}),
			}));
		}

		// ** Exercise types statistics normalization
		if (exerciseTypeStatistics.length > 0 && exerciseTypeStatistics.length < earTrainingTypes.length) {
			const exerciseTypeStatisticsMap = new Map(exerciseTypeStatistics.map(s => [s.type, { activity: s.activity, correct: s.correct }]));

			exerciseTypeStatistics = Array.from({ length: earTrainingTypes.length }, (_, index) => earTrainingTypes[index]).map(type => ({
				type,
				...(exerciseTypeStatisticsMap.get(type) || {
					activity: 0,
					correct: 0,
				}),
			}));
		}

		return {
			dateRangeStatistics,
			exerciseTypeStatistics,
		};
	}

	public static async fetchExerciseStatistics({ userId, exerciseType, currentDay }: { userId: ObjectId; exerciseType: EarTrainingType; currentDay: Dayjs }): Promise<IExerciseStatisticsResponse> {
		const { range, rangeEnd, rangeStartDate, rangeEndDate } = this.calculateDateRange(currentDay);

		let exerciseStatistics = await this.EarTrainingSession.aggregate<IDateRangeStatistics>([
			{
				$match: {
					userId,
					type: exerciseType,
					createdAt: { $gte: rangeStartDate, $lte: rangeEndDate },
				},
			},
			{
				$group: {
					_id: {
						$dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
					},
					activity: { $sum: '$result.questionCount' },
					correct: { $sum: '$result.correct' },
				},
			},
			{
				$project: { _id: 0, date: '$_id', activity: 1, correct: 1 },
			},
		]);

		if (!exerciseStatistics) {
			return [];
		}

		// ** Date range statistics normalization
		if (exerciseStatistics.length > 0 && exerciseStatistics.length < range) {
			const dateRangeStatisticsMap = new Map(exerciseStatistics.map(a => [a.date, { activity: a.activity, correct: a.correct }]));

			exerciseStatistics = Array.from({ length: range }, (_, index) => rangeEnd.subtract(index, 'day').format('YYYY-MM-DD')).map(date => ({
				date,
				...(dateRangeStatisticsMap.get(date) || {
					activity: 0,
					correct: 0,
				}),
			}));
		}

		return exerciseStatistics;
	}
}
