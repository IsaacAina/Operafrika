-- Store only the SHA-256 hash of password reset tokens and email verification
-- codes, the same way session tokens are already stored.
--
-- The columns are renamed instead of being dropped and re-added so the stored
-- values can be converted in place. Outstanding reset links and verification
-- codes stay usable after this migration.

ALTER TABLE "PasswordResetToken" RENAME COLUMN "token" TO "tokenHash";

UPDATE "PasswordResetToken"
SET "tokenHash" = encode(sha256("tokenHash"::bytea), 'hex');

ALTER TABLE "EmailVerificationCode" RENAME COLUMN "code" TO "codeHash";

UPDATE "EmailVerificationCode"
SET "codeHash" = encode(sha256("codeHash"::bytea), 'hex');
