-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('retiro', 'delivery');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customer_name" VARCHAR(120),
ADD COLUMN     "delivery_method" "DeliveryMethod" NOT NULL DEFAULT 'retiro';
