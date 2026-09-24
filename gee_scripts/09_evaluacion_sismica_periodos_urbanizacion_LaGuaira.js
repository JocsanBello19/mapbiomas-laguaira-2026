/**
 * @name 09_evaluacion_sismica_periodos_urbanizacion_LaGuaira
 * @project Premio MapBiomas Venezuela 2026 - Categoría Estudiante de Pregrado
 * @description Evaluación del daño co-sísmico cruzado con la reconstrucción dinámica 
 *              de los Periodos de Urbanización a partir de la Colección 3 de MapBiomas.
 * @institution LSIGMA-USB
 * @authors Jocsan Bello
 * @region Estado La Guaira (Vargas), Venezuela
 * @citation Obligatoria: "MapBiomas – Colección 3 de la Serie Anual de Mapas de Cobertura 
 *            y Uso del Suelo de Venezuela, consultada en 2026 a través de https://venezuela.mapbiomas.org"
 */

// ==============================================================================
// 1. PARÁMETROS BASE Y ÁREA DE ESTUDIO (LA GUAIRA)
// ==============================================================================
var PARAMS = {
  inicio_pre: '2026-05-15', fin_pre: '2026-06-23',   // Ventana pre-sismo 2026
  inicio_post: '2026-06-24', fin_post: '2026-07-06', // Ventana post-sismo inmediato
  polarizacion: 'VH',         // Polarización optimizada para texturas e infraestructura
  umbral_db: -3.0,            // Umbral crítico de pérdida de retrodispersión para daño
  escala_proc: 10             // Resolución espacial
};

// Carga de la delimitación político-territorial oficial (Estado La Guaira)
var roi = ee.FeatureCollection("FAO/GAUL/2015/level1")
  .filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));
Map.centerObject(roi, 12);

// ==============================================================================
// 2. DETECCIÓN DE ANOMALÍAS SAR (HUELLA SÍSMICA INTEGRAL EN INFRAESTRUCTURA)
// ==============================================================================
var s1 = ee.ImageCollection("COPERNICUS/S1_GRD")
  .filterBounds(roi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .select(PARAMS.polarizacion);

// Reducción estadística por mediana para suprimir el speckle noise
var pre = s1.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre).median().clip(roi);
var post = s1.filterDate(PARAMS.inicio_post, PARAMS.fin_post).median().clip(roi);

// Variación logarítmica del coeficiente de retrodispersión (\Delta \sigma^0)
var huellaSismo = post.subtract(pre).lt(PARAMS.umbral_db).selfMask();

// ==============================================================================
// 3. RECONSTRUCCIÓN DINÁMICA DE LA EDAD DE LA INFRAESTRUCTURA (SOLUCIÓN AL ERROR)
// ==============================================================================
// Ingestión del Asset original multibanda de MapBiomas Venezuela Colección 3
var mapbiomasC3 = ee.Image("projects/mapbiomas-public/assets/venezuela/lulc/collection3/mapbiomas_venezuela_collection3_coverage_v1");

// Lista secuencial de años cubiertos por la Colección 3
var listaAnios = ee.List.sequence(1985, 2024);

// Iteración temporal para identificar el primer año de transición a clase antrópica (24 o 25)
var urbanAgeImg = ee.Image(listaAnios.iterate(function(anio, imgAcumulada) {
  var anioNum = ee.Number(anio);
  var nombreBanda = ee.String('classification_').cat(anioNum.format('%d'));
  var capaAnual = mapbiomasC3.select(nombreBanda);
  
  // Condición: Pertenece a Uso Urbano (24) u Otras áreas antrópicas sin vegetación (25)
  var esAntropico = capaAnual.eq(24).or(capaAnual.eq(25));
  
  // Si la imagen acumulada aún es 0 y el píxel es antrópico, se le asigna el año actual
  return ee.Image(imgAcumulada).where(ee.Image(imgAcumulada).eq(0).and(esAntropico), anioNum);
}, ee.Image(0))).clip(roi);

