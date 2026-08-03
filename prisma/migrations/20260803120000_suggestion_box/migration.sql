-- Suggestion Box (ADR 0021): nav-bar suggestions routed student -> teacher,
-- teacher/admin -> admin, each carrying a snapshot of the page it was filed from.

-- CreateEnum
CREATE TYPE "SuggestionAudience" AS ENUM ('TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "audience" "SuggestionAudience" NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'NEW',
    "author_user_id" TEXT NOT NULL,
    "author_role" "UserRole" NOT NULL,
    "author_student_id" TEXT,
    "teacher_id" TEXT,
    "class_id" TEXT,
    "body" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "route_pattern" TEXT NOT NULL,
    "page_label" TEXT NOT NULL,
    "context_json" JSONB,
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: admin queue (audience + status, newest first)
CREATE INDEX "suggestions_audience_status_created_at_idx" ON "suggestions"("audience", "status", "created_at");

-- CreateIndex: teacher queue via the snapshot branch of the union read
CREATE INDEX "suggestions_teacher_id_status_created_at_idx" ON "suggestions"("teacher_id", "status", "created_at");

-- CreateIndex: teacher queue via the roster branch of the union read
CREATE INDEX "suggestions_author_student_id_created_at_idx" ON "suggestions"("author_student_id", "created_at");

-- CreateIndex: "which page confuses people" aggregation
CREATE INDEX "suggestions_route_pattern_idx" ON "suggestions"("route_pattern");

-- AddForeignKey: cascade — a suggestion is meaningless once its author is gone
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: the reviewer leaving must not delete the suggestion
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_author_student_id_fkey" FOREIGN KEY ("author_student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
