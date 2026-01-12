import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';

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

// Mapeo de tipos de comida
const mealTypeMap: Record<string, 'breakfast' | 'lunch' | 'dinner'> = {
  'DESAYUNO': 'breakfast',
  'DESAYUNOS': 'breakfast',
  'COMIDA': 'lunch',
  'CENA': 'dinner'
};

// Mapeo de días
const dayMap: Record<string, string> = {
  'LUN': 'LUN',
  'MAR': 'MAR',
  'MIE': 'MIE',
  'MIÉ': 'MIE',
  'JUE': 'JUE',
  'VIE': 'VIE',
  'SAB Y DOM': 'SAB_DOM',
  'SAB_DOM': 'SAB_DOM'
};

// Diccionario de correcciones de ortografía
const spellCorrections: Record<string, string> = {
  'orginal': 'original',
  'Haburguesa': 'Hamburguesa',
  'Cesar': 'César',
  'Lasaña': 'Lasagna',
  'bolognesa': 'bolognesa',
  'canónigos': 'canónigos',
  'frias': 'fritas',
  'mejicana': 'mexicana',
  'panadera': 'panaderas',
  'barbacoa': 'barbacoa',
  'Creps': 'Crepes',
  'Risoto': 'Risotto',
  'setas': 'setas',
  'Marmitako': 'Marmitako',
  'Tiramisú': 'Tiramisú',
  'calabacín': 'calabacín',
  'atún': 'atún',
  'Bilbaína': 'Bilbaína',
  'Bilbana': 'Bilbaína',
  'Jamón': 'Jamón',
  'Jamn': 'Jamón',
  'Caña': 'Caña',
  'Caa': 'Caña',
  'MIÉ': 'MIE',
  'MI': 'MIE'
};

// Función para corregir ortografía
function correctSpelling(text: string): string {
  let corrected = text.trim();
  
  // Limpiar caracteres de codificación incorrecta comunes
  corrected = corrected.replace(/\uFFFD/g, ''); // Replacement character
  
  // Correcciones de caracteres mal codificados
  // Estos reemplazos específicos corrigen los caracteres que aparecen mal en los CSV
  corrected = corrected.replace(/Ã©/g, 'é');
  corrected = corrected.replace(/Ã³/g, 'ó');
  corrected = corrected.replace(/Ã­/g, 'í');
  corrected = corrected.replace(/Ã±/g, 'ñ');
  corrected = corrected.replace(/Ãº/g, 'ú');
  corrected = corrected.replace(/Ã¡/g, 'á');
  corrected = corrected.replace(/Ã /g, 'à');
  corrected = corrected.replace(/Â�/g, '');
  
  // Reemplazos específicos para caracteres que aparecen como � en la salida
  corrected = corrected.replace(/�/g, 'é');
  
  // Aplicar correcciones del diccionario
  for (const [wrong, correct] of Object.entries(spellCorrections)) {
    corrected = corrected.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), correct);
  }
  
  // Correcciones específicas comunes
  corrected = corrected.replace(/\bJamn\b/gi, 'Jamón');
  corrected = corrected.replace(/\bCaa\b/gi, 'Caña');
  corrected = corrected.replace(/\bMI\b(?!E)/gi, 'MIE');
  corrected = corrected.replace(/\bHaburguesa\b/gi, 'Hamburguesa');
  corrected = corrected.replace(/\borginal\b/gi, 'original');
  corrected = corrected.replace(/\bCesar\b/gi, 'César');
  corrected = corrected.replace(/\bfrias\b/gi, 'fritas');
  corrected = corrected.replace(/\bmejicana\b/gi, 'mexicana');
  corrected = corrected.replace(/\bpanadera\b/gi, 'panaderas');
  corrected = corrected.replace(/\bCreps\b/gi, 'Crepes');
  corrected = corrected.replace(/\bRisoto\b/gi, 'Risotto');
  corrected = corrected.replace(/\bLasaa\b/gi, 'Lasagna');
  corrected = corrected.replace(/\bBoloesa\b/gi, 'Boloñesa');
  
  return corrected;
}

