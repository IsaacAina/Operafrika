-- Add onboarding completion timestamp to users
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