// Clasificación jerárquica robusta basada en los 9 períodos (Filtrado estricto de nulos > 0)
var periodosUrbanos = ee.Image(0)
  .where(urbanAgeImg.gt(0).and(urbanAgeImg.lte(1985)), 1)
  .where(urbanAgeImg.gt(1985).and(urbanAgeImg.lte(1990)), 2)
  .where(urbanAgeImg.gt(1990).and(urbanAgeImg.lte(1995)), 3)
  .where(urbanAgeImg.gt(1995).and(urbanAgeImg.lte(2000)), 4) // Hito: Desastre de Vargas 1999
  .where(urbanAgeImg.gt(2000).and(urbanAgeImg.lte(2005)), 5) // Obras de mitigación y reconstrucción
  .where(urbanAgeImg.gt(2005).and(urbanAgeImg.lte(2010)), 6)
  .where(urbanAgeImg.gt(2010).and(urbanAgeImg.lte(2015)), 7)
  .where(urbanAgeImg.gt(2015).and(urbanAgeImg.lte(2020)), 8)
  .where(urbanAgeImg.gt(2020), 9)                           // Margen de expansión reciente (2021-2024)
  .selfMask()
  .rename('Periodo');

// ==============================================================================
// 4. CRUCE ESPACIAL: VULNERABILIDAD CO-SÍSMICA VS EDAD DE LA INFRAESTRUCTURA
// ==============================================================================
// Máscara espacial que aísla las zonas urbanas históricas impactadas por el sismo de 2026
var danoPorPeriodo = periodosUrbanos.updateMask(huellaSismo);

// Cálculo estricto de superficies en hectáreas
var areaHa = ee.Image.pixelArea().divide(10000).rename('Hectareas');
var stats = areaHa.addBands(danoPorPeriodo).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'clase'}),
  geometry: roi.geometry(),
  scale: PARAMS.escala_proc,
  maxPixels: 1e9
});

// ==============================================================================
// 5. ESTRUCTURACIÓN DE DATOS PARA REPOSITORIO PÚBLICO (GITHUB MIGRATION READY)
// ==============================================================================
var nombresPeriodos = ee.List([
  'N/A', 
  '1. Hasta 1985 (Cascos Históricos Consolidados)', 
  '2. 1986 - 1990 (Expansión Industrial Litoral)', 
  '3. 1991 - 1995 (Crecimiento Periférico Medio)', 
  '4. 1996 - 2000 (Máxima Presión Pre-Desastre 1999)', 
  '5. 2001 - 2005 (Infraestructura de Mitigación Post-Vargas)', 
  '6. 2006 - 2010 (Densificación Conurbana)', 
  '7. 2011 - 2015 (Desarrollos Habitacionales Recientes)', 
  '8. 2016 - 2020 (Asentamientos Espontáneos en Vertiente)', 
  '9. 2021 - 2024 (Frente Antrópico Inestable de Última Data)'
]);

var statsFC = ee.FeatureCollection(
  ee.List(stats.get('groups')).map(function(grupo) {
    var d = ee.Dictionary(grupo);
    var idClase = ee.Number(d.get('clase'));
    return ee.Feature(null, {
      'ID_Periodo': idClase, 
      'Periodo_Infraestructura': nombresPeriodos.get(idClase),
      'Hectareas_Destruidas': ee.Number(d.get('sum')).round(),
      'Metadato_Fuente': 'MapBiomas Venezuela Colección 3 (1985-2024)'
    });
  })
).sort('ID_Periodo');

// ==============================================================================
// 6. CONTROL DE CALIDAD Y RENDERIZADO ESTADÍSTICO
// ==============================================================================
var chartOptions = {
  title: 'La Guaira 2026: Superficie Urbana Afectada vs. Periodo de Consolidación Territorial',
  hAxis: {title: 'Periodo de Ocupación Antrópica Unificada (MapBiomas C3)', titleTextStyle: {bold: true}},
  vAxis: {title: 'Área Con Pérdida de Coherencia SAR (Hectáreas)', titleTextStyle: {bold: true}},
  colors: ['#D4271E'], 
  legend: {position: 'none'}
};

var chart = ui.Chart.feature.byFeature(statsFC, 'Periodo_Infraestructura', 'Hectareas_Destruidas')
  .setChartType('ColumnChart')
  .setOptions(chartOptions);

print('📊 ANÁLISIS DE VULNERABILIDAD ANTRÓPICA INTEGRAL HISTÓRICA:', chart);

// ==============================================================================
// 7. EXPORTACIÓN AUTOMATIZADA A GOOGLE DRIVE
// ==============================================================================
Export.table.toDrive({
  collection: statsFC,
  description: 'Lineabase_Danos_Sismo_vs_Periodos_Urbanos_MapBiomas_2026',
  folder: 'Premio_MapBiomas_2026',
  fileFormat: 'CSV',
  selectors: ['ID_Periodo', 'Periodo_Infraestructura', 'Hectareas_Destruidas', 'Metadato_Fuente']
});

// ==============================================================================
// 8. DESPLIEGUE CARTOGRÁFICO DE PRECISIÓN EN EL LITORAL CENTRAL
// ==============================================================================
Map.setOptions('SATELLITE');

