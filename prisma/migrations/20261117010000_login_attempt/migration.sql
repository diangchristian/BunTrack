-- CreateTable
CREATE TABLE "loginAttempt" (
    "email" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "lastFailure" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loginAttempt_pkey" PRIMARY KEY ("email")
);

