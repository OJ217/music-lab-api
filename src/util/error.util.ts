import { ApiError } from '@/middleware/error.middleware';

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

export enum ApiErrorCode {
	NOT_IMPLEMENTED = 994,
	NOT_FOUND = 995,
	BAD_REQUEST = 996,
	UNAUTHORIZED = 997,
	FORBIDDEN = 998,
	INTERNAL_ERROR = 999,
}

const errorMessages = ['err.invalid_credentials', 'err.invalid_password', 'err.user_not_found', 'err.duplicate_email', 'err.not_implemented', 'err.not_found'] as const;

export type ApiErrorMessage = (typeof errorMessages)[number];

export class ApiException extends Error {
	status: HttpStatus;
	code: ApiErrorCode;
	isReadableMessage: boolean;
	data?: any;

	constructor(status: HttpStatus, code: ApiErrorCode, message: { isReadableMessage: false; message: string } | { isReadableMessage: true; message: ApiErrorMessage }, data?: any) {
		super(message.message);
		Object.setPrototypeOf(this, ApiException.prototype);
		this.constructor = ApiException;
		this.message = message.message;
		this.isReadableMessage = message.isReadableMessage ?? false;
		this.status = status;
		this.code = code;
		if (data !== undefined) {
			this.data = data;
		}
	}

	public getApiError(): ApiError {
		return {
			code: this.code,
			isReadableMessage: this.isReadableMessage,
			message: this.message,
			...(this.data !== undefined && { data: this.data }),
		};
	}
}
