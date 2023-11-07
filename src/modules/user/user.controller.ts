import { ModuleController } from '@/types';
import { objectIdParamSchema } from '@/util/validation.util';
import { zValidator } from '@hono/zod-validator';

import User from './user.model';

const { private: userPrivateEndpointController } = new ModuleController();

userPrivateEndpointController.get('/', async c => {
	const users = await User.find();
	return c.json({ success: true, docs: users });
});

userPrivateEndpointController.get('/me', async c => {
	const user = await User.findById(c.env.authenticator.id);
	return c.json({ success: true, user });
});

userPrivateEndpointController.get('/:id', zValidator('param', objectIdParamSchema), async c => {
	const user = await User.findById(c.req.param('id'));

	if (!user) return c.json({ success: false, message: 'Not found!' });

	return c.json({ success: true, doc: user });
});

export { userPrivateEndpointController };
