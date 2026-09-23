/**
 * @name 05_vulnerabilidad_topografica_LaGuaira
 * @project Premio MapBiomas Venezuela 2026 - Categoría Pregrado
 * @description Análisis de Riesgo: Cruce de Infraestructura Destruida (SAR + MapBiomas)
 * con DEM (SRTM 30m). Clasificación y mapeo de 3 niveles de pendiente sin exclusiones.
 * Exportación automatizada de métricas a Google Drive.
 * @institution Laboratorio LSIGMA-USB
 * @authors Jocsan Bello - LSIGMA-USB
 * @region Estado La Guaira (Vargas), Venezuela
 */

// ==============================================================================
// 1. PARÁMETROS BASE
// ==============================================================================
var PARAMS = {
  inicio_pre: '2026-05-15', fin_pre: '2026-06-23',
  inicio_post: '2026-06-24', fin_post: '2026-07-06',
  polarizacion: 'VH', umbral_db: -3, escala_sar: 10
};

var roi = ee.FeatureCollection("FAO/GAUL/2015/level1")
  .filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));
Map.centerObject(roi, 12);

// ==============================================================================
// 2. DETECCIÓN DE DAÑO URBANO (Fusión Sentinel-1 + MapBiomas)
// ==============================================================================
// Adquisición y procesamiento SAR (Sentinel-1)
var s1 = ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(roi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))
  .filter(ee.Filter.eq('instrumentMode', 'IW')).select(PARAMS.polarizacion);
var pre = s1.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre).median().clip(roi);
var post = s1.filterDate(PARAMS.inicio_post, PARAMS.fin_post).median().clip(roi);

// Diferencia logarítmica para detección de daños (caída de retrodispersión)
var anomaliasSAR = post.subtract(pre).lt(PARAMS.umbral_db).selfMask();

// Integración con MapBiomas Colección 3 (Clases Urbanas)
// CITA OBLIGATORIA: MapBiomas – Colección 3 de la Serie Anual de Mapas de Cobertura y Uso del Suelo de Venezuela, consultada en Julio 2026 a través de https://venezuela.mapbiomas.org
var lulc = ee.Image("projects/mapbiomas-public/assets/venezuela/lulc/collection3/mapbiomas_venezuela_collection3_coverage_v1")
  .select('classification_2024').clip(roi); // Utilizamos 2024 como línea base pre-sismo

var maskUrbana = lulc.eq(24).or(lulc.eq(25));
var areasUrbanas = lulc.updateMask(maskUrbana);

// Intersección directa de la huella urbana con las anomalías SAR (Daño Neto Total)
// Nota: Se removió la exclusión del aeropuerto para un análisis territorial íntegro.
var danoUrbanoNeto = anomaliasSAR.updateMask(maskUrbana);

// ==============================================================================
// 3. ANÁLISIS TOPOGRÁFICO DE VULNERABILIDAD (SRTM CORREGIDO)
// ==============================================================================
var srtm = ee.Image("USGS/SRTMGL1_003").clip(roi);

// CORRECCIÓN NoData: Se aplica unmask(0) al DEM para evitar la pérdida de píxeles costeros
var slope = ee.Terrain.slope(srtm.unmask(0));

// CORRECCIÓN DE MÁSCARA: Inicialización base en 1 (Plano 0-15°) para retener el 100% de la huella dañada
var slopeClass = ee.Image(1)
  .where(slope.gt(15).and(slope.lte(30)), 2)
  .where(slope.gt(30), 3)
  .updateMask(danoUrbanoNeto) 
  .rename('Riesgo_Topografico');

// Separación de capas cartográficas para control visual
var danoPlano = slopeClass.eq(1).selfMask();
var danoModerado = slopeClass.eq(2).selfMask();
var danoCritico = slopeClass.eq(3).selfMask();

// ==============================================================================
// 4. GENERACIÓN DE ESTADÍSTICAS Y GRÁFICO (MÉTODO ROBUSTO Y EXACTO)
// ==============================================================================
var areaHa = ee.Image.pixelArea().divide(10000).rename('Hectareas');
var imageParaAgrupar = areaHa.addBands(slopeClass);

var stats = imageParaAgrupar.reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'clase'}),
  geometry: roi.geometry(),
  scale: PARAMS.escala_sar, // CORRECCIÓN: Ajustado a 10m para coincidir con la resolución nativa de Sentinel-1
  maxPixels: 1e9
});

var nombresClases = ee.List(['N/A', '1. Plano/Suave (0-15°)', '2. Moderado (15-30°)', '3. Crítico (>30°)']);

// Construcción del FeatureCollection ordenado matemáticamente por ID
var fcGrafico = ee.FeatureCollection(
  ee.List(stats.get('groups')).map(function(grupo) {
    var d = ee.Dictionary(grupo);
    var idClase = ee.Number(d.get('clase'));
    return ee.Feature(null, {
      'ID_Clase': idClase, 
      'Categoria': nombresClases.get(idClase),
      'Hectareas': d.get('sum')
    });
  })
).sort('ID_Clase');

var chartOptions = {
  title: 'Distribución de Daño Urbano según Pendiente del Terreno',
  hAxis: {title: 'Categoría de Inclinación', titleTextStyle: {italic: false, bold: true}},
  vAxis: {title: 'Hectáreas Destruidas', titleTextStyle: {italic: false, bold: true}},
  colors: ['#444444'],
  legend: {position: 'none'}
};

