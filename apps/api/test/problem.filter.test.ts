import {
  type ArgumentsHost,
  HttpException,
  Logger,
  NotFoundException,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { ProblemSchema } from '@semakan/contract';
import { z } from 'zod';
import { ProblemDetailsFilter, ProblemException } from '../src/http/problem.filter';

function render(exception: unknown) {
  const res = { statusCode: 0, contentType: '', body: '' };
  const fake = {
    status(code: number) {
      res.statusCode = code;
      return fake;
    },
    type(value: string) {
      res.contentType = value;
      return fake;
    },
    send(body: string) {
      res.body = body;
      return fake;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => fake }) } as unknown as ArgumentsHost;
  new ProblemDetailsFilter().catch(exception, host);
  return { ...res, problem: ProblemSchema.parse(JSON.parse(res.body)) };
}

async function validationError(value: unknown, schema: z.ZodType) {
  const pipe = new StandardSchemaValidationPipe({ transform: true });
  return pipe.transform(value, { type: 'body', schema }).then(
    () => expect.unreachable('the pipe should reject'),
    (error: unknown) => error,
  );
}

describe('ProblemDetailsFilter', () => {
  it('renders a ProblemException with its code and field errors', () => {
    const { statusCode, contentType, problem } = render(
      new ProblemException(422, {
        title: 'Unprocessable Entity',
        code: 'reason_too_short',
        detail: 'The review is invalid.',
        fieldErrors: { reason: ['reason_too_short'] },
      }),
    );
    expect(statusCode).toBe(422);
    expect(contentType).toBe('application/problem+json');
    expect(problem).toEqual({
      type: 'about:blank',
      title: 'Unprocessable Entity',
      status: 422,
      code: 'reason_too_short',
      detail: 'The review is invalid.',
      message: 'The review is invalid.',
      fieldErrors: { reason: ['reason_too_short'] },
    });
  });

  it('falls back to the title for message when there is no detail', () => {
    const { problem } = render(new ProblemException(409, { title: 'Conflict' }));
    expect(problem).toEqual({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      message: 'Conflict',
    });
  });

  it('maps a Nest HttpException to its status', () => {
    const { problem } = render(new NotFoundException('Cannot GET /api/v1/nope'));
    expect(problem).toMatchObject({
      status: 404,
      title: 'Not Found',
      message: 'Cannot GET /api/v1/nope',
    });
  });

  it('handles an HttpException with a non-message object body', () => {
    const { problem } = render(new HttpException({ reason: 'teapot' }, 418));
    expect(problem).toEqual({
      type: 'about:blank',
      title: "I'm a Teapot",
      status: 418,
      message: "I'm a Teapot",
    });
  });

  it('builds fieldErrors from the validation pipe messages', async () => {
    const schema = z.object({ version: z.number(), reason: z.string().min(3) });
    const { statusCode, problem } = render(
      await validationError({ version: 'x', reason: 'a' }, schema),
    );
    expect(statusCode).toBe(400);
    expect(problem.title).toBe('Bad Request');
    expect(Object.keys(problem.fieldErrors ?? {})).toEqual(['version', 'reason']);
    expect(problem.detail).toContain('version: ');
  });

  it('keeps unparseable validation messages in detail only', async () => {
    const { problem } = render(await validationError('nope', z.object({})));
    expect(problem.fieldErrors).toBeUndefined();
    expect(problem.detail).toMatch(/expected object/);
  });

  it('turns anything else into a logged 500 without leaking the stack', () => {
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { statusCode, body, problem } = render(new Error('secret failure'));
    expect(statusCode).toBe(500);
    expect(problem).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      message: 'Internal Server Error',
    });
    expect(body).not.toContain('secret failure');
    render('a thrown string');
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[1]).toEqual(['a thrown string']);
    log.mockRestore();
  });
});