// Función para normalizar nombre de plato
function normalizeItemName(name: string): string {
  if (!name || name.trim() === '' || name === '-' || name === ',') {
    return '';
  }
  
  let normalized = correctSpelling(name);
  
  // Correcciones específicas antes de capitalizar
  normalized = normalized.replace(/\bMiexta\b/gi, 'mixta');
  
  // Palabras que deben estar en minúsculas (preposiciones, artículos, conjunciones)
  const lowercaseWords = ['de', 'del', 'la', 'las', 'los', 'y', 'con', 'a', 'al', 'en', 'el', 'un', 'una', 'o'];
  
  // Capitalizar primera letra de cada palabra, pero mantener preposiciones en minúsculas
  const words = normalized.split(' ').filter(w => w.trim() !== '');
  normalized = words.map((word, index) => {
    if (word.length === 0) return word;
    
    const lowerWord = word.toLowerCase();
    
    // Si es la primera palabra, siempre capitalizar
    if (index === 0) {
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    }
    
    // Si es una preposición/artículo/conjunción, mantener en minúsculas
    if (lowercaseWords.includes(lowerWord)) {
      return lowerWord;
    }
    
    // Si la palabra anterior termina con ":", capitalizar (ej: "Postre: Tarta")
    if (index > 0 && words[index - 1].endsWith(':')) {
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    }
    
    // Si la palabra anterior es una preposición/artículo, mantener en minúsculas
    const prevWordLower = words[index - 1].toLowerCase();
    if (index > 0 && lowercaseWords.includes(prevWordLower)) {
      return lowerWord;
    }
    
    // Para otras palabras, capitalizar primera letra
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  
  // Correcciones finales específicas
  normalized = normalized.replace(/\bCésar\b/gi, 'César');
  
  return normalized;
}

// Función para parsear CSV
function parseCSV(filePath: string): Week | null {
  try {
    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, 'win1252');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 2) {
      console.error(`Archivo ${filePath} tiene muy pocas líneas`);
      return null;
    }
    
    // Extraer número de semana del encabezado o del nombre del archivo
    let weekNumber: number | null = null;
    const weekMatch = lines[0].match(/SEMANA\s+(\d+)/i);
    if (weekMatch) {
      weekNumber = parseInt(weekMatch[1], 10);
    } else {
      // Intentar extraer del nombre del archivo
      const fileNameMatch = path.basename(filePath).match(/S(\d+)/);
      if (fileNameMatch) {
        weekNumber = parseInt(fileNameMatch[1], 10);
      }
    }
    
    if (weekNumber === null || weekNumber === undefined) {
      console.error(`No se pudo encontrar el número de semana en ${filePath}`);
      return null;
    }
    
    // Determinar qué línea tiene los días
    // Buscar la línea que contiene los días de la semana
    let headerLineIndex = -1;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toUpperCase();
      if (line.includes('LUN') || line.includes('MAR') || line.includes('MIE') || line.includes('JUE') || line.includes('VIE') || line.includes('SAB') || line.includes('DOM')) {
        headerLineIndex = i;
        break;
      }
    }
    
    if (headerLineIndex === -1) {
      console.error(`No se pudo encontrar la línea con los días en ${filePath}`);
      return null;
    }
    
    const headerLine = lines[headerLineIndex];
    const headerCells = parseCSVLine(headerLine);
    
    // Detectar si hay columnas duplicadas (formato con guiones)
    // En formato duplicado, hay celdas vacías entre los días
    const hasDuplicatedColumns = headerCells.filter(c => c.trim() === '').length > 2;
    
    // Encontrar índices de las columnas de días
    const dayIndices: { day: string; index: number }[] = [];
    
    if (hasDuplicatedColumns) {
      // Formato con columnas duplicadas: LUN,,MAR,,MIE,,...
      // Los días están en índices impares (1, 3, 5, 7, 9, 11)
      headerCells.forEach((cell, index) => {
        if (index % 2 === 1) { // Solo índices impares
          const normalizedCell = cell.trim().toUpperCase().replace(/[^\w\s]/g, '');
          // Mapear variaciones de días
          let mappedDay: string | undefined;
          if (normalizedCell.includes('SAB') || normalizedCell.includes('DOM')) mappedDay = 'SAB_DOM';
          else if (normalizedCell.includes('LUN')) mappedDay = 'LUN';
          else if (normalizedCell.includes('MAR')) mappedDay = 'MAR';
          else if (normalizedCell.includes('MIER') || normalizedCell.includes('MIE')) mappedDay = 'MIE';
          else if (normalizedCell.includes('JUE')) mappedDay = 'JUE';
          else if (normalizedCell.includes('VIE')) mappedDay = 'VIE';
          
          if (mappedDay) {
            dayIndices.push({ day: mappedDay, index });
          }
        }
      });
    } else {
      // Formato normal: LUN,MAR,MIE,JUE,VIE,SAB Y DOM
      headerCells.forEach((cell, index) => {
        const normalizedCell = cell.trim().toUpperCase().replace(/[^\w\s]/g, '');
        if (normalizedCell.includes('SAB') || normalizedCell.includes('DOM')) dayIndices.push({ day: 'SAB_DOM', index });
        else if (normalizedCell.includes('LUN')) dayIndices.push({ day: 'LUN', index });
        else if (normalizedCell.includes('MAR')) dayIndices.push({ day: 'MAR', index });
        else if (normalizedCell.includes('MIER') || normalizedCell.includes('MIE')) dayIndices.push({ day: 'MIE', index });
        else if (normalizedCell.includes('JUE')) dayIndices.push({ day: 'JUE', index });
        else if (normalizedCell.includes('VIE')) dayIndices.push({ day: 'VIE', index });
      });
    }
    
    // Procesar líneas de comida
    const daysData: Record<string, { breakfast: string[], lunch: string[], dinner: string[] }> = {};
    dayIndices.forEach(({ day }) => {
      daysData[day] = { breakfast: [], lunch: [], dinner: [] };
    });
    
    let currentMealType: 'breakfast' | 'lunch' | 'dinner' | null = null;
    
    // Empezar a procesar desde la línea después de los días
    const startLineIndex = headerLineIndex + 1;
    
    for (let i = startLineIndex; i < lines.length; i++) {
      const line = lines[i];
      const cells = parseCSVLine(line);
      
      if (cells.length === 0) continue;
      
      const firstCell = cells[0].trim().toUpperCase();
      
      // Verificar si es un tipo de comida
      if (mealTypeMap[firstCell]) {
        currentMealType = mealTypeMap[firstCell];
      }
      
      if (!currentMealType) continue;
      
      // Procesar cada columna de día
      dayIndices.forEach(({ day, index }) => {
        let cellIndex = index;
        
        // Si hay columnas duplicadas, los datos están en el mismo índice que el día
        // pero necesitamos ajustar porque el índice del día ya es el correcto
        if (hasDuplicatedColumns) {
          // En formato duplicado, los días están en índices impares
          // y los datos también están en esos mismos índices
          cellIndex = index;
        }
        
        if (cellIndex < cells.length) {
          const cellValue = cells[cellIndex].trim();
          
          if (cellValue && cellValue !== '-' && cellValue !== '') {
            // Si el valor contiene comas, puede ser múltiples platos
            const items = cellValue.split(',').map(item => normalizeItemName(item)).filter(item => item !== '');
            
            items.forEach(item => {
              if (item) {
                daysData[day][currentMealType].push(item);
              }
            });
          }
        }
      });
    }
    
    // Convertir a estructura de Week
    const days: Day[] = dayIndices.map(({ day }) => {
      const meals: Meal[] = [];
      
      if (daysData[day].breakfast.length > 0) {
        meals.push({
          type: 'breakfast',
          items: daysData[day].breakfast.map(name => ({ name, allergens: [] }))
        });
      }
      
      if (daysData[day].lunch.length > 0) {
        meals.push({
          type: 'lunch',
          items: daysData[day].lunch.map(name => ({ name, allergens: [] }))
        });
      }
      
      if (daysData[day].dinner.length > 0) {
        meals.push({
          type: 'dinner',
          items: daysData[day].dinner.map(name => ({ name, allergens: [] }))
        });
      }
      
      return { day, meals };
    });
    
    return { week: weekNumber, days };
  } catch (error) {
    console.error(`Error procesando ${filePath}:`, error);
    return null;
  }
}