var chart = ui.Chart.feature.byFeature(fcGrafico, 'Categoria', 'Hectareas')
  .setChartType('ColumnChart')
  .setOptions(chartOptions);

print('📊 ANÁLISIS DE VULNERABILIDAD TOPOGRÁFICA:', chart);

// ==============================================================================
// 5. EXPORTACIÓN AUTOMATIZADA A GOOGLE DRIVE
// ==============================================================================
Export.table.toDrive({
  collection: fcGrafico,
  description: 'Estadisticas_Dano_Cosismico_Vulnerabilidad_Topografica_LaGuaira_2026',
  folder: 'Premio_MapBiomas_2026',
  fileFormat: 'CSV',
  selectors: ['ID_Clase', 'Categoria', 'Hectareas']
});

// ==============================================================================
// 6. VISUALIZACIÓN CARTOGRÁFICA
// ==============================================================================
Map.setOptions('SATELLITE');
Map.addLayer(areasUrbanas, {palette: ['#FFFFFF']}, '1. Huella Urbana (MapBiomas)', false);
Map.addLayer(slope, {min: 0, max: 60, palette: ['ffffff', 'ffffcc', 'ffeda0', 'fed976', 'feb24c', 'fd8d3c', 'fc4e2a', 'e31a1c', 'b10026']}, '2. Gradiente de Pendiente (SRTM)', false);

Map.addLayer(danoPlano, {palette: ['#FFC107']}, '3. Daño Terreno Plano (0-15°)');
Map.addLayer(danoModerado, {palette: ['#FF5722']}, '4. Daño Terreno Moderado (15-30°)');
Map.addLayer(danoCritico, {palette: ['#800000']}, '5. Daño Terreno Crítico (>30°)');

// ==============================================================================
// 7. LEYENDA PROFESIONAL Y CITA OBLIGATORIA
// ==============================================================================
var legend = ui.Panel({ style: { position: 'bottom-left', padding: '12px 15px', backgroundColor: '#FFFFFF', width: '380px', border: '1px solid #cccccc' }});
legend.add(ui.Label('Vulnerabilidad Estructural Topográfica', { fontWeight: 'bold', fontSize: '15px', margin: '0 0 8px 0' }));

// Etiqueta de cita oficial exigida en las Bases del Premio
legend.add(ui.Label('MapBiomas – Colección 3 de la Serie Anual de Mapas de Cobertura y Uso del Suelo de Venezuela, consultada en Julio 2026 a través de https://venezuela.mapbiomas.org', { fontSize: '9px', margin: '0 0 12px 0', color: '#777777', fontWeight: 'bold' }));

legend.add(ui.Label('Clasificación de colapsos según pendiente:', { fontSize: '12px', margin: '0 0 12px 0', color: '#666666' }));

function createLegendItem(color, title, desc) {
  var colorBox = ui.Label('', { backgroundColor: color, padding: '8px', margin: '0 0 4px 0', border: '1px solid black' });
  var textPanel = ui.Panel({ widgets: [ ui.Label(title, {fontWeight: 'bold', fontSize: '13px', margin: '0 0 2px 8px'}), ui.Label(desc, {fontSize: '11px', color: '#555555', margin: '0 0 0 8px'}) ], layout: ui.Panel.Layout.Flow('vertical') });
  return ui.Panel({ widgets: [colorBox, textPanel], layout: ui.Panel.Layout.Flow('horizontal'), style: {margin: '0 0 10px 0'} });
}

legend.add(createLegendItem('#FFFFFF', 'Huella Urbana Base', 'Zonas urbanas intactas (MapBiomas Colección 3)'));
legend.add(createLegendItem('#FFC107', 'Daño en Terreno Plano', 'Destrucción en pendientes de 0° a 15°'));
legend.add(createLegendItem('#FF5722', 'Daño en Terreno Moderado', 'Destrucción en pendientes de 15° a 30°'));
legend.add(createLegendItem('#800000', 'Daño Crítico en Laderas', 'Destrucción en pendientes mayores a 30°'));

Map.add(legend);

// ==============================================================================
// 8. EXPORTACIÓN GEOTIFF UNIFICADO PARA ARCMAP / QGIS
// ==============================================================================
// Renderizado visual en 3 bandas RGB (uint8) para preservar la paleta exacta de GEE
var danoTopograficoRGB = slopeClass.visualize({
  min: 1,
  max: 3,
  palette: ['#FFC107', '#FF5722', '#800000']
});

// Empaquetado multibanda: 
// - Banda 1 ('Clase_Pendiente'): Valores discretos (1 = Plano, 2 = Moderado, 3 = Crítico)
// - Bandas 2, 3, 4 ('vis-red', 'vis-green', 'vis-blue'): Render RGB listo para despliegue visual
var rasterExportacion = slopeClass.rename('Clase_Pendiente')
  .addBands(danoTopograficoRGB);

Export.image.toDrive({
  image: rasterExportacion,
  description: 'Dano_Cosismico_Pendiente_LaGuaira_2026',
  folder: 'Premio_MapBiomas_2026',
  fileNamePrefix: 'Dano_Cosismico_Pendiente_LaGuaira_2026',
  region: roi.geometry(),
  scale: PARAMS.escala_sar, // 10 m (resolución nativa de Sentinel-1)
  crs: 'EPSG:4326',        // Sistema de coordenadas WGS84
  maxPixels: 1e9
});
