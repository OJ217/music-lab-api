import { MiddlewareHandler } from 'hono';
import { LambdaContext } from 'hono/aws-lambda';

export type IPublicEndpointBindings = {
	lambdaContext: LambdaContext;
};

export type IPrivateEndpointBindings = IPublicEndpointBindings & {
	authenticator: IAuthenticatorContextPayload;
};

export interface IAuthenticatorContextPayload {
	id: string;
	email: string;
}

export type IPrivateMiddlewareHandler = MiddlewareHandler<{ Bindings: IPrivateEndpointBindings }>;
export type IPublicMiddlewareHandler = MiddlewareHandler<{ Bindings: IPublicEndpointBindings }>;