var paletaPeriodos = [
  '#37474F', // 1. Gris Pizarra (Consolidación pre-1985)
  '#0D47A1', // 2. Azul Oscuro
  '#00B0FF', // 3. Celeste 
  '#D81B60', // 4. Fucsia (Pico pre-1999)
  '#FFC107', // 5. Ámbar (Post-Vargas inmediato)
  '#00C853', // 6. Verde Esmeralda
  '#FF6D00', // 7. Naranja
  '#7B1FA2', // 8. Violeta
  '#D50000'  // 9. Rojo Carmesí (Frente inestable 2021-2024)
];

// Visualización de la línea base histórica completa
Map.addLayer(periodosUrbanos, {min: 1, max: 9, palette: paletaPeriodos}, '1. Línea Base Histórica de Ocupación (1985-2024)', false);

// Inyección cartográfica desagregada del daño co-sísmico por época
for (var i = 1; i <= 9; i++) {
  var capaDano = danoPorPeriodo.eq(i).selfMask();
  var nombreCapa = 'Daño Sísmico en Infraestructura Período: ' + i;
  Map.addLayer(capaDano, {palette: [paletaPeriodos[i-1]]}, nombreCapa);
}

// ==============================================================================
// 9. PANEL DE INTERFAZ CIENTÍFICA (LEYENDA DINÁMICA DE VULNERABILIDAD)
// ==============================================================================
var legend = ui.Panel({ 
  style: { position: 'bottom-left', padding: '12px 15px', backgroundColor: '#FFFFFF', width: '350px', border: '2px solid #D4271E' }
});

legend.add(ui.Label('Daño Co-Sísmico por Época de Consolidación', { fontWeight: 'bold', fontSize: '14px', color: '#D4271E', margin: '0 0 5px 0' }));
legend.add(ui.Label('Fuente: Producto Oficial de Periodos Urbanos (Macroclases 24 + 25)', { fontSize: '11px', color: '#666', fontStyle: 'italic', margin: '0 0 10px 0' }));

function cItem(color, title) {
  var colorBox = ui.Label('', { backgroundColor: color, padding: '8px', margin: '2px 0 0 0', border: '1px solid #000' });
  var description = ui.Label(title, { margin: '0 0 0 10px', fontSize: '11px' });
  return ui.Panel({ widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal') });
}

legend.add(cItem(paletaPeriodos[0], '1. Hasta 1985 (Cascos e Infraestructura Base)'));
legend.add(cItem(paletaPeriodos[1], '2. 1986 - 1990'));
legend.add(cItem(paletaPeriodos[2], '3. 1991 - 1995'));
legend.add(cItem(paletaPeriodos[3], '4. 1996 - 2000 (Presión Pre-Desastre de Vargas)'));
legend.add(cItem(paletaPeriodos[4], '5. 2001 - 2005 (Reconstrucción y Obras de Mitigación)'));
legend.add(cItem(paletaPeriodos[5], '6. 2006 - 2010'));
legend.add(cItem(paletaPeriodos[6], '7. 2011 - 2015'));
legend.add(cItem(paletaPeriodos[7], '8. 2016 - 2020'));
legend.add(cItem(paletaPeriodos[8], '9. 2021 - 2024 (Frente Costero Reciente e Infraestructura)'));

Map.add(legend);

// ==============================================================================
// 10. EXPORTACIÓN RASTER DE PERIODOS DE URBANIZACIÓN A GOOGLE DRIVE (PARA ARCMAP)
// Cita obligatoria: "MapBiomas – Colección 3 de la Serie Anual de Mapas de Cobertura 
// y Uso del Suelo de Venezuela, consultada en 2026 a través de https://venezuela.mapbiomas.org"
// ==============================================================================

Export.image.toDrive({
  image: periodosUrbanos.toInt16(), // Exportación en entero de 16-bits para preservar IDs de clase (1-9) y optimizar el peso
  description: 'MapBiomasC3_LaGuaira_Periodos_Urbanizacion_1985_2024',
  folder: 'Premio_MapBiomas_2026',
  fileNamePrefix: 'LaGuaira_Periodos_Urbanizacion_1985_2024_UTM20N',
  region: roi.geometry(),
  scale: PARAMS.escala_proc, // Mantiene la resolución de procesamiento definida (10 m)
  crs: 'EPSG:32620', // Proyección oficial UTM Zona 20N / WGS 84 (ideal para mediciones métricas en La Guaira)
  maxPixels: 1e9,
  formatOptions: {
    cloudOptimized: true
  }
});
