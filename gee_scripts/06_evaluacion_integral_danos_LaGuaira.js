/**
 * @name 06_evaluacion_integral_danos_LaGuaira
 * @project Premio MapBiomas Venezuela 2026 - Categoría Pregrado
 * @description Cuantificación total de anomalías SAR agrupadas por 
 * subcategorías de cobertura de la tierra (MapBiomas Col. 3).
 * CORRECCIÓN: Ajuste exacto de clases Sabana/Herbazal (Pixel 12) y Arbustales (66, 50). Exclusión de aeropuerto removida.
 * @institution Laboratorio LSIGMA-USB
 * @authors Jocsan Bello - LSIGMA-USB
 * @region Estado La Guaira (Vargas), Venezuela
 */

// ==============================================================================
// 1. PARÁMETROS BASE Y ÁREA DE ESTUDIO
// ==============================================================================
var PARAMS = {
  inicio_pre: '2026-05-15', fin_pre: '2026-06-23',
  inicio_post: '2026-06-24', fin_post: '2026-07-06',
  polarizacion: 'VH', umbral_db: -3, escala_procesamiento: 10
};

var roi = ee.FeatureCollection("FAO/GAUL/2015/level1")
  .filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));
Map.centerObject(roi, 11);

// ==============================================================================
// 2. DETECCIÓN DE ANOMALÍAS SAR (HUELLA DE DESTRUCCIÓN)
// ==============================================================================
var s1 = ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(roi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))
  .filter(ee.Filter.eq('instrumentMode', 'IW')).select(PARAMS.polarizacion);

var pre = s1.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre).median().clip(roi);
var post = s1.filterDate(PARAMS.inicio_post, PARAMS.fin_post).median().clip(roi);

// Máscara binaria de destrucción
var anomaliasSAR = post.subtract(pre).lt(PARAMS.umbral_db).selfMask();

// NOTA METODOLÓGICA: Se ha removido la exclusión del Aeropuerto Internacional Simón Bolívar
// para integrar los daños estructurales y colapsos de pista en la evaluación global co-sísmica.
var huellaSismo = anomaliasSAR;

// ==============================================================================
// 3. RECLASIFICACIÓN EXACTA DE MAPBIOMAS (MÉTODO REMAP)
// ==============================================================================
var lulc = ee.Image("projects/mapbiomas-public/assets/venezuela/lulc/collection3/mapbiomas_venezuela_collection3_coverage_v1")
  .select('classification_2024').clip(roi);

// Listas de mapeo estricto según la leyenda de MapBiomas Venezuela Col. 3:
var clasesMapBiomas = [
  3, 4, 5, 6,       // -> Bosques (Formación forestal, Sabana arbolada, Manglar, Inundable)
  66, 50, 11,       // -> Arbustales (Arbustal, Xerófilo, Inundable)
  12, 13,           // -> Sabana / Herbazales (Sabana/Herbazal, Otras formaciones)
  15, 18, 21,       // -> Uso Agropecuario (Pasto, Agricultura, Mosaico)
  24,               // -> Uso Urbano
  22, 23, 25, 30    // -> Otras Zonas Antrópicas (Sin vegetación, Minería, etc.)
];

var misSeisCategorias = [
  1, 1, 1, 1,       // 1. Bosques
  2, 2, 2,          // 2. Arbustales
  3, 3,             // 3. Sabana / Herbazales
  4, 4, 4,          // 4. Uso Agropecuario
  5,                // 5. Uso Urbano
  6, 6, 6, 6        // 6. Otras Zonas Antrópicas
];

// Reclasificamos la imagen aplicando las listas anteriores
var lulcReclasificado = lulc.remap(clasesMapBiomas, misSeisCategorias).rename('Categoria_LULC');

// ==============================================================================
// 4. CRUCE ESPACIAL (DAÑO AISLADO POR TIPO DE TERRENO)
// ==============================================================================
// Recortamos el mapa de categorías usando solo los lugares donde ocurrió el sismo
var danoPorCobertura = lulcReclasificado.updateMask(huellaSismo);

var danoBosque = danoPorCobertura.eq(1).selfMask();
var danoArbustal = danoPorCobertura.eq(2).selfMask();
var danoHerbazal = danoPorCobertura.eq(3).selfMask();
var danoAgro = danoPorCobertura.eq(4).selfMask();
var danoUrbano = danoPorCobertura.eq(5).selfMask();
var danoAntropico = danoPorCobertura.eq(6).selfMask();

// ==============================================================================
// 5. EXTRACCIÓN ESTADÍSTICA (GRÁFICO Y PREPARACIÓN DE CSV)
// ==============================================================================
var areaHa = ee.Image.pixelArea().divide(10000).rename('Hectareas');
var imageParaAgrupar = areaHa.addBands(danoPorCobertura);

var stats = imageParaAgrupar.reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'clase'}),
  geometry: roi.geometry(),
  scale: PARAMS.escala_procesamiento, 
  maxPixels: 1e9
});

