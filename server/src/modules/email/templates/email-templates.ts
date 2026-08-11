interface EmailContent {
  subject: string;
  html: string;
}

const layout = (title: string, bodyHtml: string): string => `
<!doctype html>
<html lang="pt-BR">
  <body style="font-family: Arial, sans-serif; background:#f4f5f7; padding:24px;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
      <tr><td>
        <h1 style="font-size:20px;color:#111827;margin-bottom:16px;">${title}</h1>
        ${bodyHtml}
        <p style="font-size:12px;color:#9ca3af;margin-top:32px;">Método Certo — controle financeiro pessoal</p>
      </td></tr>
    </table>
  </body>
</html>
`;

export function emailVerificationTemplate(name: string, verifyUrl: string): EmailContent {
  return {
    subject: "Confirme seu e-mail — Método Certo",
    html: layout(
      "Confirme seu e-mail",
      `<p>Olá, ${name}!</p>
       <p>Confirme seu e-mail para ativar sua conta no Método Certo:</p>
       <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Confirmar e-mail</a></p>
       <p>Este link expira em 24 horas. Se você não criou esta conta, ignore este e-mail.</p>`,
    ),
  };
}

export function passwordResetTemplate(name: string, resetUrl: string): EmailContent {
  return {
    subject: "Redefinição de senha — Método Certo",
    html: layout(
      "Redefinir sua senha",
      `<p>Olá, ${name}!</p>
       <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
       <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Redefinir senha</a></p>
       <p>Este link expira em 15 minutos. Se você não solicitou isso, ignore este e-mail — sua senha continua segura.</p>`,
    ),
  };
}

export function passwordChangedTemplate(name: string): EmailContent {
  return {
    subject: "Sua senha foi alterada — Método Certo",
    html: layout(
      "Senha alterada",
      `<p>Olá, ${name}!</p>
       <p>Sua senha foi alterada com sucesso. Todas as suas sessões ativas foram encerradas por segurança.</p>
       <p>Se você não fez isso, entre em contato com o suporte imediatamente.</p>`,
    ),
  };
}

export function newLoginTemplate(name: string, ipAddress: string, userAgent: string): EmailContent {
  return {
    subject: "Novo login detectado — Método Certo",
    html: layout(
      "Novo login na sua conta",
      `<p>Olá, ${name}!</p>
       <p>Detectamos um novo login na sua conta:</p>
       <p style="color:#4b5563;font-size:14px;">IP: ${ipAddress}<br/>Dispositivo: ${userAgent}</p>
       <p>Se não foi você, redefina sua senha imediatamente.</p>`,
    ),
  };
}
