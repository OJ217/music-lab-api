import { z } from 'zod';

import schemaValidator from '@/middleware/validation.middleware';
import { ApiResponse, PrivateApiController } from '@/utils/api.util';
import { paginationSchema } from '@/utils/validation.util';

import { FeedbackService, FeedbackType } from './feedback.service';

const feedbackController = new PrivateApiController();

feedbackController.get('/', schemaValidator('query', paginationSchema.merge(z.object({ type: z.nativeEnum(FeedbackType) }))), async c => {
	const { type, page, limit } = c.req.valid('query');

	const feedbacks = await FeedbackService.fetchList({ type }, { page, limit });

	return ApiResponse.create(c, feedbacks);
});

feedbackController.post(
	'/',
	schemaValidator(
		'json',
		z.object({
			type: z.nativeEnum(FeedbackType),
			content: z.string().min(20).max(500),
			attachment: z.string().url().optional(),
		})
	),
	async c => {
		const feedbackData = c.req.valid('json');

		const { _id } = await FeedbackService.create(feedbackData);

		return ApiResponse.create(c, { _id });
	}
);

export default feedbackController;
