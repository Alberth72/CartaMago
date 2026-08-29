import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { getApiConfig } from './config/api.config.js'

async function bootstrap() {
  const config = getApiConfig()
  const app = await NestFactory.create(AppModule, {
    logger: ['warn', 'error'],
  })

  app.setGlobalPrefix('api')

  if (config.corsOrigins.length > 0) {
    app.enableCors({
      origin: config.corsOrigins,
      credentials: true,
    })
  }

  await app.listen(config.port, config.host)
}

void bootstrap()
