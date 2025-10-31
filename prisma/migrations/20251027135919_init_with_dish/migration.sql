/*
  Warnings:

  - You are about to drop the `MealItemAllergen` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `name` on the `MealItem` table. All the data in the column will be lost.
  - Added the required column `dishId` to the `MealItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MealItemAllergen";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Dish" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DishAllergen" (
    "dishId" INTEGER NOT NULL,
    "allergenId" INTEGER NOT NULL,

    PRIMARY KEY ("dishId", "allergenId"),
    CONSTRAINT "DishAllergen_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DishAllergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "Allergen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MealItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mealId" INTEGER NOT NULL,
    "dishId" INTEGER NOT NULL,
    CONSTRAINT "MealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MealItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MealItem" ("id", "mealId") SELECT "id", "mealId" FROM "MealItem";
DROP TABLE "MealItem";
ALTER TABLE "new_MealItem" RENAME TO "MealItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Dish_name_key" ON "Dish"("name");
