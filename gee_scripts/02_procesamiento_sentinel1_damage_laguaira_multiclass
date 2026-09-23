/**
 * ==============================================================================
 * @name 02_procesamiento_sentinel1_damage_laguaira_multiclass
 * @project Premio MapBiomas Venezuela 2026 - Categoría Pregrado
 * @description Clasificación de severidad de deslizamientos y daños co-sísmicos 
 *              post-sismo (24 Junio 2026) usando Radar SAR Sentinel-1 y 
 *              cuantificación de superficie (ha) por nivel de severidad.
 * @institution Laboratorio LSIGMA-USB
 * @authors Jocsan Bello - LSIGMA-USB
 * @version 3.2 (Update: Reajuste Riguroso de Umbrales de Severidad SAR)
 * ==============================================================================
 */

// ==============================================================================
// 1. PARÁMETROS DE CONFIGURACIÓN TEMPORAL Y ESPACIAL (OPTIMIZADO ORBITALMENTE)
// ==============================================================================
var PARAMS = {
  // PRE-SISMO: 24 días exactos (2 ciclos orbitales completos de S1A) para una mediana robusta
  inicio_pre: '2026-06-01', 
  fin_pre: '2026-06-23',     
  
  // POST-SISMO: 12 días exactos (1 ciclo orbital). Garantiza la primera imagen disponible post-evento
  // sin dar tiempo a que lluvias posteriores o crecimiento de vegetación alteren la señal.
  inicio_post: '2026-06-24', 
  fin_post: '2026-07-05',    
  
  polarizacion: 'VH',        
  escala_sar: 30,            
  crs_proyecto: 'EPSG:32620' 
};

// ==============================================================================
// 2. DEFINICIÓN DEL ÁREA DE ESTUDIO (ROI)
// ==============================================================================
var venezuela = ee.FeatureCollection("FAO/GAUL/2015/level1");
var roi = venezuela.filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));

Map.centerObject(roi, 11);

// ==============================================================================
// 3. FILTRADO Y PROCESAMIENTO DE IMÁGENES RADAR
// ==============================================================================
var s1Collection = ee.ImageCollection("COPERNICUS/S1_GRD")
  .filterBounds(roi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .select(PARAMS.polarizacion);

var preSismo = s1Collection.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre).median().clip(roi);
var postSismo = s1Collection.filterDate(PARAMS.inicio_post, PARAMS.fin_post).median().clip(roi);

// ==============================================================================
// 4. METRICAS DIFERENCIALES Y CLASIFICACIÓN DE SEVERIDAD
// ==============================================================================
var diferenciaSAR = postSismo.subtract(preSismo);

// Lógica de Reclasificación (Árbol de Decisiones Vectorizado) según nuevos umbrales:
// - Sin Daño Detectado: Δσ⁰ > -1.5 dB (Enmascarado)
// - Nivel 1 (Leve / Alteración superficial): -2.0 dB < Δσ⁰ ≤ -1.5 dB
// - Nivel 2 (Daño Moderado): -3.0 dB < Δσ⁰ ≤ -2.0 dB
// - Nivel 3 (Severo): Δσ⁰ ≤ -3.0 dB
var clasificacionDano = ee.Image(0).byte()
  .where(diferenciaSAR.lte(-1.5).and(diferenciaSAR.gt(-2.0)), 1) // Clase 1: Leve (-2.0 < Δσ⁰ <= -1.5 dB)
  .where(diferenciaSAR.lte(-2.0).and(diferenciaSAR.gt(-3.0)), 2) // Clase 2: Moderado (-3.0 < Δσ⁰ <= -2.0 dB)
  .where(diferenciaSAR.lte(-3.0), 3)                              // Clase 3: Severo (Δσ⁰ <= -3.0 dB)
  .updateMask(diferenciaSAR.lte(-1.5))                            // Enmascaramos lo que no es daño (> -1.5 dB)
  .rename('clase_severidad');

// ==============================================================================
// 5. CÁLCULO OPTIMIZADO DE SUPERFICIE AFECTADA POR CATEGORÍA DE SEVERIDAD
// ==============================================================================
// Generación de imagen de área por píxel (m²) enmascarada
var areaPixel = ee.Image.pixelArea().updateMask(clasificacionDano);

// Reducción espacial agrupada por valor de clase de severidad
var statsArea = areaPixel.addBands(clasificacionDano).reduceRegion({
  reducer: ee.Reducer.sum().group({
    groupField: 1,
    groupName: 'clase_severidad'
  }),
  geometry: roi.geometry(),
  scale: PARAMS.escala_sar,
  maxPixels: 1e13,
  tileScale: 4
});

// Estructuración de resultados mediante diccionario
var listaGrupos = ee.List(statsArea.get('groups'));

