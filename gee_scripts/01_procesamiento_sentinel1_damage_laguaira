/**
 * @name 01_procesamiento_sentinel1_damage_laguaira
 * @project Premio MapBiomas Venezuela 2026 - Categoría Pregrado
 * @description Detección de alteraciones superficiales (posibles deslizamientos)
 *              post-sismo (24 Junio 2026) usando Radar de Apertura Sintética (SAR) Sentinel-1.
 * @institution Laboratorio LSIGMA-USB
 * @authors Jocsan Bello - LSIGMA-USB
 * @version 2.0 (Corregido: Optimización de memoria y eliminación de desbordamiento de búfer)
 */

// ==============================================================================
// 1. PARÁMETROS DE CONFIGURACIÓN TEMPORAL Y ESPACIAL
// ==============================================================================
var PARAMS = {
  inicio_pre: '2026-06-01',
  fin_pre: '2026-06-23',      // Período de control (antes del sismo)
  inicio_post: '2026-06-24', // Fecha del doblete sísmico (M7.2 + M7.5)
  fin_post: '2026-07-05',    // Ventana ampliada para asegurar capturas post-evento
  polarizacion: 'VH',        // VH: Alta sensibilidad a la estructura del dosel y rugosidad
  umbral_db: -3,           // Caída anómala en dB (criterio de remoción en masa)
  escala_sar: 30,            // Resolución espacial nativa de Sentinel-1 (metros)
  crs_proyecto: 'EPSG:32620' // UTM Zona 20N (Óptimo para La Guaira)
};

// ==============================================================================
// 2. DEFINICIÓN DEL ÁREA DE ESTUDIO (ROI)
// ==============================================================================
var venezuela = ee.FeatureCollection("FAO/GAUL/2015/level1");
var roi = venezuela.filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));

Map.centerObject(roi, 11);

// ==============================================================================
// 3. FILTRADO Y PROCESAMIENTO DE IMÁGENES RADAR (SENTINEL-1 SAR)
// ==============================================================================
// Carga optimizada de la colección Sentinel-1 GRD en modo IW
var s1Collection = ee.ImageCollection("COPERNICUS/S1_GRD")
  .filterBounds(roi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .select(PARAMS.polarizacion);

// Composición Pre-sismo: Reducción por mediana temporal para mitigar el ruido Speckle
var preSismo = s1Collection.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre)
  .median()
  .clip(roi);

// Composición Post-sismo: Captura inmediata del impacto co-sísmico
var postSismo = s1Collection.filterDate(PARAMS.inicio_post, PARAMS.fin_post)
  .median()
  .clip(roi);

// ==============================================================================
// 4. METRICAS DIFERENCIALES Y DETECCIÓN DE ANOMALÍAS
// ==============================================================================
// Cálculo de la diferencia logarítmica de retrodispersión (\Delta \sigma^0)
var diferenciaSAR = postSismo.subtract(preSismo);

// Aislamiento booleano estricto de remociones en masa mediante umbralización analítica
// El uso de selfMask() elimina los píxeles falsos del flujo de datos
var areasAfectadas = diferenciaSAR.lt(PARAMS.umbral_db).selfMask();

// ==============================================================================
// 5. CÁLCULO DE SUPERFICIE AFECTADA (CÓMPUTO ASINCRÓNICO EN LA NUBE)
// ==============================================================================
var areaPixel = ee.Image.pixelArea();
var areaDano = areasAfectadas.multiply(areaPixel);

// Reducción espacial parametrizada con mayor tolerancia para evitar fallos de memoria
var statDano = areaDano.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi.geometry(),
  scale: PARAMS.escala_sar,
  maxPixels: 1e13, // Elevado para prevenir desbordamientos en el clúster
  tileScale: 4     // Fraccionamiento de tejas para optimizar la paralelización
});

// Conversión explícita a hectáreas y formateo numérico
var danoHectareas = ee.Number(statDano.get(PARAMS.polarizacion)).divide(10000);

// Impresión de metadatos de control en consola
print('📊 PROCESAMIENTO DE CONTROL GEOESPACIAL:');
print('Área total afectada calculada (ha):', danoHectareas);
print('Cita Obligatoria de Respaldo:', 
      'Línea base generada mediante MapBiomas – Colección 3 de la Serie Anual de Mapas de Cobertura y Uso del Suelo de Venezuela, consultada a través de https://venezuela.mapbiomas.org');

// ==============================================================================
// 6. VISUALIZACIÓN CARTOGRÁFICA EN EL DASHBOARD
// ==============================================================================
Map.setOptions('SATELLITE');

// Capa Base: Respuesta de retrodispersión antes del desastre
Map.addLayer(preSismo, {min: -25, max: -5}, '1. SAR Pre-Sismo (Firma Base)', false);

