import { Document, Model, model, Schema } from 'mongoose';

import { UserDocument } from '@/modules/user/user.model';

export interface IArticle {
	title: string;
	description: string;
	content: string;
	thumbnailUrl: string;
	author: UserDocument['_id'];
	createdAt: Date;
	updatedAt: Date;
}

export interface ArticleDocument extends IArticle, Document {}

interface ArticleModel extends Model<IArticle> {}

const articleSchema = new Schema<IArticle>(
	{
		title: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		content: {
			type: String,
			required: true,
		},
		thumbnailUrl: {
			type: String,
			required: true,
		},
		author: { type: Schema.Types.ObjectId, ref: 'users' },
	},
	{ timestamps: true }
);

articleSchema.index({ title: 1 });

const Article = model<IArticle, ArticleModel>('articles', articleSchema);

export default Article;
