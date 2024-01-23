import { schemaValidator } from '@/middleware/validation.middleware';
import { ModuleController } from '@/types';
import { HttpStatus } from '@/util/error.util';
import { objectIdParamSchema } from '@/util/validation.util';

import User from './user.model';

const { private: userPrivateEndpointController } = new ModuleController();

userPrivateEndpointController.get('/', async c => {
	const users = await User.find();
	return c.json({ success: true, docs: users });
});

userPrivateEndpointController.get('/me', async c => {
	const user = await User.findById(c.env.authenticator.id);

	if (!user) {
		return c.json({ success: false, message: 'User not found' }, HttpStatus.NOT_FOUND);
	}

	return c.json({
		success: true,
		user: {
			_id: user.id,
			email: user.email,
			username: user.username,
			picture: user.picture,
			createdAt: user.createdAt,
		},
	});
});

userPrivateEndpointController.get('/:id', schemaValidator('param', objectIdParamSchema), async c => {
	const user = await User.findById(c.req.param('id'));

	if (!user) return c.json({ success: false, message: 'Not found!' });

	return c.json({ success: true, doc: user });
});

export { userPrivateEndpointController };