// Función para parsear una línea CSV (maneja comillas)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Función principal
function main() {
  const csvDir = path.join(__dirname, '..', 'menu-data-csv');
  const outputFile = path.join(__dirname, '..', 'menu_data_v2.0.json');
  
  // Procesar archivos CSV
  const weeks: Week[] = [];
  
  // Buscar archivos CSV en el directorio
  const csvFiles = fs.readdirSync(csvDir)
    .filter(file => file.endsWith('.csv'))
    .sort((a, b) => {
      // Extraer número de semana del nombre del archivo
      const matchA = a.match(/S(\d+)/);
      const matchB = b.match(/S(\d+)/);
      if (matchA && matchB) {
        return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
      }
      return a.localeCompare(b);
    });
  
  for (const csvFileName of csvFiles) {
    const csvFile = path.join(csvDir, csvFileName);
    
    // Extraer número de semana del nombre
    const weekMatch = csvFileName.match(/S(\d+)/);
    if (!weekMatch) {
      console.warn(`No se pudo extraer el número de semana de: ${csvFileName}`);
      continue;
    }
    
    const weekNum = parseInt(weekMatch[1], 10);
    
    if (weekNum < 0 || weekNum > 8) {
      console.warn(`Número de semana fuera de rango (0-8): ${weekNum}`);
      continue;
    }
    
    console.log(`Procesando semana ${weekNum}...`);
    const week = parseCSV(csvFile);
    
    if (week) {
      weeks.push(week);
    } else {
      console.error(`Error procesando semana ${weekNum}`);
    }
  }
  
  // Ordenar semanas por número
  weeks.sort((a, b) => a.week - b.week);
  
  // Crear estructura final
  const menuData: MenuData = {
    allergens: [],
    weeks
  };
  
  // Escribir archivo de salida
  fs.writeFileSync(outputFile, JSON.stringify(menuData, null, 2), 'utf-8');
  
  console.log(`\n✅ Archivo generado: ${outputFile}`);
  console.log(`Total de semanas procesadas: ${weeks.length}`);
  console.log(`Semanas: ${weeks.map(w => w.week).join(', ')}`);
}

// Ejecutar
if (require.main === module) {
  main();
}

export { parseCSV, correctSpelling, normalizeItemName };

