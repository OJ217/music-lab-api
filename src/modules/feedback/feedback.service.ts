import { DocumentForInsert, schema, types } from 'papr';

import { PaginationService } from '@/services/db.service';
import { mongoModelClient } from '@/utils/db.util';

export enum FeedbackType {
	BUG = 'bug',
	FEATURE_REQUEST = 'feature_request',
	GENERAL = 'general',
}

const feedbackSchema = schema(
	{
		type: types.enum(Object.values(FeedbackType), {
			required: true,
		}),
		content: types.string({
			required: true,
			minLength: 20,
			maxLength: 500,
		}),
		attachment: types.string({
			required: false,
			minLength: 1,
		}),
	},
	{
		timestamps: true,
	}
);

type FeedbackDocument = (typeof feedbackSchema)[0];
type FeedbackOptions = (typeof feedbackSchema)[1];

const Feedback = mongoModelClient.model('music_lab_app.ear_training_sessions', feedbackSchema);

export class FeedbackService {
	private constructor() {}

	private static readonly Feedback = Feedback;

	public static async fetchList(filter: { type?: FeedbackType }, paginationOptions: { page: number; limit: number }) {
		const paginationService = new PaginationService(this.Feedback);
		return await paginationService.paginate(filter, paginationOptions, {
			sort: { createdAt: -1 },
			projection: {
				_id: 1,
				type: 1,
				content: 1,
				attachment: 1,
				createdAt: 1,
				updatedAt: 1,
			},
		});
	}

	public static async create(feedbackData: DocumentForInsert<FeedbackDocument, FeedbackOptions>) {
		return await this.Feedback.insertOne(feedbackData);
	}
}
