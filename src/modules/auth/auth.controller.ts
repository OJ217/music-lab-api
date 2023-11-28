import { OAuth2Client } from 'google-auth-library';

import { AuthenticatorContextPayload, ModuleController } from '@/types';
import { generateToken } from '@/util/auth.util';
import { zValidator } from '@hono/zod-validator';

import User from '../user/user.model';
import { googleOAuthReSchema, signInReqSchema, signUpReqSchema } from './auth.validation';

const { public: authPublicEndpointController } = new ModuleController();

authPublicEndpointController.post('/sign-in', zValidator('json', signInReqSchema), async c => {
	const { email, password } = c.req.valid('json');
	const user = await User.findOne({ email }).select('+password');

	if (!user) return c.json({ success: false, message: `User doesn't exist` });

	const passwordMatches = await user.compare_passwords(password);

	if (!passwordMatches) return c.json({ success: false, message: 'Incorrect credentials' });

	const userId = user._id.toString();
	const authTokenPayload: AuthenticatorContextPayload = { id: userId, email: user.email };

	const accessToken = generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
	const refreshToken = generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

	return c.json({
		success: true,
		data: {
			accessToken,
			refreshToken,
			user: {
				_id: user.id,
				email: user.email,
				username: user.username,
				picture: user.picture,
			},
		},
	});
});

authPublicEndpointController.post('/sign-up', zValidator('json', signUpReqSchema), async c => {
	const { email, username, password } = c.req.valid('json');
	const userExists = await User.duplicate_email_exists(email);

	if (userExists) return c.json({ success: false, message: 'Duplicate email' });

	const user = new User({ email, username, password });
	await user.save();

	const userId = user._id.toString();
	const authTokenPayload: AuthenticatorContextPayload = { id: userId, email: user.email };

	const accessToken = generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
	const refreshToken = generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

	return c.json({
		success: true,
		data: {
			accessToken,
			refreshToken,
			user: {
				_id: user.id,
				email: user.email,
				username: user.username,
				picture: user.picture,
			},
		},
	});
});

authPublicEndpointController.post('/google', zValidator('json', googleOAuthReSchema), async c => {
	const { code } = c.req.valid('json');

	const { GOOGLE_CLIENT_ID, GOOGLE_SECRET, GOOGLE_OAUTH_REDIRECT_URI } = process.env;
	const googleOAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_SECRET, GOOGLE_OAUTH_REDIRECT_URI);

	const {
		tokens: { id_token: idToken = '' },
	} = await googleOAuth2Client.getToken(code);

	if (!idToken) return c.json({ success: false, message: 'No ID Token' });

	const ticket = await googleOAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });

	const payload = ticket.getPayload();

	const email = payload?.email;
	const username = payload?.name;
	const picture = payload?.picture;

	let user = await User.findOne({ email });

	if (!user) {
		user = new User({ email, username, picture });
	} else if (!user.picture && picture) {
		user.picture = picture;
	}

	await user.save();

	const userId = user._id.toString();
	const authTokenPayload: AuthenticatorContextPayload = { id: userId, email: user.email };

	const accessToken = generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
	const refreshToken = generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

	return c.json({
		success: true,
		data: {
			accessToken,
			refreshToken,
			user: {
				_id: user.id,
				email: user.email,
				username: user.username,
				picture: user.picture,
			},
		},
	});
});

export { authPublicEndpointController };
