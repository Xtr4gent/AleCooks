ALTER TABLE "user"
ADD COLUMN "username" TEXT,
ADD COLUMN "displayUsername" TEXT;

CREATE UNIQUE INDEX "user_username_key" ON "user"("username");
