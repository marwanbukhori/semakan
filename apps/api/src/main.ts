import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadConfig } from './config';
import { configureApp } from './configure';

const config = loadConfig(process.env);
const app = await NestFactory.create(AppModule);
configureApp(app);
app.enableShutdownHooks();
await app.listen(config.PORT);
