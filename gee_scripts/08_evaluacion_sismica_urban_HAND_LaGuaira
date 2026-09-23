/**
 * @name 08_evaluacion_sismica_urban_HAND_LaGuaira
 * @project Premio MapBiomas Venezuela 2026 - Categoría Pregrado
 * @description Evaluación de daño urbano cruzado con el modelo hidrológico HAND 
 * (Height Above Nearest Drainage) para identificar zonas de vulnerabilidad por licuefacción.
 * NOTA: Esta versión elimina la máscara de exclusión aeroportuaria para capturar el daño estructural total.
 * @institution LSIGMA-USB
 * @authors Jocsan Bello
 * @region Estado La Guaira (Vargas), Venezuela
 */

// ==============================================================================
// 1. PARÁMETROS BASE Y ÁREA DE ESTUDIO
// ==============================================================================
var PARAMS = {
  inicio_pre: '2026-05-15', fin_pre: '2026-06-23',
  inicio_post: '2026-06-24', fin_post: '2026-07-06',
  polarizacion: 'VH', umbral_db: -3, escala_proc: 10
};

// Delimitación espacial del Estado La Guaira (Vargas)
var roi = ee.FeatureCollection("FAO/GAUL/2015/level1")
  .filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));
Map.centerObject(roi, 13);

// ==============================================================================
// 2. DETECCIÓN DE ANOMALÍAS SAR (HUELLA SÍSMICA)
// ==============================================================================
// Colección Sentinel-1 GRD con filtros de polarización y modo interferométrico
var s1 = ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(roi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))
  .filter(ee.Filter.eq('instrumentMode', 'IW')).select(PARAMS.polarizacion);

// Construcción de medianas temporales libres de ruido
var pre = s1.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre).median().clip(roi);
var post = s1.filterDate(PARAMS.inicio_post, PARAMS.fin_post).median().clip(roi);

// Cálculo de la diferencia logarítmica para aislar cambios abruptos (caída de backscatter)
var anomaliasSAR = post.subtract(pre).lt(PARAMS.umbral_db).selfMask();

// NOTA METODOLÓGICA: Se ha prescindido de la exclusión manual del Aeropuerto Internacional.
// La variable asume ahora la totalidad de la anomalía detectada.
var huellaSismo = anomaliasSAR; 

// ==============================================================================
// 3. AISLAMIENTO DE LA HUELLA URBANA (MAPBIOMAS COL. 3)
// ==============================================================================
// Carga del mapa base unificado para la línea temporal pre-sismo
var lulc = ee.Image("projects/mapbiomas-public/assets/venezuela/lulc/collection3/mapbiomas_venezuela_collection3_coverage_v1")
  .select('classification_2022').clip(roi);

// Aislamiento de Clases Antrópicas: 24 (Uso urbano) y 25 (Otras áreas antrópicas sin vegetación)
var maskUrbana = lulc.eq(24).or(lulc.eq(25));
var danoUrbanoNeto = huellaSismo.updateMask(maskUrbana);

// ==============================================================================
// 4. MODELO HIDROLÓGICO "URBAN HAND" (Height Above Nearest Drainage)
// ==============================================================================
// Asset Global HAND a 30 metros para modelado de proximidad a redes de drenaje
var handGlobal = ee.Image("users/gena/GlobalHAND/30m/hand-1000").clip(roi);

// Clasificación categórica de vulnerabilidad por licuefacción y saturación hídrica
var handClass = ee.Image(0)
  .where(handGlobal.lte(3), 1)                               // 1: 0 a 3m (Riesgo Crítico)
  .where(handGlobal.gt(3).and(handGlobal.lte(6)), 2)         // 2: 3 a 6m (Riesgo Moderado)
  .where(handGlobal.gt(6), 3)                                // 3: > 6m (Riesgo Bajo / Terrazas)
  .updateMask(danoUrbanoNeto)                                // Cruce matricial: Área de destrucción urbana efectiva
  .rename('Clase_HAND');

// ==============================================================================
// 5. EXTRACCIÓN ESTADÍSTICA ROBUSTA
// ==============================================================================
var areaHa = ee.Image.pixelArea().divide(10000).rename('Hectareas');

// Cuantificación de áreas afectadas por grupo HAND
var stats = areaHa.addBands(handClass).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'clase'}),
  geometry: roi.geometry(),
  scale: PARAMS.escala_proc,
  maxPixels: 1e9
});

// Diccionario de etiquetas para exportación y visualización
var nombresHAND = ee.List([
  'N/A', 
  '1. Crítico (0 - 3m)', 
  '2. Moderado (3 - 6m)', 
  '3. Bajo (> 6m)'
]);

// Mapeo seguro a FeatureCollection para habilitar despliegue de Chart y Drive
var fcEstadisticas = ee.FeatureCollection(
  ee.List(stats.get('groups')).map(function(grupo) {
    var d = ee.Dictionary(grupo);
    var idClase = ee.Number(d.get('clase'));
    return ee.Feature(null, {
      'ID_Clase': idClase, 
      'Nivel_Vulnerabilidad_HAND': nombresHAND.get(idClase),
      'Hectareas_Destruidas': ee.Number(d.get('sum')).round() // Redondeo para pulcritud gráfica
    });
  })
).sort('ID_Clase'); 

