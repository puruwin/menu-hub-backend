import * as fs from 'fs';
import * as path from 'path';

interface MenuItem {
  name: string;
  allergens: string[];
}

interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner';
  items: MenuItem[];
}

interface Day {
  day: string;
  meals: Meal[];
}

interface Week {
  week: number;
  days: Day[];
}

interface MenuData {
  allergens: string[];
  weeks: Week[];
}

// Lista de alérgenos reconocidos
const ALLERGEN_LIST = [
  'gluten',
  'crustaceos',
  'huevos',
  'pescado',
  'cacahuetes',
  'soja',
  'lacteos',
  'frutos_cascara',
  'apio',
  'mostaza',
  'sesamo',
  'sulfitos',
  'altramuces',
  'moluscos'
];

// Mapeo de palabras clave a alérgenos
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  // Gluten (cereales)
  'gluten': ['pan', 'pasta', 'espaguetis', 'lasagna', 'lasaña', 'pizza', 'hamburguesa', 'croissant', 'croisants', 'donut', 'donuts', 'crepe', 'crepes', 'galleta', 'bizcocho', 'tarta', 'empanada', 'croqueta', 'rebozado', 'frito', 'fritura', 'tortita', 'pancake', 'ravioli', 'raviolis', 'canelones', 'fideos', 'macarrones', 'risotto', 'arroz', 'paella'],
  
  // Crustáceos
  'crustaceos': ['gamba', 'gambas', 'langostino', 'langostinos', 'cangrejo', 'centollo', 'bogavante', 'langosta', 'nécora'],
  
  // Huevos
  'huevos': ['huevo', 'huevos', 'tortilla', 'revuelto', 'revueltos', 'flan', 'natillas', 'mayonesa', 'ali oli', 'alioli', 'carbonara', 'coulant'],
  
  // Pescado
  'pescado': ['pescado', 'merluza', 'bacalao', 'salmón', 'atún', 'bonito', 'anchoa', 'anchoas', 'sardina', 'sardinas', 'boquerón', 'boquerones', 'rape', 'lubina', 'dorada', 'lenguado', 'pez espada', 'trucha', 'marmitako'],
  
  // Cacahuetes
  'cacahuetes': ['cacahuete', 'cacahuetes', 'maní'],
  
  // Soja
  'soja': ['soja', 'tofu', 'edamame', 'salsa de soja'],
  
  // Lácteos
  'lacteos': ['leche', 'queso', 'yogur', 'nata', 'crema', 'bechamel', 'besciamella', 'mantequilla', 'parmesano', 'mozzarella', 'brie', 'gratin', 'gratinado', 'gratinada', 'flan', 'natillas', 'tiramisú', 'porridge', 'coulant', 'tarta de queso'],
  
  // Frutos de cáscara
  'frutos_cascara': ['nuez', 'nueces', 'almendra', 'almendras', 'avellana', 'avellanas', 'pistacho', 'pistachos', 'anacardo', 'anacardos', 'castaña', 'castañas', 'piñón', 'piñones', 'macadamia'],
  
  // Apio
  'apio': ['apio'],
  
  // Mostaza
  'mostaza': ['mostaza'],
  
  // Sésamo
  'sesamo': ['sésamo', 'sesamo', 'tahini'],
  
  // Sulfitos
  'sulfitos': ['vino', 'vinagre', 'balsámico'],
  
  // Altramuces
  'altramuces': ['altramuz', 'altramuces'],
  
  // Moluscos
  'moluscos': ['calamar', 'calamares', 'sepia', 'pulpo', 'almeja', 'almejas', 'mejillón', 'mejillones', 'ostra', 'ostras', 'vieira', 'vieiras', 'berberecho', 'berberechos', 'caracol', 'caracoles', 'marisco']
};

// Inferencias adicionales basadas en tipos de platos
const DISH_TYPE_ALLERGENS: Record<string, string[]> = {
  'pizza': ['gluten', 'lacteos'],
  'hamburguesa': ['gluten', 'lacteos'],
  'lasagna': ['gluten', 'lacteos', 'huevos'],
  'lasaña': ['gluten', 'lacteos', 'huevos'],
  'pasta': ['gluten'],
  'risotto': ['lacteos'],
  'croqueta': ['gluten', 'lacteos', 'huevos'],
  'tarta': ['gluten', 'lacteos', 'huevos'],
  'flan': ['lacteos', 'huevos'],
  'natillas': ['lacteos', 'huevos'],
  'tiramisú': ['gluten', 'lacteos', 'huevos'],
  'paella': ['moluscos'],
  'marisco': ['crustaceos', 'moluscos'],
  'carbonara': ['gluten', 'lacteos', 'huevos'],
  'gratinado': ['lacteos'],
  'gratinada': ['lacteos'],
  'bechamel': ['gluten', 'lacteos'],
  'rebozado': ['gluten', 'huevos'],
  'empanada': ['gluten'],
  'tortilla': ['huevos'],
  'crema': ['lacteos']
};

function inferAllergens(dishName: string): string[] {
  const allergens = new Set<string>();
  const normalizedName = dishName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Buscar palabras clave
  for (const [allergen, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedName.includes(normalizedKeyword)) {
        allergens.add(allergen);
      }
    }
  }
  
  // Buscar tipos de platos específicos
  for (const [dishType, dishAllergens] of Object.entries(DISH_TYPE_ALLERGENS)) {
    const normalizedDishType = dishType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalizedName.includes(normalizedDishType)) {
      dishAllergens.forEach(a => allergens.add(a));
    }
  }
  
  return Array.from(allergens).sort();
}

function processMenuData(inputFile: string, outputFile: string): void {
  console.log('Leyendo archivo de menú...');
  const data: MenuData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  
  let totalItems = 0;
  let itemsWithAllergens = 0;
  const allergenStats: Record<string, number> = {};
  
  ALLERGEN_LIST.forEach(a => allergenStats[a] = 0);
  
  // Procesar cada plato
  data.weeks.forEach(week => {
    week.days.forEach(day => {
      day.meals.forEach(meal => {
        meal.items.forEach(item => {
          totalItems++;
          const inferredAllergens = inferAllergens(item.name);
          item.allergens = inferredAllergens;
          
          if (inferredAllergens.length > 0) {
            itemsWithAllergens++;
            inferredAllergens.forEach(a => {
              if (allergenStats[a] !== undefined) {
                allergenStats[a]++;
              }
            });
          }
        });
      });
    });
  });
  
  // Actualizar lista de alérgenos en el menú
  data.allergens = ALLERGEN_LIST;
  
  // Guardar archivo
  console.log('Guardando archivo con alérgenos inferidos...');
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
  
  // Mostrar estadísticas
  console.log('\n✅ Procesamiento completado');
  console.log(`Total de platos: ${totalItems}`);
  console.log(`Platos con alérgenos detectados: ${itemsWithAllergens} (${((itemsWithAllergens/totalItems)*100).toFixed(1)}%)`);
  console.log('\nEstadísticas de alérgenos:');
  
  const sortedAllergens = Object.entries(allergenStats)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, count]) => count > 0);
  
  sortedAllergens.forEach(([allergen, count]) => {
    console.log(`  ${allergen}: ${count} platos (${((count/totalItems)*100).toFixed(1)}%)`);
  });
}

// Ejecutar
if (require.main === module) {
  const inputFile = path.join(__dirname, '..', 'menu_data_v2.0.json');
  const outputFile = path.join(__dirname, '..', 'menu_data_v2.0.json');
  
  processMenuData(inputFile, outputFile);
}

export { inferAllergens };

