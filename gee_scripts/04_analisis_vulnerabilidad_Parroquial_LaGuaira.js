/**
 * @name 04_analisis_vulnerabilidad_Parroquial_LaGuaira
 * @project Premio MapBiomas Venezuela 2026 - Categoría Pregrado
 * @description Cruce espacial: Anomalías SAR Sentinel-1 vs MapBiomas Venezuela Col. 3 (Infraestructura).
 * Genera estadísticas de daño co-sísmico filtradas estrictamente para TODAS las parroquias 
 * del Estado La Guaira utilizando el asset de división político-territorial del INTI.
 * @institution Laboratorio LSIGMA-USB
 * @authors Jocsan Bello - LSIGMA-USB
 * @region Estado La Guaira (Vargas), Venezuela
 */

// ==============================================================================
// 1. PARÁMETROS BASE Y ÁREA DE ESTUDIO (ASSET INTI PARROQUIAS)
// ==============================================================================
var PARAMS = {
  inicio_pre: '2026-05-15', 
  fin_pre: '2026-06-23',
  inicio_post: '2026-06-24', 
  fin_post: '2026-07-06',
  polarizacion: 'VH', 
  umbral_db: -3.0, 
  escala: 10
};

// Asset oficial de divisiones parroquiales (INTI)
var assetParroquiasINTI = "projects/earthengine-legacy/assets/users/21-10065/inti_CARTOINTI_DPT_PARROQUIAS";
var parroquiasBase = ee.FeatureCollection(assetParroquiasINTI);

// Lista de control para filtrado estricto de parroquias de La Guaira (incluyendo variaciones de encoding)
var listaParroquiasLaGuaira = [
  'Caraballeda', 'Carayaca', 'Carlos Soublette', 'Caruao', 
  'Catia La Mar', 'Catia la Mar', 'Catia La mar', 'CATIA LA MAR',
  'El Junko', 'La Guaira', 'LA GUAIRA', 'Macuto', 'MACUTO',
  'Maiquetía', 'Maiquetia', 'MAIQUETIA', 'MAIQUETÍA',
  'Naiguatá', 'Naiguata', 'NAIGUATA', 'NAIGUATÁ',
  'Urimare', 'URIMARE'
];

// Filtrado robusto multicampo sobre la tabla de atributos de CARTOINTI
var parroquiasLaGuaira = parroquiasBase.filter(
  ee.Filter.or(
    ee.Filter.inList('PARROQUIA', listaParroquiasLaGuaira),
    ee.Filter.inList('parroquia', listaParroquiasLaGuaira),
    ee.Filter.inList('NOMB_PARR', listaParroquiasLaGuaira),
    ee.Filter.inList('adm3_name', listaParroquiasLaGuaira),
    ee.Filter.inList('DESCRIPCIO', listaParroquiasLaGuaira),
    ee.Filter.eq('ESTADO', 'VARGAS'),
    ee.Filter.eq('ESTADO', 'LA GUAIRA'),
    ee.Filter.eq('estado', 'VARGAS'),
    ee.Filter.eq('estado', 'LA GUAIRA')
  )
);

// Normalización de la propiedad del nombre parroquial para reporte cartográfico y gráficos
var parroquiasLaGuairaNorm = parroquiasLaGuaira.map(function(f) {
  var nombre = ee.Algorithms.If(f.get('PARROQUIA'), f.get('PARROQUIA'),
               ee.Algorithms.If(f.get('NOMB_PARR'), f.get('NOMB_PARR'),
               ee.Algorithms.If(f.get('adm3_name'), f.get('adm3_name'),
               ee.Algorithms.If(f.get('DESCRIPCIO'), f.get('DESCRIPCIO'), f.get('parroquia')))));
  return f.set('Nombre_Parroquia', nombre);
});

var roi = parroquiasLaGuairaNorm.geometry();
Map.centerObject(roi, 11);

// ==============================================================================
// 2. DETECCIÓN DE ANOMALÍAS SAR SENTINEL-1 (Evento Co-Sísmico 24-Jun-2026)
// ==============================================================================
var s1 = ee.ImageCollection("COPERNICUS/S1_GRD")
  .filterBounds(roi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .select(PARAMS.polarizacion);

var preSismo = s1.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre).median().clip(roi);
var postSismo = s1.filterDate(PARAMS.inicio_post, PARAMS.fin_post).median().clip(roi);

// Diferencia logarítmica de retrodispersión (Detección de cicatrices de deslave y colapsos)
var deltaSigma = postSismo.subtract(preSismo);
var areasAfectadas = deltaSigma.lt(PARAMS.umbral_db).selfMask();