// ==============================================================================
// 6. GENERACIÓN DE GRÁFICO EN CONSOLA
// ==============================================================================
// Parámetros rigurosos de visualización de datos
var chartOptions = {
  title: 'Daño Urbano Sísmico según Modelo Hidrológico HAND',
  hAxis: {title: 'Vulnerabilidad Hídrica / Posible Licuefacción', titleTextStyle: {bold: true}},
  vAxis: {title: 'Hectáreas Destruidas', titleTextStyle: {bold: true}},
  colors: ['#800000'], // Uso de paleta de alerta sísmica severa
  legend: {position: 'none'}
};

// Inicialización del diagrama de barras asegurando cruce de propiedades existentes
var chart = ui.Chart.feature.byFeature(fcEstadisticas, 'Nivel_Vulnerabilidad_HAND', 'Hectareas_Destruidas')
  .setChartType('ColumnChart')
  .setOptions(chartOptions);

print('📊 ANÁLISIS URBAN HAND (Sismología):', chart);

// ==============================================================================
// 7. EXPORTACIÓN DEL CSV A GOOGLE DRIVE
// ==============================================================================
Export.table.toDrive({
  collection: fcEstadisticas,
  description: 'Danos_Sismo_Urban_HAND_MapBiomas',
  folder: 'Premio_MapBiomas_2026',
  fileFormat: 'CSV',
  selectors: ['Nivel_Vulnerabilidad_HAND', 'Hectareas_Destruidas']
});

// ==============================================================================
// 8. VISUALIZACIÓN CARTOGRÁFICA
// ==============================================================================
Map.setOptions('SATELLITE');

// Capa Base: HAND Urbano Completo (Tonos azules para visualizar el agua/drenaje)
var urbanHandBase = handGlobal.updateMask(maskUrbana);
Map.addLayer(urbanHandBase, {min: 0, max: 15, palette: ['#01579B', '#0288D1', '#81D4FA', '#E1F5FE']}, '1. Capa Base: Modelo Urban HAND', false);

// Capas de Destrucción clasificadas por nivel HAND
Map.addLayer(handClass.eq(1).selfMask(), {palette: ['#800000']}, '2. Daño en Riesgo Crítico (0-3m)');
Map.addLayer(handClass.eq(2).selfMask(), {palette: ['#FF5722']}, '3. Daño en Riesgo Moderado (3-6m)');
Map.addLayer(handClass.eq(3).selfMask(), {palette: ['#FFC107']}, '4. Daño en Riesgo Bajo (>6m)');

// ==============================================================================
// 9. LEYENDA PROFESIONAL (GEOMORFOLOGÍA Y SISMOLOGÍA)
// ==============================================================================
var legend = ui.Panel({ style: { position: 'bottom-left', padding: '12px 15px', backgroundColor: '#FFFFFF', width: '350px', border: '1px solid #cccccc' }});
legend.add(ui.Label('Exposición Urbana (Modelo HAND)', { fontWeight: 'bold', fontSize: '15px', margin: '0 0 8px 0' }));
legend.add(ui.Label('Relación del daño sísmico con la altitud sobre el drenaje', { fontSize: '11px', margin: '0 0 12px 0', color: '#666666' }));

function cItem(color, title, desc) {
  var colorBox = ui.Label('', { backgroundColor: color, padding: '8px', margin: '0 0 4px 0', border: '1px solid black' });
  var textPanel = ui.Panel({ widgets: [ ui.Label(title, {fontWeight: 'bold', fontSize: '13px', margin: '0 0 2px 8px'}), ui.Label(desc, {fontSize: '11px', color: '#555555', margin: '0 0 0 8px'}) ], layout: ui.Panel.Layout.Flow('vertical') });
  return ui.Panel({ widgets: [colorBox, textPanel], layout: ui.Panel.Layout.Flow('horizontal'), style: {margin: '0 0 10px 0'} });
}

// Elementos de la leyenda
legend.add(cItem('#800000', 'Crítico (0 a 3m)', 'Suelos saturados (Alta probabilidad de licuefacción)'));
legend.add(cItem('#FF5722', 'Moderado (3 a 6m)', 'Llanuras aluviales y transición'));
legend.add(cItem('#FFC107', 'Bajo (> 6m)', 'Terrazas altas y pendientes seguras (Hídricamente)'));

Map.add(legend);

// ==============================================================================
// 10. EXPORTACIÓN DE GEOTIFF MULTIBANDA A GOOGLE DRIVE PARA ARCMAP / ARCGIS PRO
// ==============================================================================

// Integración de capas en una sola imagen multibanda
var tiffExport = ee.Image.cat([
  handClass.unmask(0).rename('Clase_HAND_Global'),    // Banda 1: Categórica (1: Crítico, 2: Moderado, 3: Bajo, 0: Sin daño)
  handClass.eq(1).unmask(0).rename('Dano_Critico_0_3m'),  // Banda 2: Binaria (1 = Daño Crítico, 0 = Otro)
  handClass.eq(2).unmask(0).rename('Dano_Moderado_3_6m'), // Banda 3: Binaria (1 = Daño Moderado, 0 = Otro)
  handClass.eq(3).unmask(0).rename('Dano_Bajo_gt6m')     // Banda 4: Binaria (1 = Daño Bajo, 0 = Otro)
]).toInt16().clip(roi);

// Exportación del raster consolidado
Export.image.toDrive({
  image: tiffExport,
  description: 'LaGuaira_DanoUrbano_HAND_Multibanda_2026',
  folder: 'Premio_MapBiomas_2026',
  fileNamePrefix: 'LaGuaira_DanoUrbano_HAND_Multibanda_2026',
  region: roi.geometry(),
  scale: PARAMS.escala_proc,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});
