import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  ApplicationDetailSchema,
  ApplicationListParamsSchema,
  ApplicationListSchema,
} from '@semakan/contract';
import type { ApplicationListParams } from '@semakan/contract';
import { ApplicationsService } from './applications.service';

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
}
