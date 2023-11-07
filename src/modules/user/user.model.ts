import bcrypt from 'bcryptjs';
import { Document, Model, model, Schema } from 'mongoose';

import { ArticleDocument } from '@/modules/article/article.model';

export interface IUser {
	email: string;
	username: string;
	picture?: string;
	password?: string;
	articles: Array<ArticleDocument['_id']>;
	createdAt: Date;
	updatedAt: Date;
	compare_passwords: ComparePasswordsMethod;
}

export interface UserDocument extends IUser, Document {}

interface UserModel extends Model<IUser> {
	duplicate_email_exists: DuplicateEmailStatic;
}

const userSchema = new Schema<IUser>(
	{
		email: {
			type: String,
			required: true,
		},
		username: {
			type: String,
			required: true,
		},
		picture: {
			type: String,
			required: false,
		},
		password: {
			type: String,
			required: false,
			select: false,
		},
		articles: [{ type: Schema.Types.ObjectId, ref: 'articles' }],
	},
	{ timestamps: true }
);

// Schema indexes
userSchema.index({ email: 1 });

// Schema hooks
userSchema.pre<UserDocument>('save', async function (next) {
	if (!this.isModified('password') || !this.password) return next();
	const salt = await bcrypt.genSalt(10);
	const hash = await bcrypt.hash(this.password, salt);
	this.password = hash;
	return next();
});

// Schema statics
type DuplicateEmailStatic = (email: string) => Promise<boolean>;

const duplicate_email_exists: DuplicateEmailStatic = async email => {
	const duplicateEmailUser = await User.findOne({ email });
	return duplicateEmailUser !== null;
};

userSchema.statics.duplicate_email_exists = duplicate_email_exists;

// Schema methods
type ComparePasswordsMethod = (candidatePassword: string) => Promise<boolean | null>;

userSchema.methods.compare_passwords = async function (this: IUser, candidatePassword: string) {
	if (!this.password) return null;
	return bcrypt.compare(candidatePassword, this.password).catch(_e => false);
};

const User = model<IUser, UserModel>('users', userSchema);

export default User;
