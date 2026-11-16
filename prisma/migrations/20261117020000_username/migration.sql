-- AlterTable: Better Auth username plugin
ALTER TABLE "user" ADD COLUMN "username" TEXT,
ADD COLUMN "displayUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- The login lock is now keyed per account, not per email (rename keeps any rows)
ALTER TABLE "loginAttempt" RENAME COLUMN "email" TO "key";
