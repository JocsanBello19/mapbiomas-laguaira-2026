/**

 * @name 07_evaluacion_matriz_pendiente_cobertura_LaGuaira

 * @project Premio MapBiomas Venezuela 2026 - Categoría Pregrado

 * @description Matriz de Riesgo: Cruce de 6 subcategorías de cobertura (MapBiomas) 

 * contra las 4 clases de Pendiente Urbana de MapBiomas (0-10, 10-25, 25-45, >45).

 * Corrección aplicada: Homologación de keys en diccionarios para ui.Chart. Inclusión de cita obligatoria.

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



var roi = ee.FeatureCollection("FAO/GAUL/2015/level1")

  .filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));

Map.centerObject(roi, 11);



// ==============================================================================

// 2. DETECCIÓN DE ANOMALÍAS SAR (HUELLA DE DESTRUCCIÓN CO-SÍSMICA)

// ==============================================================================

var s1 = ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(roi)

  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))

  .filter(ee.Filter.eq('instrumentMode', 'IW')).select(PARAMS.polarizacion);



var pre = s1.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre).median().clip(roi);

var post = s1.filterDate(PARAMS.inicio_post, PARAMS.fin_post).median().clip(roi);

var anomaliasSAR = post.subtract(pre).lt(PARAMS.umbral_db).selfMask();



// NOTA METODOLÓGICA: Se ha removido la exclusión del Aeropuerto Internacional Simón Bolívar

// para contabilizar los daños en infraestructura estratégica costera.

var huellaSismo = anomaliasSAR;



// ==============================================================================

// 3. CAPA 1: RECLASIFICACIÓN EXACTA MAPBIOMAS (6 CLASES DE LULC)

// ==============================================================================

// Se emplea la Colección 3 pública

var lulc = ee.Image("projects/mapbiomas-public/assets/venezuela/lulc/collection3/mapbiomas_venezuela_collection3_coverage_v1")

  .select('classification_2024').clip(roi); // Actualizado al baseline 2024 previo al sismo



var clasesMapBiomas = [3, 4, 5, 6, 66, 50, 11, 12, 13, 15, 18, 21, 24, 22, 23, 25, 30];

var misSeisCategorias = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5, 6, 6, 6, 6];

var lulcRec = lulc.remap(clasesMapBiomas, misSeisCategorias).rename('LULC');



// ==============================================================================

// 4. CAPA 2: PENDIENTE URBANA MAPBIOMAS (ALOS AW3D30)

// ==============================================================================

var alos = ee.Image("JAXA/ALOS/AW3D30/V2_2").select('AVE_DSM').clip(roi);

var slopeRaw = ee.Terrain.slope(alos);



var pendienteMapBiomas = ee.Image(0)

  .where(slopeRaw.lte(10), 1)

  .where(slopeRaw.gt(10).and(slopeRaw.lte(25)), 2)

  .where(slopeRaw.gt(25).and(slopeRaw.lte(45)), 3)

  .where(slopeRaw.gt(45), 4)

  .selfMask()

  .rename('Pendiente');



// ==============================================================================

// 5. CRUCE DE MATRIZ (PENDIENTE x COBERTURA x DAÑO)

// ==============================================================================

var matrizCombinada = pendienteMapBiomas.multiply(10).add(lulcRec).rename('Combo');

var matrizDano = matrizCombinada.updateMask(huellaSismo);



var areaHa = ee.Image.pixelArea().divide(10000).rename('Hectareas');

var stats = areaHa.addBands(matrizDano).reduceRegion({

  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'clase'}),

  geometry: roi.geometry(),

  scale: PARAMS.escala_proc,

  maxPixels: 1e9

});



// ==============================================================================

// 6. ESTRUCTURACIÓN DE DATOS CORREGIDA (SOLUCIÓN A DICCIONARIOS Y UI.CHART)

// ==============================================================================

var nombresPendiente = ee.List(['1. Suave (0°-10°)', '2. Moderada (10°-25°)', '3. Escarpada (25°-45°)', '4. Abrupta (>45°)']);



// Convertimos los resultados en una FeatureCollection nativa para evitar iteraciones fallidas

var statsFC = ee.FeatureCollection(

  ee.List(stats.get('groups')).map(function(g) {

    return ee.Feature(null, ee.Dictionary(g));

  })

);



var fcEstadisticas = ee.FeatureCollection(

  ee.List.sequence(1, 4).map(function(s) {

    var slopeId = ee.Number(s);

    var slopeName = nombresPendiente.get(slopeId.subtract(1));

    var feature = ee.Feature(null, {'Clase_Pendiente': slopeName});

    

    var lulcAreas = ee.List.sequence(1, 6).map(function(l) {

      var targetCombo = slopeId.multiply(10).add(ee.Number(l));

      var match = statsFC.filter(ee.Filter.eq('clase', targetCombo));

      return ee.Algorithms.If(match.size().gt(0), ee.Number(match.first().get('sum')).round(), 0);

    });

    

    // 🛠️ CORRECCIÓN APLICADA AQUÍ: Se utiliza exactamente la cadena "Otras Zonas Antrópicas"

    return feature.set({

      'Bosque': lulcAreas.get(0), 

      'Arbustales': lulcAreas.get(1),

      'Sabana_Herbazal': lulcAreas.get(2), 

      'Agropecuario': lulcAreas.get(3),

      'Urbano': lulcAreas.get(4), 

      'Otras Zonas Antrópicas': lulcAreas.get(5) 

    });

  })

);



// GRÁFICO PROFESIONAL: Barras Apiladas

var chartOptions = {

  title: 'Daño Sísmico: Clase de Pendiente (MapBiomas) vs. Cobertura',

  isStacked: true,

  hAxis: {title: 'Topografía del Terreno', titleTextStyle: {bold: true}},

  vAxis: {title: 'Hectáreas Afectadas', titleTextStyle: {bold: true}},

  colors: ['#006400', '#BDB76B', '#9ACD32', '#FFD700', '#FF0000', '#8A2BE2']

};



var chart = ui.Chart.feature.byFeature({

  features: fcEstadisticas, xProperty: 'Clase_Pendiente',

  // Las propiedades solicitadas coinciden perfectamente con el Feature.set()

  yProperties: ['Bosque', 'Arbustales', 'Sabana_Herbazal', 'Agropecuario', 'Urbano', 'Otras Zonas Antrópicas']

}).setChartType('ColumnChart').setOptions(chartOptions);



print('📊 MATRIZ DE VULNERABILIDAD:', chart);



// ==============================================================================

// 7. EXPORTACIÓN DEL CSV (FILAS x COLUMNAS) A GOOGLE DRIVE

// ==============================================================================

Export.table.toDrive({

  collection: fcEstadisticas,

  description: 'Matriz_Dano_Pendiente_vs_Cobertura_MapBiomas_Final',

  folder: 'Premio_MapBiomas_2026',

  fileFormat: 'CSV',

  selectors: ['Clase_Pendiente', 'Bosque', 'Arbustales', 'Sabana_Herbazal', 'Agropecuario', 'Urbano', 'Otras Zonas Antrópicas']

});



// ==============================================================================

// 8. VISUALIZACIÓN CARTOGRÁFICA

// ==============================================================================

Map.setOptions('SATELLITE');



var paletaPendiente = ['#E1F5FE', '#81D4FA', '#0288D1', '#01579B']; 

Map.addLayer(pendienteMapBiomas, {min: 1, max: 4, palette: paletaPendiente}, '1. Capa Base: Pendiente (ALOS)', false);



var danoCobertura = lulcRec.updateMask(huellaSismo);

Map.addLayer(danoCobertura.eq(1).selfMask(), {palette: ['#006400']}, '2. Daño: Bosques');

Map.addLayer(danoCobertura.eq(2).selfMask(), {palette: ['#BDB76B']}, '3. Daño: Arbustales');

Map.addLayer(danoCobertura.eq(3).selfMask(), {palette: ['#9ACD32']}, '4. Daño: Sabana / Herbazal');

Map.addLayer(danoCobertura.eq(4).selfMask(), {palette: ['#FFD700']}, '5. Daño: Agropecuario');

Map.addLayer(danoCobertura.eq(5).selfMask(), {palette: ['#FF0000']}, '6. Daño: Urbano');

Map.addLayer(danoCobertura.eq(6).selfMask(), {palette: ['#8A2BE2']}, '7. Daño: Otras Zonas Antrópicas');



// ==============================================================================

// 9. LEYENDAS Y CITA OBLIGATORIA (PROFESIONALIZADA)

// ==============================================================================

var legend = ui.Panel({ style: { position: 'bottom-left', padding: '12px 15px', backgroundColor: '#FFFFFF', width: '340px', border: '1px solid #cccccc' }});

legend.add(ui.Label('Análisis de Riesgo Espacial Cruzado', { fontWeight: 'bold', fontSize: '15px', margin: '0 0 8px 0' }));



function cItem(color, title) {

  var colorBox = ui.Label('', { backgroundColor: color, padding: '8px', margin: '0 0 4px 0', border: '1px solid black' });

  var description = ui.Label(title, {margin: '0 0 4px 8px', fontSize: '12px'});

  return ui.Panel({ widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal'), style: {margin: '0 0 4px 0'} });

}



// Sub-leyenda: Daño (Superficie)

legend.add(ui.Label('Daño Sísmico Detectado (Cobertura):', { fontSize: '12px', fontWeight: 'bold', margin: '10px 0 6px 0', color: '#444' }));

legend.add(cItem('#006400', 'Bosques (Deslizamientos)'));

legend.add(cItem('#BDB76B', 'Arbustales'));

legend.add(cItem('#9ACD32', 'Sabana / Herbazales'));

legend.add(cItem('#FFD700', 'Uso Agropecuario'));

legend.add(cItem('#FF0000', 'Uso Urbano (Infraestructura)'));

legend.add(cItem('#8A2BE2', 'Otras Zonas Antrópicas'));



// Sub-leyenda: Pendiente (Fondo)

legend.add(ui.Label('Topografía / Inclinación del Terreno:', { fontSize: '12px', fontWeight: 'bold', margin: '10px 0 6px 0', color: '#444' }));

legend.add(cItem(paletaPendiente[0], 'Pendiente Suave (0° - 10°)'));

legend.add(cItem(paletaPendiente[1], 'Pendiente Moderada (10° - 25°)'));

legend.add(cItem(paletaPendiente[2], 'Terreno Escarpado (25° - 45°)'));

legend.add(cItem(paletaPendiente[3], 'Relieve Abrupto / Crítico (> 45°)'));



Map.add(legend);



// 🛠️ CITA OBLIGATORIA DEL PREMIO AÑADIDA AL MAPA

var citationLabel = ui.Label({

  value: 'MapBiomas – Colección 3 de la Serie Anual de Mapas de Cobertura y Uso del Suelo de Venezuela, consultada en Julio 2026 a través de https://venezuela.mapbiomas.org',

  style: {position: 'bottom-right', fontSize: '10px', color: '#555555', backgroundColor: 'rgba(255, 255, 255, 0.8)'}

});

Map.add(citationLabel);



// ==============================================================================

// 10. EXPORTACIÓN DE LA CAPA RASTER CONTINUA (PENDIENTE ALOS) A GOOGLE DRIVE

// ==============================================================================



// 1. Definición de parámetros cartográficos y de resolución espacial

var EXPORT_PARAMS = {

  escala_proc: 30, // Resolución espacial nativa ALOS AW3D30 (30 metros)

  crs: 'EPSG:4326'  // Sistema de Referencia Espacial WGS84

};



// 2. Acondicionamiento de la banda continua de pendiente en grados (0° a 90°)

// Se fuerza a tipo Float32 para preservar los decimales de la pendiente topográfica

var pendienteContinuaExport = pendienteMapBiomas

  .toFloat()

  .rename('pendiente_grados');



// 3. Comando de exportación de la imagen GeoTIFF a Google Drive

Export.image.toDrive({

  image: pendienteContinuaExport,

  description: 'Pendiente_Continua_ALOS_AW3D30_LaGuaira',

  folder: 'Premio_MapBiomas_2026',

  fileNamePrefix: 'Pendiente_Continua_LaGuaira_30m',

  region: roi,

  scale: EXPORT_PARAMS.escala_proc,

  crs: EXPORT_PARAMS.crs,

  maxPixels: 1e9

});
