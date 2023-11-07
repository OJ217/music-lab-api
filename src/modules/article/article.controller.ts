import { ModuleController } from '@/types';
import { objectIdParamSchema } from '@/util/validation.util';
import { zValidator } from '@hono/zod-validator';

import User from '../user/user.model';
import Article from './article.model';
import { createArticleSchema, createArticlesSchema, updateArticleSchema } from './article.validation';

const { public: articlePublicEndpointController, private: articlePrivateEndpointController } = new ModuleController();

articlePublicEndpointController.get('/', async c => {
	const articles = await Article.find({}).sort({ createdAt: -1 }).lean();
	return c.json({ success: true, docs: articles });
});

articlePublicEndpointController.get('/:id', zValidator('param', objectIdParamSchema), async c => {
	const article = await Article.findById(c.req.param('id')).lean();

	if (!article) return c.json({ success: false, message: 'Not found!' });

	return c.json({ success: true, doc: article });
});

// ** Private Endpoints

articlePrivateEndpointController.post('/', zValidator('json', createArticleSchema), async c => {
	const userId = c.env.authenticator?.id;
	const articleData = c.req.valid('json');

	try {
		const article = await Article.create({ ...articleData, author: userId });
		await User.findByIdAndUpdate(userId, { $push: { articles: article._id } });
		return c.json({ sucess: true, data: article });
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not create new article' });
	}
});

articlePrivateEndpointController.post('/list', zValidator('json', createArticlesSchema), async c => {
	const userId = c.env.authenticator?.id;
	const articlesData = c.req.valid('json').docs.map(a => ({ ...a, author: userId }));

	try {
		const articles = await Article.insertMany(articlesData);
		const articleIds = articles.map(a => a._id);
		await User.findByIdAndUpdate(userId, { $push: { articles: articleIds } }).lean();
		return c.json({ success: true, data: { docs: articles } });
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not create new articles' });
	}
});

articlePrivateEndpointController.patch('/:id', zValidator('param', objectIdParamSchema), zValidator('json', updateArticleSchema), async c => {
	const { id: articleId } = c.req.valid('param');
	const articleData = c.req.valid('json');

	try {
		const article = await Article.findByIdAndUpdate(articleId, articleData, { new: true }).lean();
		return c.json({ success: true, data: article });
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not update article' });
	}
});

articlePrivateEndpointController.delete('/:id', zValidator('param', objectIdParamSchema), async c => {
	const { id: articleId } = c.req.valid('param');
	const userId = c.env.authenticator?.id;

	try {
		await Article.findByIdAndDelete(articleId);
		await User.findByIdAndUpdate(userId, { $pull: { articles: articleId } }).lean();

		return c.json({ success: true, message: 'Deleted' });
	} catch (error) {
		console.log(error);
		return c.json({ success: false, error: 'Could not delete article' });
	}
});

export { articlePublicEndpointController, articlePrivateEndpointController };
