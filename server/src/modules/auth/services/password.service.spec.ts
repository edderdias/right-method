import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hashes a password into an argon2id digest", async () => {
    const hash = await service.hash("Senha@123");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("verifies a matching password", async () => {
    const hash = await service.hash("Senha@123");
    await expect(service.verify(hash, "Senha@123")).resolves.toBe(true);
  });

  it("rejects a non-matching password", async () => {
    const hash = await service.hash("Senha@123");
    await expect(service.verify(hash, "SenhaErrada@123")).resolves.toBe(false);
  });
});
