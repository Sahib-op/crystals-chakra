import { studioRoutes } from './routes/studio.ts';
import { createStudioRepository } from './modules/studio/repository.ts';
import { StudioConfigSchema } from '../shared/studio-contracts.ts';
import Fastify, { LogController } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import { randomUUID } from 'node:crypto';
import type { Writable } from 'node:stream';
import { loadConfig, isAllowedOrigin, type ApiConfig } from './config.ts';
import { decodeJsonBody, HttpError } from './http.ts';
import { readingRoutes } from './routes/readings.ts';
import { commerceRoutes, type CommercePort } from './routes/commerce.ts';
import { createCommerce } from './commerce.js';
import { createDatabase, type Database } from './database/pool.ts';

interface AppOptions {
  config?: ApiConfig;
  commerce?: CommercePort;
  logging?: boolean;
  logStream?: Writable;
}

export async function createApp(options: AppOptions = {}) {
  const config = options.config ?? loadConfig();
  const app = Fastify({
    bodyLimit: 8192,
    requestTimeout: 15000,
    connectionTimeout: 15000,
    keepAliveTimeout: 5000,
    routerOptions: { maxParamLength: 120 },
    trustProxy: false,
    // Callers cannot forge the identifier used in our logs and error responses.
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    logController: new LogController({ disableRequestLogging: true }),
    ajv: {
      customOptions: {
        removeAdditional: false,
        coerceTypes: false,
        useDefaults: false,
      },
    },
    logger:
      options.logging === false
        ? false
        : {
            level: config.logLevel,
            ...(options.logStream ? { stream: options.logStream } : {}),
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
                'body',
                'token',
                'password',
                'email',
                'dob',
              ],
              remove: true,
            },
            serializers: {
              req: () => ({}),
              res: () => ({}),
              err: () => ({ type: 'Error', message: 'Redacted', stack: '' }),
            },
          },
  });
  let database: Database | null = null;
  app.addHook('onClose', async () => {
    await database?.close();
  });
  app.removeAllContentTypeParsers();
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_request, body, done) => {
      try {
        done(
          null,
          decodeJsonBody(typeof body === 'string' ? Buffer.from(body) : body),
        );
      } catch (error) {
        done(error instanceof Error ? error : new Error('Invalid JSON'));
      }
    },
  );
  app.addHook('onRequest', async (request, reply) => {
    reply
      .header('X-Request-ID', request.id)
      .header('X-Content-Type-Options', 'nosniff')
      .header('Cache-Control', 'no-store');
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.headers.origin &&
      !isAllowedOrigin(request.headers.origin, config)
    )
      return reply.code(403).send({
        error: 'Origin not allowed',
        code: 'ORIGIN_NOT_ALLOWED',
        requestId: request.id,
      });
  });
  app.addHook('onResponse', async (request, reply) => {
    // Route templates only: never log query strings, raw URLs, headers or bodies.
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url || 'unmatched',
        statusCode: reply.statusCode,
        responseTime: Math.round(reply.elapsedTime),
      },
      'Request completed',
    );
  });
  app.setErrorHandler((error, request, reply) => {
    const e = error as {
      code?: string;
      statusCode?: number;
      validation?: unknown;
    };
    let status = 500,
      code = 'INTERNAL_ERROR',
      message = 'The service is unavailable. Please try again.';
    if (error instanceof HttpError) {
      status = error.status;
      code = error.code;
      message = error.message;
    } else if (e.validation || e.statusCode === 400) {
      status = 400;
      code = 'INVALID_REQUEST';
      message = 'Check the request and try again.';
    } else if (e.statusCode === 413) {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Request too large';
    } else if (e.statusCode === 415) {
      status = 415;
      code = 'JSON_REQUIRED';
      message = 'JSON content required';
    } else if (e.statusCode === 429) {
      status = 429;
      code = 'RATE_LIMITED';
      message = 'Too many requests. Please try again in a minute.';
    }
    if (status >= 500)
      request.log.error({ failureCode: code }, 'Request failed');
    return reply
      .code(status)
      .send({ error: message, code, requestId: request.id });
  });
  app.setNotFoundHandler((request, reply) =>
    reply
      .code(404)
      .send({ error: 'Not found', code: 'NOT_FOUND', requestId: request.id }),
  );
  try {
    if (config.database) {
      database = createDatabase(config.database);
      await database.assertRestrictedRole();
    }
    await app.register(cors, {
      origin: (origin, callback) =>
        callback(null, isAllowedOrigin(origin, config)),
      methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      strictPreflight: true,
    });
    await app.register(rateLimit, {
      global: false,
      cache: 5000,
      errorResponseBuilder: (request) => ({
        statusCode: 429,
        error: 'Too many requests. Please try again in a minute.',
        code: 'RATE_LIMITED',
        requestId: request.id,
      }),
    });
    await app.register(swagger, {
      openapi: {
        openapi: '3.0.3',
        components: {
          securitySchemes: {
            studioBearer: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        info: {
          title: 'Crystals Chakra API',
          version: '1.0.0',
          description:
            'Readings go to the studio directly; commerce is a preview until configured.',
        },
      },
    });
    await app.register(async (instance) =>
      readingRoutes(
        instance,
        database ? () => database!.listPublished() : undefined,
      ),
    );
    await app.register(async (instance) =>
      commerceRoutes(
        instance,
        options.commerce ??
          createCommerce({
            domain: config.shopify.domain ?? '',
            token: config.shopify.token ?? '',
          }),
      ),
    );
    app.get(
      '/api/studio-config',
      {
        schema: {
          summary: 'Public managed sign-in settings',
          response: { 200: StudioConfigSchema },
        },
      },
      async () => ({
        configured: Boolean(database && config.auth?.publishableKey),
        localDemo: config.auth?.localDemo ?? false,
        authUrl: config.auth?.url ?? null,
        publishableKey: config.auth?.publishableKey ?? null,
      }),
    );
    await app.register(async (instance) =>
      studioRoutes(
        instance,
        database ? createStudioRepository(database) : null,
        config,
      ),
    );
    // Machine-readable contracts are generated from the same route definitions.
    app.get('/api/openapi.json', { schema: { hide: true } }, async () =>
      app.swagger(),
    );
    await app.ready();
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
