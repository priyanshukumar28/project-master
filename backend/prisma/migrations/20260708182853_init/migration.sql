-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "assigned_team" TEXT,
ADD COLUMN     "business_req_received_date" TIMESTAMP(3),
ADD COLUMN     "delivery_date" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "developer_req_received_date" TIMESTAMP(3),
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "reason_for_delay" TEXT,
ADD COLUMN     "requirement_received_from" TEXT,
ADD COLUMN     "revised_date" TIMESTAMP(3);
