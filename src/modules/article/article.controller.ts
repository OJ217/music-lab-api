import { schemaValidator } from '@/middleware/validation.middleware';
import { ApiController, ApiResponse, HttpStatus } from '@/util/api.util';
import { ApiErrorCode, ApiException } from '@/util/error.util';
import { objectIdParamSchema, paginationSchema } from '@/util/validation.util';

import User from '../user/user.model';
import Article from './article.model';
import { createArticleSchema, createArticlesSchema, updateArticleSchema } from './article.validation';

const { public: articlePublicEndpointController, private: articlePrivateEndpointController } = new ApiController();

articlePublicEndpointController.get('/', schemaValidator('query', paginationSchema), async c => {
	const { page, limit } = c.req.valid('query');

	const articles = await Article.paginate(
		{},
		{
			page,
			limit,
			sort: {
				createdAt: -1,
			},
			lean: true,
			leanWithId: false,
		}
	);

	return ApiResponse.create(c, { docs: articles });
});

articlePublicEndpointController.get('/:id', schemaValidator('param', objectIdParamSchema), async c => {
	const article = await Article.findById(c.req.param('id')).lean();

	if (!article)
		throw new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, {
			isReadableMessage: true,
			message: 'err.user_not_found',
		});

	return ApiResponse.create(c, article);
});

// ** Private Endpoints
articlePrivateEndpointController.post('/', schemaValidator('json', createArticleSchema), async c => {
	const userId = c.env.authenticator?.id;
	const articleData = c.req.valid('json');

	try {
		const article = await Article.create({ ...articleData, author: userId });
		await User.findByIdAndUpdate(userId, { $push: { articles: article._id } });
		return ApiResponse.create(c, article);
	} catch (error) {
		console.log(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'Could not create new article',
		});
	}
});

articlePrivateEndpointController.post('/list', schemaValidator('json', createArticlesSchema), async c => {
	const userId = c.env.authenticator?.id;
	const articlesData = c.req.valid('json').docs.map(a => ({ ...a, author: userId }));

	try {
		const articles = await Article.insertMany(articlesData);
		const articleIds = articles.map(a => a._id);
		await User.findByIdAndUpdate(userId, { $push: { articles: articleIds } }).lean();
		return ApiResponse.create(c, { docs: articles }, HttpStatus.CREATED);
	} catch (error) {
		console.log(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'Could not create new articles',
		});
	}
});

articlePrivateEndpointController.patch('/:id', schemaValidator('param', objectIdParamSchema), schemaValidator('json', updateArticleSchema), async c => {
	const { id: articleId } = c.req.valid('param');
	const articleData = c.req.valid('json');

	try {
		const article = await Article.findByIdAndUpdate(articleId, articleData, { new: true }).lean();
		return ApiResponse.create(c, article);
	} catch (error) {
		console.log(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'Could not update article',
		});
	}
});

articlePrivateEndpointController.delete('/:id', schemaValidator('param', objectIdParamSchema), async c => {
	const { id: articleId } = c.req.valid('param');
	const userId = c.env.authenticator?.id;

	try {
		await Article.findByIdAndDelete(articleId);
		await User.findByIdAndUpdate(userId, { $pull: { articles: articleId } }).lean();

		return ApiResponse.create(c, { message: 'Deleted' });
	} catch (error) {
		console.log(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'Could not delete article',
		});
	}
});

export { articlePublicEndpointController, articlePrivateEndpointController };
