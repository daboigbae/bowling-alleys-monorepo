export interface SendCodeRequest {
  email: string;
}

export interface SendCodeResponse {
  success: boolean;
  message: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  customToken: string;
  isNewUser: boolean;
}
