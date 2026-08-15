// TODO(US-1.2): wire to real email provider
export function sendVerificationEmail(
  user: { email: string; name: string },
  token: string,
) {
  const link = `http://localhost:4200/verify-email?token=${token}`;
  console.log(
    `[mailer stub] Verification email for ${user.name} <${user.email}>: ${link}`,
  );
}
export function sendPasswordResetEmail(
  user: { email: string; name: string },
  token: string,
) {
  const link = `http://localhost:4200/reset-password?token=${token}`;
  console.log(
    `[mailer stub] Password reset email for ${user.name} <${user.email}>: ${link}`,
  );
}
