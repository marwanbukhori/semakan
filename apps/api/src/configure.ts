import { type INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { type Config, loadConfig } from './config';
import { ProblemDetailsFilter } from './http/problem.filter';

/**
 * Shared by main.ts and the e2e tests, so both run the same HTTP pipeline.
 *
 * CORS is deliberately not enabled: in development the web app reaches the API
 * through the Vite dev server's same-origin proxy. An origin allow-list arrives
 * with authentication in plan 6c, together with helmet and rate limits.
 */
export function configureApp(
  app: INestApplication,
  { NODE_ENV }: Pick<Config, 'NODE_ENV'> = loadConfig(process.env),
) {
  (app as NestExpressApplication).disable('x-powered-by');
  app.setGlobalPrefix('api/v1', { exclude: ['health/{*path}', 'docs'] });
  app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }));
  app.useGlobalFilters(new ProblemDetailsFilter());
  // The interactive docs are for development; production does not publish them.
  if (NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Semakan API')
      .setVersion('1')
      .setOpenAPIVersion('3.1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }
  return app;
}
