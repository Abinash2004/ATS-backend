interface jwtPayload {
	email: string;
}

interface ICredentialsValidationResponse {
	status: boolean;
	message: string;
}

export { jwtPayload, ICredentialsValidationResponse };
