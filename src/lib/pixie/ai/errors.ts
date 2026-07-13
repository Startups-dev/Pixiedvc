export type PixieAiErrorCode =
  | "message_too_large"
  | "state_too_large"
  | "invalid_state"
  | "invalid_model_output"
  | "configuration_error"
  | "model_not_found"
  | "authentication_failed"
  | "rate_limited"
  | "provider_unavailable"
  | "provider_timeout"
  | "unsupported_tool"
  | "tool_input_invalid"
  | "tool_execution_failed"
  | "tool_limit_exceeded"
  | "orchestration_timeout"
  | "unsafe_model_claim"
  | "prompt_injection_detected";

export type PixieAiError = {
  code: PixieAiErrorCode;
  message: string;
  path?: Array<string | number>;
  status?: number;
  retryAfterMs?: number;
};

export class PixieAiException extends Error {
  code: PixieAiErrorCode;
  status?: number;
  retryAfterMs?: number;

  constructor(code: PixieAiErrorCode, message: string, options: { status?: number; retryAfterMs?: number } = {}) {
    super(message);
    this.name = "PixieAiException";
    this.code = code;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export function pixieAiError(code: PixieAiErrorCode, message: string, path?: Array<string | number>, options: { status?: number; retryAfterMs?: number } = {}): PixieAiError {
  return { code, message, path, status: options.status, retryAfterMs: options.retryAfterMs };
}
