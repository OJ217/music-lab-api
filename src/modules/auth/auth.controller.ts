import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';

import schemaValidator from '@/middleware/validation.middleware';
import { UserService } from '@/modules/user/user.service';
import { AuthService, HashService } from '@/services/auth.service';
import { IAuthenticatorContextPayload } from '@/types/api.type';
import { ApiResponse, HttpStatus, PublicApiController } from '@/utils/api.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';

const authPublicController = new PublicApiController();

authPublicController.post(
	'/sign-in',
	schemaValidator(
		'json',
		z.object({
			email: z.string().email(),
			password: z.string().min(1),
		})
	),
	async c => {
		const { email, password } = c.req.valid('json');
		const user = await UserService.fetchByEmail(email);

		if (!user)
			throw new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, {
				isReadableMessage: true,
				message: 'err.user_not_found',
			});

		if (!user.password)
			throw new ApiException(HttpStatus.NOT_FOUND, ApiErrorCode.NOT_FOUND, {
				message: 'Please use different authentication provider.',
			});

		const passwordMatches = HashService.compareHash(password, user.password);

		if (!passwordMatches)
			throw new ApiException(HttpStatus.BAD_REQUEST, ApiErrorCode.BAD_REQUEST, {
				isReadableMessage: true,
				message: 'err.invalid_password',
			});

		const userId = user._id.toString();
		const authTokenPayload: IAuthenticatorContextPayload = { id: userId, email: user.email };

		const accessToken = AuthService.generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
		const refreshToken = AuthService.generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

		return ApiResponse.create(c, {
			accessToken,
			refreshToken,
			user: {
				_id: user._id,
				email: user.email,
				username: user.username,
				picture: user.picture,
				createdAt: user.createdAt,
			},
		});
	}
);

authPublicController.post(
	'/sign-up',
	schemaValidator(
		'json',
		z
			.object({
				email: z.string().email(),
				username: z.string().min(4).max(20),
				password: z.string().min(8).max(20),
				passwordConfirmation: z.string(),
			})
			.refine(
				({ password, passwordConfirmation }) => {
					return password === passwordConfirmation;
				},
				{ message: 'Passwords must match', path: ['passwordConfirmation'] }
			)
	),
	async c => {
		const { email, username, password } = c.req.valid('json');
		const userExists = await UserService.fetchByEmail(email);

		if (userExists)
			throw new ApiException(HttpStatus.BAD_REQUEST, ApiErrorCode.BAD_REQUEST, {
				isReadableMessage: true,
				message: 'err.duplicate_email',
			});

		const user = await UserService.create({ email, username, password });

		const userId = user._id.toString();
		const authTokenPayload: IAuthenticatorContextPayload = { id: userId, email: user.email };

		const accessToken = AuthService.generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
		const refreshToken = AuthService.generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

		return ApiResponse.create(
			c,
			{
				accessToken,
				refreshToken,
				user: {
					_id: user._id,
					email: user.email,
					username: user.username,
					picture: user.picture,
					createdAt: user.createdAt,
				},
			},
			HttpStatus.CREATED
		);
	}
);

authPublicController.post(
	'/google',
	schemaValidator(
		'json',
		z.object({
			code: z.string().min(1),
		})
	),
	async c => {
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

		if (!email || !username)
			throw new ApiException(HttpStatus.BAD_REQUEST, ApiErrorCode.BAD_REQUEST, {
				message: 'Invalid payload.',
			});

		let user = await UserService.fetchByEmail(email);

		if (!user) {
			user = await UserService.create({ email, username, picture });
		} else if (!user.picture && picture) {
			await UserService.updateById(user._id, { picture });
		}

		const userId = user._id.toString();
		const authTokenPayload: IAuthenticatorContextPayload = { id: userId, email: user.email };

		const accessToken = AuthService.generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
		const refreshToken = AuthService.generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

		return ApiResponse.create(c, {
			accessToken,
			refreshToken,
			user: {
				_id: userId,
				email,
				username,
				createdAt: user.createdAt,
				...(!!picture && { picture }),
			},
		});
	}
);

export default authPublicController;
