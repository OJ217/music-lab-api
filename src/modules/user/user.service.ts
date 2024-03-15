import { ObjectId } from 'mongodb';
import { DocumentForInsert, schema, types } from 'papr';

import { HashService } from '@/services/auth.service';
import { DeleteServiceResponse, UpdateServiceResponse } from '@/types/db.type';
import { mongoModelClient } from '@/utils/db.util';

const userSchema = schema(
	{
		username: types.string({
			required: true,
			maxLength: 50,
			minLength: 1,
		}),
		email: types.string({
			required: true,
			pattern: /^(?![.])(?!.*[.]{2})([A-Za-z0-9_+-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/.source,
		}),
		password: types.string({
			minLength: 1,
		}),
		picture: types.string({
			minLength: 1,
		}),
	},
	{
		timestamps: true,
	}
);

type UserDocument = (typeof userSchema)[0];
type UserOptions = (typeof userSchema)[1];

export class UserService {
	private constructor() {}

	private static readonly User = mongoModelClient.model('music_lab_app.users', userSchema);

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
