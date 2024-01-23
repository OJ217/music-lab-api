import { Document, model, PaginateModel, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

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

articleSchema.plugin(mongoosePaginate);
articleSchema.index({ title: 1 });

const Article = model<IArticle, PaginateModel<ArticleDocument>>('articles', articleSchema);

export default Article;