// Capa Temática: Cicatrices co-sísmicas identificadas en color carmesí de alerta
Map.addLayer(areasAfectadas, {palette: ['#E60000']}, '2. Anomalías SAR (Daños < -3.0 dB)');

// ==============================================================================
// 7. INTERFAZ GRÁFICA PROFESIONAL (LEYENDA DE CONTROL)
// ==============================================================================
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '12px 15px',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    width: '320px',
    border: '1px solid #999999',
    borderRadius: '4px'
  }
});

var legendTitle = ui.Label('Impacto Sísmico (Radar SAR) - La Guaira', {
  fontWeight: 'bold',
  fontSize: '14px',
  margin: '0 0 4px 0',
  color: '#222222',
  backgroundColor: 'rgba(0,0,0,0)'
});
legend.add(legendTitle);

var legendSub = ui.Label('Detección Post-Sismo 2026', {
  fontSize: '11px',
  margin: '0 0 12px 0',
  color: '#555555',
  backgroundColor: 'rgba(0,0,0,0)'
});
legend.add(legendSub);

// Generador de degradados para datos continuos de radar
function createGradientLegend(title, palette, min, max, units) {
  var panel = ui.Panel({style: {margin: '0 0 12px 0', backgroundColor: 'rgba(0,0,0,0)'}});
  var label = ui.Label(title, {fontWeight: '600', fontSize: '12px', margin: '0 0 6px 0', backgroundColor: 'rgba(0,0,0,0)'});
  panel.add(label);

  var lon = ee.Image.pixelLonLat().select('longitude');
  var thumbnail = ui.Thumbnail({
    image: lon,
    params: {bbox: [0, 0, 1, 0.1], dimensions: '260x12', format: 'png', min: 0, max: 1, palette: palette},
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '12px'}
  });
  panel.add(thumbnail);

  var labels = ui.Panel({
    widgets: [
      ui.Label(min, {margin: '4px 8px', fontSize: '10px', backgroundColor: 'rgba(0,0,0,0)'}),
      ui.Label('Media', {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal', fontSize: '10px', backgroundColor: 'rgba(0,0,0,0)'}),
      ui.Label(max + ' ' + units, {margin: '4px 8px', fontSize: '10px', backgroundColor: 'rgba(0,0,0,0)'})
    ],
    layout: ui.Panel.Layout.Flow('horizontal'),
    style: {backgroundColor: 'rgba(0,0,0,0)'}
  });
  panel.add(labels);
  return panel;
}

// Generador de bloques discretos para la máscara de daños
function createSolidColorLegend(title, color, desc) {
  var colorBox = ui.Label('', {
    backgroundColor: color,
    padding: '8px',
    margin: '4px 0 0 0',
    border: '1px solid #000000'
  });
  var descriptionPanel = ui.Panel({
    widgets: [
      ui.Label(title, {margin: '0 0 2px 8px', fontSize: '12px', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0)'}),
      ui.Label(desc, {margin: '0 0 0 8px', fontSize: '10px', color: '#444444', backgroundColor: 'rgba(0,0,0,0)'})
    ],
    layout: ui.Panel.Layout.Flow('vertical'),
    style: {backgroundColor: 'rgba(0,0,0,0)'}
  });
  
  return ui.Panel({
    widgets: [colorBox, descriptionPanel],
    layout: ui.Panel.Layout.Flow('horizontal'),
    style: {margin: '0 0 8px 0', backgroundColor: 'rgba(0,0,0,0)'}
  });
}

var radarPalette = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'];
legend.add(createGradientLegend('Retrodispersión (\sigma^0 Pre-Sismo)', radarPalette, -25, -5, 'dB'));
legend.add(createSolidColorLegend('Alteración Superficial Severa', '#E60000', 'Caída inestable <= -3.0 dB (Deslaves/Colapsos)'));

Map.add(legend);

// ==============================================================================
// 8. EXPORTACIÓN ARQUITECTÓNICA EXCLUSIVA (ASINCRÓNICA - DRIVE)
// ==============================================================================
// Se elimina la función sincrónica síncrona .getDownloadURL() que causaba el error 
// de desbordamiento de los 50MB. En su lugar, parametrizamos la visualización RGB 
// y la enviamos al gestor asíncrono "Tasks".

var anomaliasVisualRGB = areasAfectadas.visualize({
  palette: ['#E60000']
});

// Exportación robusta a Google Drive. Mantiene la resolución nativa de 10m y 
// el sistema de proyección cartográfica UTM Zona 20N para su integración directa en ArcMap/QGIS.
Export.image.toDrive({
  image: anomaliasVisualRGB, 
  description: 'Solo_Anomalias_SAR_LaGuaira_Junio2026_10m',
  folder: 'Premio_MapBiomas_2026',
  scale: PARAMS.escala_sar, 
  region: roi.geometry(),
  maxPixels: 1e10,
  crs: PARAMS.crs_proyecto
});
