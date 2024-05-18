import dayjs from 'dayjs';
import { ClientSession, ObjectId } from 'mongodb';
import { DocumentForInsert, schema, types } from 'papr';

import { HashService } from '@/services/auth.service';
import { EarTrainingType } from '@/types';
import { DeleteServiceResponse, UpdateServiceResponse } from '@/types/db.type';
import { isYesterday } from '@/utils/date.util';
import { mongoModelClient } from '@/utils/db.util';

export enum InstitutionType {
	CONSERVATORY = 'conservatory',
	UNIVERSITY = 'university',
	COLLEGE = 'college',
	HIGH_SCHOOL = 'high_school',
	OTHER = 'other',
}

const userSchema = schema(
	{
		username: types.string({
			required: true,
			maxLength: 100,
			minLength: 1,
		}),
		firstName: types.string({
			required: false,
			maxLength: 64,
		}),
		lastName: types.string({
			required: false,
			maxLength: 64,
		}),
		email: types.string({
			required: true,
			pattern: /^(?![.])(?!.*[.]{2})([A-Za-z0-9_+-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/.source,
		}),
		password: types.string({
			minLength: 1,
			required: false,
		}),
		picture: types.string({
			minLength: 1,
			required: false,
		}),
		institution: types.object(
			{
				name: types.string({
					maxLength: 100,
					required: true,
				}),
				type: types.enum(Object.values(InstitutionType), { required: true }),
			},
			{ required: false }
		),
		xp: types.number({
			required: true,
			minimum: 0,
		}),
		earTrainingProfile: types.object(
			{
				currentStreak: types.object(
					{
						count: types.number({ required: true, minimum: 0 }),
						startDate: types.date({ required: true }),
						lastLogDate: types.date({ required: true }),
					},
					{ required: true }
				),
				bestStreak: types.object({
					count: types.number({ required: true, minimum: 0 }),
					startDate: types.date({ required: true }),
					endDate: types.date({ required: true }),
				}),
				goals: types.array(
					types.object({
						exerciseType: types.enum(Object.values(EarTrainingType), { required: true }),
						target: types.number({ minimum: 10, maximum: 100, required: true }),
					}),
					{ maxItems: Object.keys(EarTrainingType).length, uniqueItems: true, required: true }
				),
				stats: types.object({
					totalSessions: types.number({
						minimum: 0,
					}),
					totalDuration: types.number({
						minimum: 0,
					}),
				}),
			},
			{ required: true }
		),
	},
	{
		timestamps: true,
		defaults: {
			xp: 0,
			earTrainingProfile: {
				currentStreak: {
					count: 0,
					startDate: new Date(),
					lastLogDate: new Date(),
				},
				goals: [
					{ exerciseType: EarTrainingType.IntervalIdentification, target: 10 },
					{ exerciseType: EarTrainingType.ChordIdentification, target: 10 },
					{ exerciseType: EarTrainingType.ModeIdentification, target: 10 },
				],
				stats: {
					totalSessions: 0,
					totalDuration: 0,
				},
			},
		},
	}
);

type UserDocument = (typeof userSchema)[0];
type UserOptions = (typeof userSchema)[1];

const User = mongoModelClient.model('music_lab_app.users', userSchema);

export class UserService {
	private constructor() {}

	private static readonly User = User;

	public static async fetchById(userId: ObjectId) {
		return await this.User.findOne({ _id: userId });
	}

	public static async fetchByEmail(email: string) {
		return await this.User.findOne({ email });
	}

	public static async create(userData: DocumentForInsert<UserDocument, UserOptions>) {
		if (userData.password) {
			const hashedPassword = await HashService.hash(userData.password);
			userData.password = hashedPassword;
		}

		return await this.User.insertOne(userData);
	}

	public static async updateById(userId: ObjectId, systemUserData: Partial<DocumentForInsert<UserDocument, UserOptions>>): Promise<UpdateServiceResponse> {
		const userUpdate = await this.User.updateOne({ _id: userId }, { $set: systemUserData });

		return {
			found: userUpdate.matchedCount === 1,
			updated: userUpdate.modifiedCount === 1,
		};
	}

	public static async deleteById(userId: ObjectId): Promise<DeleteServiceResponse> {
		const userDelete = await this.User.deleteOne({ _id: userId });

		return {
			found: userDelete.deletedCount === 0,
			deleted: userDelete.deletedCount === 1,
		};
	}
}

export class UserEarTrainingProfileService {
	private constructor() {}

	private static readonly User = User;

	public static async addStatsAndXP({ userId, xp, duration, session }: { userId: ObjectId; xp: number; duration: number; session?: ClientSession }) {
		const xpUpdate = await this.User.findOneAndUpdate(
			{ _id: userId },
			{
				$inc: {
					xp,
					'earTrainingProfile.stats.totalSessions': 1,
					'earTrainingProfile.stats.totalDuration': duration,
				},
			},
			{
				session: session ?? undefined,
			}
		);

		return xpUpdate?.xp;
	}

	public static async logStreak({
		userId,
		currentStreak,
		bestStreak,
		currentDate,
		session,
	}: {
		userId: ObjectId;
		currentStreak: UserDocument['earTrainingProfile']['currentStreak'];
		bestStreak: UserDocument['earTrainingProfile']['bestStreak'];
		currentDate: dayjs.Dayjs;
		session?: ClientSession;
	}) {
		const nativeCurrentDate = currentDate.toDate();
		const loggedYesterday = isYesterday(currentDate, currentStreak.lastLogDate);

		const updatedCurrentStreak = loggedYesterday
			? {
					count: currentStreak.count + 1,
					lastLogDate: nativeCurrentDate,
					startDate: currentStreak.startDate,
			  }
			: { count: 1, startDate: nativeCurrentDate, lastLogDate: nativeCurrentDate };

		const streakUpdate = await this.User.findOneAndUpdate(
			{ _id: userId },
			{
				$set: {
					'earTrainingProfile.currentStreak': updatedCurrentStreak,
					...(updatedCurrentStreak.count >= (bestStreak?.count ?? 0)
						? {
								'earTrainingProfile.bestStreak': {
									count: updatedCurrentStreak.count,
									startDate: updatedCurrentStreak.startDate,
									endDate: updatedCurrentStreak.lastLogDate,
								},
						  }
						: {}),
				},
			},
			{
				session: session ?? undefined,
			}
		);

		return {
			currentStreak: streakUpdate?.earTrainingProfile.currentStreak,
			bestStreak: streakUpdate?.earTrainingProfile.bestStreak,
		};
	}

	public static async resetStreak(userId: ObjectId) {
		const currentDate = new Date();
		const streakReset = await this.User.findOneAndUpdate(
			{ _id: userId },
			{
				$set: {
					'earTrainingProfile.currentStreak': {
						count: 0,
						startDate: currentDate,
						lastLogDate: dayjs(currentDate).subtract(1, 'day').toDate(),
					},
				},
			}
		);

		return {
			currentStreak: streakReset?.earTrainingProfile.currentStreak,
			bestStreak: streakReset?.earTrainingProfile.bestStreak,
		};
	}

	public static async updateDailyGoal(userId: ObjectId, dailyGoal: UserDocument['earTrainingProfile']['goals']) {
		const userUpdate = await this.User.updateOne({ _id: userId }, { $set: { 'earTrainingProfile.goals': dailyGoal } });

		return {
			found: userUpdate.matchedCount === 1,
			updated: userUpdate.modifiedCount === 1,
		};
	}
}
