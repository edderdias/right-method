import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AppConfigService } from "./config/app-config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  app.setGlobalPrefix("api");

  const rawFrontendUrl = config.get("FRONTEND_URL");
  const normalizedFrontendUrl = rawFrontendUrl.replace(/\/+$/, "");

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      const cleanOrigin = requestOrigin.replace(/\/+$/, "");
      if (
        cleanOrigin === normalizedFrontendUrl ||
        cleanOrigin === "http://localhost:5173" ||
        cleanOrigin === "http://localhost:3000"
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Blocked by CORS: ${requestOrigin}`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Método Certo — Auth API")
    .setDescription(
      "Módulo de autenticação: cadastro, login, tokens, sessões e recuperação de senha.",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = config.get("PORT");
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`Auth API listening on http://0.0.0.0:${port}/api (docs at /docs)`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal error during bootstrap:", err);
  process.exit(1);
});
