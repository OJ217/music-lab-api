import { OAuth2Client } from 'google-auth-library';

import { schemaValidator } from '@/middleware/validation.middleware';
import { AuthenticatorContextPayload } from '@/types';
import { ApiController, ApiResponse, HttpStatus } from '@/util/api.util';
import { generateToken } from '@/util/auth.util';
import { ApiErrorCode, ApiException } from '@/util/error.util';

import User from '../user/user.model';
import { googleOAuthReSchema, signInReqSchema, signUpReqSchema } from './auth.validation';

const { public: authPublicEndpointController } = new ApiController();

authPublicEndpointController.post('/sign-in', schemaValidator('json', signInReqSchema), async c => {
	const { email, password } = c.req.valid('json');
	const user = await User.findOne({ email }).select('+password');

	if (!user)
		throw new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, {
			isReadableMessage: true,
			message: 'err.user_not_found',
		});

	const passwordMatches = await user.compare_passwords(password);

	if (!passwordMatches)
		throw new ApiException(HttpStatus.BAD_REQUEST, ApiErrorCode.BAD_REQUEST, {
			isReadableMessage: true,
			message: 'err.invalid_password',
		});

	const userId = user._id.toString();
	const authTokenPayload: AuthenticatorContextPayload = { id: userId, email: user.email };

	const accessToken = generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
	const refreshToken = generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

	return ApiResponse.create(c, {
		accessToken,
		refreshToken,
		user: {
			_id: user.id,
			email: user.email,
			username: user.username,
			picture: user.picture,
			createdAt: user.createdAt,
		},
	});
});

authPublicEndpointController.post('/sign-up', schemaValidator('json', signUpReqSchema), async c => {
	const { email, username, password } = c.req.valid('json');
	const userExists = await User.duplicate_email_exists(email);

	if (userExists)
		throw new ApiException(HttpStatus.BAD_REQUEST, ApiErrorCode.BAD_REQUEST, {
			isReadableMessage: true,
			message: 'err.duplicate_email',
		});

	const user = new User({ email, username, password });
	await user.save();

	const userId = user._id.toString();
	const authTokenPayload: AuthenticatorContextPayload = { id: userId, email: user.email };

	const accessToken = generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
	const refreshToken = generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

	return ApiResponse.create(c, {
		accessToken,
		refreshToken,
		user: {
			_id: user.id,
			email: user.email,
			username: user.username,
			picture: user.picture,
			createdAt: user.createdAt,
		},
	});
});

authPublicEndpointController.post('/google', schemaValidator('json', googleOAuthReSchema), async c => {
	const { code } = c.req.valid('json');

	const { GOOGLE_CLIENT_ID, GOOGLE_SECRET, GOOGLE_OAUTH_REDIRECT_URI } = process.env;
	const googleOAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_SECRET, GOOGLE_OAUTH_REDIRECT_URI);

	const {
		tokens: { id_token: idToken = '' },
	} = await googleOAuth2Client.getToken(code);

	if (!idToken)
		throw new ApiException(HttpStatus.BAD_REQUEST, ApiErrorCode.BAD_REQUEST, {
			isReadableMessage: false,
			message: 'No ID Token.',
		});

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

	return ApiResponse.create(c, {
		accessToken,
		refreshToken,
		user: {
			_id: user.id,
			email: user.email,
			username: user.username,
			picture: user.picture,
			createdAt: user.createdAt,
		},
	});
});

export { authPublicEndpointController };