var dictResultados = ee.Dictionary(listaGrupos.iterate(function(grupo, dict) {
  var g = ee.Dictionary(grupo);
  var claseKey = ee.Number(g.get('clase_severidad')).format('%d');
  var areaHa = ee.Number(g.get('sum')).divide(10000);
  return ee.Dictionary(dict).set(claseKey, areaHa);
}, ee.Dictionary({})));

// Extracción segura de hectáreas por clase (asignando 0 ha en caso de ausencia de píxeles)
var haNivel1 = ee.Number(dictResultados.get('1', 0));
var haNivel2 = ee.Number(dictResultados.get('2', 0));
var haNivel3 = ee.Number(dictResultados.get('3', 0));
var haTotal  = haNivel1.add(haNivel2).add(haNivel3);

// Impresión detallada y formal en la Consola
print('📊 REPORTE DE CONTROL GEOESPACIAL Y SUPERFICIE AFECTADA (LA GUAIRA 2026):');
print('🟡 Nivel 1: Leve / Alteración superficial (-1.5 a -2.0 dB) [ha]:', haNivel1);
print('🟠 Nivel 2: Daño Moderado (-2.0 a -3.0 dB) [ha]:', haNivel2);
print('🔴 Nivel 3: Severo (<= -3.0 dB) [ha]:', haNivel3);
print('🚨 Área Total Afectada (Todas las Categorías SAR) [ha]:', haTotal);

// ==============================================================================
// 6. VISUALIZACIÓN CARTOGRÁFICA EN EL DASHBOARD (FRONTEND)
// ==============================================================================
Map.setOptions('SATELLITE');

Map.addLayer(preSismo, {min: -25, max: -5}, '1. SAR Pre-Sismo (Firma Base)', false);

// Definimos la paleta de colores para las 3 clases (Amarillo, Naranja, Rojo Oscuro)
var paletaSeveridad = ['#f1c40f', '#e67e22', '#8b0000'];
Map.addLayer(clasificacionDano, {min: 1, max: 3, palette: paletaSeveridad}, '2. Severidad de Daños SAR');

// ==============================================================================
// 7. INTERFAZ GRÁFICA PROFESIONAL (LEYENDA DINÁMICA)
// ==============================================================================
var legend = ui.Panel({
  style: { position: 'bottom-left', padding: '12px 15px', backgroundColor: 'rgba(255, 255, 255, 0.95)', width: '340px', border: '1px solid #999', borderRadius: '6px' }
});

legend.add(ui.Label('Clasificación de Daños (SAR) - La Guaira', {fontWeight: 'bold', fontSize: '14px', margin: '0 0 4px 0'}));
legend.add(ui.Label('Detección Post-Sismo 2026', {fontSize: '11px', margin: '0 0 12px 0', color: '#555'}));

function createCategoricalRow(color, name, description) {
  var colorBox = ui.Label('', {backgroundColor: color, padding: '8px', margin: '4px 0 0 0', border: '1px solid #444'});
  var textPanel = ui.Panel({
    widgets: [
      ui.Label(name, {margin: '0 0 2px 8px', fontSize: '12px', fontWeight: 'bold'}),
      ui.Label(description, {margin: '0 0 0 8px', fontSize: '10px', color: '#555'})
    ],
    layout: ui.Panel.Layout.Flow('vertical'), style: {backgroundColor: 'rgba(0,0,0,0)'}
  });
  return ui.Panel({widgets: [colorBox, textPanel], layout: ui.Panel.Layout.Flow('horizontal'), style: {margin: '0 0 6px 0', backgroundColor: 'rgba(0,0,0,0)'}});
}

legend.add(createCategoricalRow('#f1c40f', 'Nivel 1: Leve / Alteración superficial', '-2.0 dB < Δσ⁰ <= -1.5 dB (Posible caída de dosel / humedad)'));
legend.add(createCategoricalRow('#e67e22', 'Nivel 2: Daño Moderado', '-3.0 dB < Δσ⁰ <= -2.0 dB (Flujos de detritos / remoción)'));
legend.add(createCategoricalRow('#8b0000', 'Nivel 3: Severo', 'Δσ⁰ <= -3.0 dB (Deslizamiento / colapso)'));

Map.add(legend);

// ==============================================================================
// 8. EXPORTACIÓN ARQUITECTÓNICA EXCLUSIVA (ASINCRÓNICA - DRIVE)
// ==============================================================================
// El TIF resultante contiene píxeles con valores enteros (1, 2 y 3) para análisis SIG posterior.
Export.image.toDrive({
  image: clasificacionDano, 
  description: 'Clasificacion_Severidad_SAR_LaGuaira_Junio2026_10m',
  folder: 'Premio_MapBiomas_2026',
  scale: PARAMS.escala_sar, 
  region: roi.geometry(),
  maxPixels: 1e10,
  crs: PARAMS.crs_proyecto
});
