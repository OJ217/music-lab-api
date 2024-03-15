import { Context, TypedResponse } from 'hono';
import { Hono } from 'hono/tiny';

import { IPrivateEndpointBindings, IPublicEndpointBindings } from '@/types/api.type';

export enum HttpStatus {
	OK = 200,
	CREATED = 201,
	NO_CONTENT = 204,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	CONFLICT = 409,
	INTERNAL_ERROR = 500,
	NOT_IMPLEMENTED = 501,
	BAD_GATEWAY = 502,
	GATEWAY_TIMEOUT = 504,
}

type NormalizedApiResponse = Response & TypedResponse<{ success: true; data: any }>;

export class ApiResponse {
	static create(c: Context, data: any, status: HttpStatus = HttpStatus.OK): NormalizedApiResponse {
		return c.json({ success: true, data }, status);
	}
}

export class PrivateApiController extends Hono<{ Bindings: IPrivateEndpointBindings }> {
	constructor() {
		super();
	}
}

export class PublicApiController extends Hono<{ Bindings: IPublicEndpointBindings }> {
	constructor() {
		super();
	}
}

export class ApiController {
	public public: PublicApiController;
	public private: PrivateApiController;

	constructor() {
		this.public = new PublicApiController();
		this.private = new PrivateApiController();
	}
}