var nombresClases = ee.List([
  'N/A', 
  '1. Bosque (Deslizamientos)', 
  '2. Arbustales', 
  '3. Sabana / Herbazales', 
  '4. Uso Agropecuario', 
  '5. Uso Urbano', 
  '6. Otras Zonas Antrópicas'
]);

var colores = ['#006400', '#BDB76B', '#9ACD32', '#FFD700', '#FF0000', '#8A2BE2'];

var fcEstadisticas = ee.FeatureCollection(
  ee.List(stats.get('groups')).map(function(grupo) {
    var d = ee.Dictionary(grupo);
    var idClase = ee.Number(d.get('clase'));
    return ee.Feature(null, {
      'ID_Clase': idClase, 
      'Cobertura': nombresClases.get(idClase),
      'Hectareas_Afectadas': ee.Number(d.get('sum')).round() 
    });
  })
).sort('ID_Clase'); // Forzar el orden para evitar barras invertidas

// Gráfico Profesional en Consola
var chartOptions = {
  title: 'Impacto Sísmico por Cobertura de la Tierra (MapBiomas)',
  hAxis: {title: 'Categoría de Cobertura', titleTextStyle: {italic: false, bold: true}},
  vAxis: {title: 'Hectáreas Afectadas', titleTextStyle: {italic: false, bold: true}},
  colors: ['#444444'], 
  legend: {position: 'none'}
};

var chart = ui.Chart.feature.byFeature(fcEstadisticas, 'Cobertura', 'Hectareas_Afectadas')
  .setChartType('ColumnChart')
  .setOptions(chartOptions);

print('📊 ESTADÍSTICA DE IMPACTOS POR COBERTURA:', chart);

// ==============================================================================
// 6. EXPORTACIÓN A GOOGLE DRIVE (CSV)
// ==============================================================================
Export.table.toDrive({
  collection: fcEstadisticas,
  description: 'Danos_Sismo_Por_Cobertura_MapBiomas_LaGuaira',
  folder: 'Premio_MapBiomas_2026',
  fileFormat: 'CSV',
  selectors: ['Cobertura', 'Hectareas_Afectadas'] 
});

// ==============================================================================
// 7. VISUALIZACIÓN CARTOGRÁFICA
// ==============================================================================
Map.setOptions('SATELLITE');

Map.addLayer(danoBosque, {palette: [colores[0]]}, 'Daño en Bosques');
Map.addLayer(danoArbustal, {palette: [colores[1]]}, 'Daño en Arbustales');
Map.addLayer(danoHerbazal, {palette: [colores[2]]}, 'Daño en Sabana / Herbazales');
Map.addLayer(danoAgro, {palette: [colores[3]]}, 'Daño Agropecuario');
Map.addLayer(danoUrbano, {palette: [colores[4]]}, 'Daño Urbano (Infraestructura)');
Map.addLayer(danoAntropico, {palette: [colores[5]]}, 'Daño Otras Zonas Antrópicas');

// ==============================================================================
// 8. LEYENDA PROFESIONAL Y ESTADÍSTICA
// ==============================================================================
var legend = ui.Panel({ style: { position: 'bottom-left', padding: '12px 15px', backgroundColor: '#FFFFFF', width: '330px', border: '1px solid #cccccc' }});
legend.add(ui.Label('Mapa Integral de Impactos (Sismo)', { fontWeight: 'bold', fontSize: '15px', margin: '0 0 8px 0' }));
legend.add(ui.Label('Clasificación base: MapBiomas Col. 3', { fontSize: '12px', margin: '0 0 12px 0', color: '#666666' }));

function createLegendItem(color, title) {
  var colorBox = ui.Label('', { backgroundColor: color, padding: '8px', margin: '0 0 4px 0', border: '1px solid black' });
  var description = ui.Label(title, {margin: '0 0 4px 8px', fontSize: '13px'});
  return ui.Panel({ widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal'), style: {margin: '0 0 8px 0'} });
}

legend.add(createLegendItem(colores[0], '1. Bosques (Deslizamiento)'));
legend.add(createLegendItem(colores[1], '2. Arbustales (Pérdida de biomasa)'));
legend.add(createLegendItem(colores[2], '3. Sabana/Herbazales (Daño morfotectónico)'));
legend.add(createLegendItem(colores[3], '4. Uso Agropecuario (Daño económico)'));
legend.add(createLegendItem(colores[4], '5. Uso Urbano (Colapso)'));
legend.add(createLegendItem(colores[5], '6. Otras Zonas Antrópicas (Derrumbe)'));

Map.add(legend);

// ==============================================================================
// 9. EXPORTACIÓN ÚNICA A GOOGLE DRIVE (GeoTIFF CATEGÓRICO EN GCS_WGS_1984)
// ==============================================================================
// Exporta la capa única 'danoPorCobertura' (enteros de 1 a 6) en WGS84 (EPSG:4326)
Export.image.toDrive({
  image: danoPorCobertura.toInt8(),
  description: 'Mapa_Unico_Dano_CoSismico_LaGuaira_WGS84_10m',
  folder: 'Premio_MapBiomas_2026',
  scale: PARAMS.escala_procesamiento,
  region: roi.geometry(),
  maxPixels: 1e10,
  crs: PARAMS.crs_export
});
