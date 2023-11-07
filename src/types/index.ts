import { LambdaContext } from 'hono/aws-lambda';
import { Hono } from 'hono/tiny';

export type PublicEndpointBindings = {
	lambdaContext: LambdaContext;
};

export type PrivateEndpointBindings = PublicEndpointBindings & {
	authenticator: AuthenticatorContextPayload;
};

export type AuthenticatorContextPayload = {
	id: string;
	email: string;
};

export class ModuleController {
	public public: Hono;
	public private: Hono<{ Bindings: PrivateEndpointBindings }>;
	constructor() {
		this.public = new Hono();
		this.private = new Hono<{ Bindings: PrivateEndpointBindings }>();
	}
}
