import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import {
  ApplicationDetailSchema,
  ApplicationListParamsSchema,
  ApplicationListSchema,
  ReviewRequestSchema,
} from '@semakan/contract';
import type { ApplicationListParams, ReviewRequest } from '@semakan/contract';
import { ApplicationsService } from './applications.service';
import { parseIfMatch } from '../http/if-match';
import { ProblemException } from '../http/problem.filter';
import { ZodValidationPipe } from '../http/zod-validation.pipe';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @Get()
  @ApiOkResponse({ standardSchema: ApplicationListSchema })
  list(@Query({ schema: ApplicationListParamsSchema }) params: ApplicationListParams) {
    return this.service.list(params);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: ApplicationDetailSchema })
  async detail(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const detail = await this.service.getDetail(id);
    res.setHeader('ETag', `"${detail.version}"`);
    return detail;
  }

  /*
   * The body is validated by a parameter pipe, not `@Body({ schema })`: Nest runs
   * the global StandardSchemaValidationPipe before parameter pipes, and with a
   * schema in the metadata it would answer 400 first. Without one it passes the
   * body through, so ZodValidationPipe answers 422 in the mock's shape.
   *
   * Pipes precede the handler, so body validation always runs before the
   * If-Match check below: a malformed body without If-Match still gets 422,
   * not 428.
   */
  @Post(':id/review')
  @HttpCode(200)
  @ApiBody({ schema: z.toJSONSchema(ReviewRequestSchema) as object })
  @ApiHeader({ name: 'If-Match', required: true, description: 'The current application version.' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Replays the stored response for a repeated key with the same body.',
  })
  @ApiOkResponse({ standardSchema: ApplicationDetailSchema })
  @ApiResponse({
    status: 400,
    description: 'invalid_if_match, version_mismatch or invalid_idempotency_key.',
  })
  @ApiResponse({ status: 404, description: 'not_found: no application with this id.' })
  @ApiResponse({ status: 409, description: 'version_conflict or idempotency_key_reused.' })
  @ApiResponse({ status: 422, description: 'Invalid review body, or the decision was rejected.' })
  @ApiResponse({
    status: 428,
    description: 'precondition_required: the If-Match header is missing.',
  })
  async review(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReviewRequestSchema, 'Invalid review')) body: ReviewRequest,
    @Headers('if-match') ifMatch: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const version = parseIfMatch(ifMatch);
    if (version === 'missing') {
      throw new ProblemException(428, {
        title: 'If-Match required',
        code: 'precondition_required',
      });
    }
    if (version === 'invalid') {
      throw new ProblemException(400, { title: 'Invalid If-Match', code: 'invalid_if_match' });
    }
    if (version !== body.version) {
      throw new ProblemException(400, {
        title: 'If-Match does not match the body version',
        code: 'version_mismatch',
      });
    }
    if (idempotencyKey && idempotencyKey.length > 255) {
      throw new ProblemException(400, {
        title: 'Invalid Idempotency-Key',
        code: 'invalid_idempotency_key',
      });
    }

    const result = await this.service.review(id, body, idempotencyKey || undefined);
    res.status(result.status);
    res.setHeader('ETag', `"${result.body.version}"`);
    return result.body;
  }
}
