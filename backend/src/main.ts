import { NestFactory } from '@nestjs/core';
import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ProblemDetailsFilter } from './shared/infra/http/problem-details.filter';

export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ProblemDetailsFilter());

  // Swagger is intentionally unavailable in production. It may be enabled explicitly
  // in development/test, but never becomes public by forgetting an environment flag.
  if (process.env.NODE_ENV !== 'production' && process.env.SWAGGER_ENABLED !== 'false') {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder()
      .setTitle('Turno Médicos API').setDescription('Identidad y autenticación').setVersion('1.0')
      .addBearerAuth().build());
    SwaggerModule.setup('api/v1/docs', app, doc);
  }
  return app;
}

export async function createApp(module?: Type<unknown>) {
  if (!module) {
    const { AppModule } = await import('./app.module');
    module = AppModule;
  }
  return configureApp(await NestFactory.create(module));
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(Number(process.env.PORT ?? 3000));
}

if (require.main === module) void bootstrap();
