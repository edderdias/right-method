import { Injectable } from "@nestjs/common";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Método Certo";

@Injectable()
export class TwoFactorService {
  generateSecret(): string {
    return generateSecret();
  }

  generateOtpauthUrl(email: string, secret: string): string {
    return generateURI({ issuer: ISSUER, label: email, secret });
  }

  generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  async verifyCode(secret: string, code: string): Promise<boolean> {
    const result = await verify({ secret, token: code });
    return result.valid;
  }
}
