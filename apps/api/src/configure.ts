import { type INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ProblemDetailsFilter } from './http/problem.filter';

/** Shared by main.ts and the e2e tests, so both run the same HTTP pipeline. */
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1', { exclude: ['health/{*path}', 'docs'] });
  app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }));
  app.useGlobalFilters(new ProblemDetailsFilter());
  const config = new DocumentBuilder()
    .setTitle('Semakan API')
    .setVersion('1')
    .setOpenAPIVersion('3.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  return app;
}