// ==============================================================================
// 3. AISLAMIENTO DE INFRAESTRUCTURA URBANA (MAPBIOMAS VENEZUELA COL 3)
// ==============================================================================
// Colección 3 MapBiomas Venezuela (Línea base 2024 previa al sismo)
var mapbiomasCol3 = ee.Image("projects/mapbiomas-public/assets/venezuela/lulc/collection3/mapbiomas_venezuela_collection3_coverage_v1")
  .select('classification_2024')
  .clip(roi);

// Clases Antrópicas: Clase 24 (Uso Urbano) y Clase 25 (Otras áreas antrópicas sin vegetación)
var maskUrbana = mapbiomasCol3.eq(24).or(mapbiomasCol3.eq(25));
var areasUrbanasBase = mapbiomasCol3.updateMask(maskUrbana);

// ==============================================================================
// 4. CRUCE ESPACIAL DIRECTO (Huella de Daño Co-Sísmico Confirmado)
// ==============================================================================
var danoUrbanoFinal = areasAfectadas.updateMask(maskUrbana);

// ==============================================================================
// 5. CÁLCULO ESTADÍSTICO EN HECTÁREAS POR PARROQUIA (ASSET INTI)
// ==============================================================================
// Conversión de píxeles a hectáreas (superficie / 10,000 m²)
var areaHectareas = ee.Image.pixelArea().divide(10000);
var danoHectareasImg = danoUrbanoFinal.multiply(areaHectareas);

// Cuantificación zonal con agregación estricta por polígono parroquial
var danoPorParroquia = danoHectareasImg.reduceRegions({
  collection: parroquiasLaGuairaNorm,
  reducer: ee.Reducer.sum().setOutputs(['Hectareas_Destruidas']),
  scale: PARAMS.escala,
  crs: 'EPSG:4326'
});

var tablaOrdenada = danoPorParroquia.sort('Hectareas_Destruidas', false);

// ==============================================================================
// 6. GENERACIÓN DE GRÁFICO Y EXPORTACIÓN A GOOGLE DRIVE
// ==============================================================================
var graficoImpacto = ui.Chart.feature.byFeature({
  features: tablaOrdenada,
  xProperty: 'Nombre_Parroquia',
  yProperties: ['Hectareas_Destruidas']
})
.setChartType('ColumnChart')
.setOptions({
  title: 'Daño Co-Sísmico en Infraestructura por Parroquia (La Guaira - Asset INTI)',
  hAxis: {title: 'Parroquia', titleTextStyle: {italic: false, bold: true}},
  vAxis: {title: 'Área Destruida (ha)', titleTextStyle: {italic: false, bold: true}},
  colors: ['#D32F2F'],
  legend: {position: 'none'}
});

print("Distribución Espacial del Daño Estructural Co-Sísmico:", graficoImpacto);

Export.table.toDrive({
  collection: tablaOrdenada,
  description: 'Dano_Urbano_Parroquias_LaGuaira_INTI_2026',
  folder: 'Premio_MapBiomas_2026',
  fileFormat: 'CSV',
  selectors: ['Nombre_Parroquia', 'PARROQUIA', 'ESTADO', 'Hectareas_Destruidas']
});

// ==============================================================================
// 7. VISUALIZACIÓN CARTOGRÁFICA Y SIMBOLOGÍA
// ==============================================================================
Map.setOptions('SATELLITE');

Map.addLayer(areasUrbanasBase, {palette: ['#FFD700']}, '1. Base Urbana 2024 (MapBiomas Col 3)', false);
Map.addLayer(areasAfectadas, {palette: ['#FFA500']}, '2. Anomalías SAR Generales (Deslaves/Colapsos)', false);
Map.addLayer(danoUrbanoFinal, {palette: ['#FF0000']}, '3. DAÑO URBANO CONFIRMADO');
Map.addLayer(ee.Image().paint(parroquiasLaGuairaNorm, 0, 2), {palette: ['#00FFFF']}, '4. Límites Parroquiales (Asset INTI)', true);

// ==============================================================================
// 8. PANEL DE INTERFAZ Y CITA OFICIAL MAPBIOMAS
// ==============================================================================
var legend = ui.Panel({
  style: { 
    position: 'bottom-left', 
    padding: '12px 15px', 
    backgroundColor: '#FFFFFF', 
    width: '360px', 
    border: '1px solid #cccccc' 
  }
});

