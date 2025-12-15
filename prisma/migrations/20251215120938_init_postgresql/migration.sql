-- CreateEnum
CREATE TYPE "public"."MealType" AS ENUM ('breakfast', 'lunch', 'dinner');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Menu" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Meal" (
    "id" SERIAL NOT NULL,
    "type" "public"."MealType" NOT NULL,
    "menuId" INTEGER NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MealItem" (
    "id" SERIAL NOT NULL,
    "mealId" INTEGER NOT NULL,
    "dishId" INTEGER NOT NULL,

    CONSTRAINT "MealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dish" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Allergen" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Allergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DishAllergen" (
    "dishId" INTEGER NOT NULL,
    "allergenId" INTEGER NOT NULL,

    CONSTRAINT "DishAllergen_pkey" PRIMARY KEY ("dishId","allergenId")
);

-- CreateTable
CREATE TABLE "public"."PlateTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlateTemplateAllergen" (
    "plateTemplateId" INTEGER NOT NULL,
    "allergenId" INTEGER NOT NULL,

    CONSTRAINT "PlateTemplateAllergen_pkey" PRIMARY KEY ("plateTemplateId","allergenId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_date_key" ON "public"."Menu"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Dish_name_key" ON "public"."Dish"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Allergen_name_key" ON "public"."Allergen"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlateTemplate_name_key" ON "public"."PlateTemplate"("name");

-- AddForeignKey
ALTER TABLE "public"."Meal" ADD CONSTRAINT "Meal_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "public"."Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealItem" ADD CONSTRAINT "MealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "public"."Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealItem" ADD CONSTRAINT "MealItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "public"."Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DishAllergen" ADD CONSTRAINT "DishAllergen_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "public"."Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DishAllergen" ADD CONSTRAINT "DishAllergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "public"."Allergen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlateTemplateAllergen" ADD CONSTRAINT "PlateTemplateAllergen_plateTemplateId_fkey" FOREIGN KEY ("plateTemplateId") REFERENCES "public"."PlateTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlateTemplateAllergen" ADD CONSTRAINT "PlateTemplateAllergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "public"."Allergen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
