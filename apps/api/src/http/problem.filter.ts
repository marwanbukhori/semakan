import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Problem } from '@semakan/contract';
import type { Response } from 'express';

export type ProblemInit = {
  title: string;
  code?: string;
  detail?: string;
  fieldErrors?: Record<string, string[]>;
};

/** An HTTP error that ProblemDetailsFilter renders as application/problem+json. */
export class ProblemException extends HttpException {
  constructor(
    status: number,
    readonly problem: ProblemInit,
  ) {
    super(problem, status);
  }
}

/** Renders every error as RFC 9457 problem+json that the web app's ApiError can also read. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }
    const body = toProblem(status, describe(exception, status));
    res.status(status).type('application/problem+json').send(JSON.stringify(body));
  }
}

function describe(exception: unknown, status: number): ProblemInit {
  if (exception instanceof ProblemException) return exception.problem;
  if (!(exception instanceof HttpException)) return { title: 'Internal Server Error' };
  const title = STATUS_CODES[status] ?? 'Error';
  const response = exception.getResponse();
  const message =
    typeof response === 'string' ? response : (response as { message?: unknown }).message;
  if (Array.isArray(message)) {
    const messages = message.map(String);
    const fieldErrors = parseFieldErrors(messages);
    return { title, detail: messages.join('; '), ...(fieldErrors ? { fieldErrors } : {}) };
  }
  return typeof message === 'string' ? { title, detail: message } : { title };
}

/** StandardSchemaValidationPipe reports issues as `path: message`; group them by path. */
function parseFieldErrors(messages: string[]): Record<string, string[]> | undefined {
  const fieldErrors: Record<string, string[]> = {};
  for (const line of messages) {
    const match = /^([^\s:]+): (.+)$/.exec(line);
    if (!match) continue;
    const [, field = '', text = ''] = match;
    (fieldErrors[field] ??= []).push(text);
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function toProblem(status: number, { title, code, detail, fieldErrors }: ProblemInit): Problem {
  return {
    type: 'about:blank',
    title,
    status,
    ...(detail !== undefined ? { detail } : {}),
    ...(code !== undefined ? { code } : {}),
    message: detail ?? title,
    ...(fieldErrors !== undefined ? { fieldErrors } : {}),
  };
}
