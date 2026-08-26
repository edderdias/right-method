import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { REDIS_CLIENT } from "../src/database/redis.module";
import { PrismaService } from "../src/database/prisma.service";

const MAILHOG_API = "http://localhost:8025/api/v2/messages";

function decodeQuotedPrintable(body: string): string {
  return body
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

async function extractTokenFromLatestEmail(to: string): Promise<string> {
  const res = await fetch(MAILHOG_API);
  const json = (await res.json()) as {
    items: Array<{ Content: { Body: string; Headers: Record<string, string[]> } }>;
  };
  const message = json.items.find((item) => item.Content.Headers.To?.[0]?.includes(to));
  if (!message) {
    throw new Error(`No e-mail found for ${to}`);
  }
  const body = decodeQuotedPrintable(message.Content.Body);
  const match = /token=([a-f0-9]+)/.exec(body);
  if (!match?.[1]) {
    throw new Error(`No token found in e-mail for ${to}`);
  }
  return match[1];
}

describe("Auth flow (e2e)", () => {
  let app: INestApplication;
  const email = `e2e-${Date.now()}@example.com`;
  const password = "Senha@123";

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.get(REDIS_CLIENT).quit();
    await app.get(PrismaService).$disconnect();
    await app.close();
  });

  it("registers a new user", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ name: "E2E User", password, email })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("rejects registering the same e-mail twice", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ name: "E2E User", password, email })
      .expect(409);
  });

  it("rejects login before the e-mail is verified", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(403);
  });

  let accessToken: string;
  let refreshToken: string;

  it("verifies the e-mail using the token sent to Mailhog", async () => {
    const token = await extractTokenFromLatestEmail(email);
    const res = await request(app.getHttpServer())
      .post("/api/auth/verify-email")
      .send({ token })
      .expect(200);
    expect(res.body.data.status).toBe("ACTIVE");
    expect(res.body.data.emailVerified).toBe(true);
  });

  it("logs in and receives access + refresh tokens", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(200);

    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.expiresIn).toBe(3600);
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it("returns the authenticated user on /auth/me", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data.email).toBe(email);
  });

  it("rejects /auth/me without a token", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  });

  it("rotates the refresh token and invalidates the previous one", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .send({ refreshToken })
      .expect(200);

    const newRefreshToken = res.body.data.refreshToken;
    expect(newRefreshToken).not.toBe(refreshToken);

    await request(app.getHttpServer()).post("/api/auth/refresh").send({ refreshToken }).expect(422);

    refreshToken = newRefreshToken;
    accessToken = res.body.data.accessToken;
  });

  it("logs out and invalidates the refresh token", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    await request(app.getHttpServer()).post("/api/auth/refresh").send({ refreshToken }).expect(422);
  });
});
