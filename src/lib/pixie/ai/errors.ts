export type PixieAiErrorCode =
  | "message_too_large"
  | "state_too_large"
  | "invalid_state"
  | "invalid_model_output"
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
};

export class PixieAiException extends Error {
  code: PixieAiErrorCode;

  constructor(code: PixieAiErrorCode, message: string) {
    super(message);
    this.name = "PixieAiException";
    this.code = code;
  }
}

export function pixieAiError(code: PixieAiErrorCode, message: string, path?: Array<string | number>): PixieAiError {
  return { code, message, path };
}