var legendTitle = ui.Label('Vulnerabilidad Urbana Post-Sismo 2026', { 
  fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0', color: '#333333', backgroundColor: '#FFFFFF' 
});
var legendSub = ui.Label('Cruce: Anomalías SAR Sentinel-1 vs MapBiomas Col. 3', { 
  fontSize: '11px', margin: '0 0 10px 0', color: '#666666', backgroundColor: '#FFFFFF' 
});

legend.add(legendTitle);
legend.add(legendSub);

function createSolidColorLegend(title, color, desc) {
  var colorBox = ui.Label('', { backgroundColor: color, padding: '8px', margin: '0 0 4px 0', border: '1px solid black' });
  var descriptionPanel = ui.Panel({
    widgets: [
      ui.Label(title, {margin: '0 0 2px 8px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#FFFFFF'}),
      ui.Label(desc, {margin: '0 0 0 8px', fontSize: '10px', color: '#555555', backgroundColor: '#FFFFFF'})
    ], 
    layout: ui.Panel.Layout.Flow('vertical'), 
    style: {backgroundColor: '#FFFFFF'}
  });
  return ui.Panel({ 
    widgets: [colorBox, descriptionPanel], 
    layout: ui.Panel.Layout.Flow('horizontal'), 
    style: {margin: '0 0 8px 0', backgroundColor: '#FFFFFF'} 
  });
}

legend.add(createSolidColorLegend('Infraestructura Base', '#FFD700', 'Clases 24 y 25 MapBiomas Venezuela (2024)'));
legend.add(createSolidColorLegend('Anomalías SAR Generales', '#FFA500', 'Pérdida de retrodispersión en laderas (Δσ° < -3dB)'));
legend.add(createSolidColorLegend('Daño Urbano Confirmado', '#FF0000', 'Colapsos estructurales e impacto antrópico directo'));
legend.add(createSolidColorLegend('Límites Parroquiales', '#00FFFF', 'Polígonos oficiales INTI (users/21-10065/inti_...)'));

// Cita oficial obligatoria según bases del Premio MapBiomas Venezuela 2026
var citation = ui.Label(
  'MapBiomas – Colección 3 de la Serie Anual de Mapas de Cobertura y Uso del Suelo de Venezuela, consultada en 27/08/2026 a través de https://venezuela.mapbiomas.org',
  {fontSize: '8.5px', color: '#555555', margin: '12px 0 0 0', backgroundColor: '#FFFFFF'}
);
legend.add(citation);

Map.add(legend);

// ==============================================================================
// 9. EXPORTACIÓN DE RASTER A GOOGLE DRIVE (EPSG:4326 - WGS84)
// ==============================================================================

Export.image.toDrive({
  image: danoUrbanoFinal.unmask(0).toByte(),
  description: 'Mapa_Dano_Urbano_Parroquial_LaGuaira_WGS84_10m',
  folder: 'Premio_MapBiomas_2026',
  scale: PARAMS.escala,
  region: roi,
  maxPixels: 1e10,
  crs: 'EPSG:4326'
});

// ==============================================================================
// 10. EXPORTACIÓN DE CAPA DE PARROQUIAS PARA ARCMAP / ARCGIS (RASTER Y VECTOR)
// ==============================================================================

// A. Asignación de ID numérico único (Server-Side) a cada parroquia para rasterización
var parroquiasLista = parroquiasLaGuairaNorm.toList(parroquiasLaGuairaNorm.size());
var parroquiasConID = ee.FeatureCollection(
  parroquiasLista.map(function(item) {
    var f = ee.Feature(item);
    var index = parroquiasLista.indexOf(f);
    return f.set('parroquia_id', ee.Number(index).add(1));
  })
);

// B. Rasterización de los polígonos parroquiales (Matriz de píxeles codificada por ID)
var rasterParroquias = parroquiasConID.reduceToImage({
  properties: ['parroquia_id'],
  reducer: ee.Reducer.first()
}).rename('parroquia_id').clip(roi);

// C. Exportación de la Imagen Raster GeoTIFF (Para procesamiento de capas en ArcMap)
Export.image.toDrive({
  image: rasterParroquias.toInt16(),
  description: 'Raster_Parroquias_LaGuaira_WGS84_10m',
  folder: 'Premio_MapBiomas_2026',
  scale: PARAMS.escala,
  region: roi,
  maxPixels: 1e10,
  crs: 'EPSG:4326'
});

// D. Exportación Vectorial ESRI Shapefile (SHP) con la tabla de atributos de daño por parroquia
Export.table.toDrive({
  collection: danoPorParroquia,
  description: 'Vector_Parroquias_LaGuaira_INTI_SHP',
  folder: 'Premio_MapBiomas_2026',
  fileFormat: 'SHP'
});
