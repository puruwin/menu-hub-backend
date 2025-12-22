-- CreateTable
CREATE TABLE "MenuTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuTemplateWeek" (
    "id" SERIAL NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,

    CONSTRAINT "MenuTemplateWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuTemplateDay" (
    "id" SERIAL NOT NULL,
    "day" TEXT NOT NULL,
    "weekId" INTEGER NOT NULL,

    CONSTRAINT "MenuTemplateDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuTemplateMeal" (
    "id" SERIAL NOT NULL,
    "type" "MealType" NOT NULL,
    "dayId" INTEGER NOT NULL,

    CONSTRAINT "MenuTemplateMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuTemplateMealItem" (
    "id" SERIAL NOT NULL,
    "mealId" INTEGER NOT NULL,
    "dishId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuTemplateMealItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuTemplate_name_key" ON "MenuTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MenuTemplateWeek_templateId_weekNumber_key" ON "MenuTemplateWeek"("templateId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MenuTemplateDay_weekId_day_key" ON "MenuTemplateDay"("weekId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "MenuTemplateMeal_dayId_type_key" ON "MenuTemplateMeal"("dayId", "type");

-- AddForeignKey
ALTER TABLE "MenuTemplateWeek" ADD CONSTRAINT "MenuTemplateWeek_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MenuTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuTemplateDay" ADD CONSTRAINT "MenuTemplateDay_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "MenuTemplateWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuTemplateMeal" ADD CONSTRAINT "MenuTemplateMeal_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "MenuTemplateDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuTemplateMealItem" ADD CONSTRAINT "MenuTemplateMealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "MenuTemplateMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuTemplateMealItem" ADD CONSTRAINT "MenuTemplateMealItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


