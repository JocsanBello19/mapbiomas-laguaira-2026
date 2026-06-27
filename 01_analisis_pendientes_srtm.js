/**
 * @name 01_analisis_pendientes_srtm
 * @project Premio MapBiomas Venezuela 2026 - Categoría Pregrado
 * @description Cálculo de susceptibilidad topográfica (Pendientes > 30°)
 * basado en el Modelo Digital de Elevación SRTM (30m).
 * @region Estado La Guaira, Litoral Central, Venezuela
 */

// ==============================================================================
// 1. PARÁMETROS DE CONFIGURACIÓN
// ==============================================================================
var PARAMS = {
    umbral_pendiente: 30, // Grados (°) para clasificar riesgo crítico
    escala_srtm: 30       // Resolución espacial en metros
  };
  
  // Paletas de colores hex/nominales optimizadas para cartografía
  var VIS_PALETTES = {
    elevacion: ['006600', 'E5FFCC', 'FFE5CC', 'FF9933', 'CC0000'], 
    pendiente: ['ffffff', 'ffffcc', 'ffeda0', 'fed976', 'feb24c', 'fd8d3c', 'fc4e2a', 'e31a1c', 'b10026'],
    critica: ['#800000']  // Rojo oscuro para enfatizar laderas vulnerables
  };
  
  // ==============================================================================
  // 2. DEFINICIÓN DEL ÁREA DE ESTUDIO (REGION OF INTEREST - ROI)
  // ==============================================================================
  // Extracción del límite político-territorial (La Guaira / Vargas) mediante GAUL
  var venezuela = ee.FeatureCollection("FAO/GAUL/2015/level1");
  var roi = venezuela.filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));
  
  // Centrar la cámara sobre el Litoral Central
  Map.centerObject(roi, 10);
  
  // ==============================================================================
  // 3. PROCESAMIENTO GEOMORFÓLOGICO (GEOPROCESSING)
  // ==============================================================================
  // Carga y recorte del DEM SRTM a la extensión de la ROI
  var srtm = ee.Image("USGS/SRTMGL1_003").clip(roi);
  
  // Cálculo del gradiente topográfico (Slope) en grados
  var slope = ee.Terrain.slope(srtm);
  
  // Aislamiento booleano de laderas críticas (Umbral > 30°)
  // selfMask() elimina los valores 0 (falsos) de forma nativa y eficiente
  var laderasCriticas = slope.gt(PARAMS.umbral_pendiente).selfMask();
  
  // ==============================================================================
  // 4. CÁLCULO DE SUPERFICIE CRÍTICA (METRÍA OBLIGATORIA)
  // ==============================================================================
  // Cálculo del área por píxel y multiplicación por la máscara booleana
  var area_pixel = ee.Image.pixelArea();
  var area_laderas = laderasCriticas.multiply(area_pixel);
  
  // Reducción espacial para sumar el área total en la región
  var stat_area = area_laderas.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi.geometry(),
    scale: PARAMS.escala_srtm,
    maxPixels: 1e9 // Límite de seguridad de GEE
  });
  
  // Conversión de metros cuadrados a hectáreas
  var laderas_hectareas = ee.Number(stat_area.get('slope')).divide(10000);
  
  // Impresión del resultado exacto en la Consola (Pestaña 'Console' a la derecha)
  print('📊 ÁREA TOTAL DE LADERAS CRÍTICAS (>30°) EN LA GUAIRA (Hectáreas):', laderas_hectareas);
  
  // ==============================================================================
  // 5. VISUALIZACIÓN CARTOGRÁFICA
  // ==============================================================================
  // Activar el mapa base satelital por defecto para mejor contexto visual
  Map.setOptions('SATELLITE'); 
  
  // Capas base apagadas por defecto (false) para no saturar la vista
  Map.addLayer(srtm, {min: 0, max: 2500, palette: VIS_PALETTES.elevacion},
               '1. Elevación Digital (SRTM 30m)', false);
  
  Map.addLayer(slope, {min: 0, max: 60, palette: VIS_PALETTES.pendiente},
               '2. Gradiente de Pendiente (°)', false);
  
  // Capa crítica encendida
  Map.addLayer(laderasCriticas, {palette: VIS_PALETTES.critica},
               '3. Vulnerabilidad Topográfica (Laderas > 30°)');