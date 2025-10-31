-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "menuId" INTEGER NOT NULL,
    CONSTRAINT "Meal_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "mealId" INTEGER NOT NULL,
    CONSTRAINT "MealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Allergen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "MealItemAllergen" (
    "mealItemId" INTEGER NOT NULL,
    "allergenId" INTEGER NOT NULL,

    PRIMARY KEY ("mealItemId", "allergenId"),
    CONSTRAINT "MealItemAllergen_mealItemId_fkey" FOREIGN KEY ("mealItemId") REFERENCES "MealItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MealItemAllergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "Allergen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlateTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "PlateTemplateAllergen" (
    "plateTemplateId" INTEGER NOT NULL,
    "allergenId" INTEGER NOT NULL,

    PRIMARY KEY ("plateTemplateId", "allergenId"),
    CONSTRAINT "PlateTemplateAllergen_plateTemplateId_fkey" FOREIGN KEY ("plateTemplateId") REFERENCES "PlateTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlateTemplateAllergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "Allergen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_date_key" ON "Menu"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Allergen_name_key" ON "Allergen"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlateTemplate_name_key" ON "PlateTemplate"("name");
