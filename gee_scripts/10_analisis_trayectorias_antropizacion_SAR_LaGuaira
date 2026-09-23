/**
 * @name 10_analisis_trayectorias_antropizacion_SAR_LaGuaira
 * @project Premio MapBiomas Venezuela 2026 - Categoría Estudiante de Pregrado
 * @description Reconstrucción histórica pixel-a-pixel (1985-2005-2014-2024) del Estado La Guaira.
 * CAMBIOS APLICADOS: Optimización científica de descripciones de categorías y título de visualización,
 * estandarizado en consola, leyenda interactiva y metadatos de exportación CSV.
 * @institution LSIGMA-USB
 * @authors Jocsan Bello - LSIGMA-USB
 * @region Estado La Guaira (Vargas), Venezuela
 */

// ==============================================================================
// 1. PARÁMETROS BASE Y ÁREA DE ESTUDIO
// ==============================================================================
var PARAMS = {
  inicio_pre: '2026-05-15',  
  fin_pre: '2026-06-23',
  inicio_post: '2026-06-24',  
  fin_post: '2026-07-06',
  polarizacion: 'VH',
  umbral_db: -3.0, 
  escala_proc: 10,
  tituloEstudio: 'Análisis Co-Sísmico La Guaira 2026: Pérdida de Coherencia SAR por Trayectorias Históricas de Cobertura (1985-2024)',
  citaOficial: 'MapBiomas – Colección 3 de la Serie Anual de Mapas de Cobertura y Uso del Suelo de Venezuela, consultada en 31 de julio de 2026 a través de https://venezuela.mapbiomas.org'
};

var roi = ee.FeatureCollection("FAO/GAUL/2015/level1")
  .filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));
Map.centerObject(roi, 11);

// ==============================================================================
// 2. DETECCIÓN DE ANOMALÍAS SAR (HUELLA SÍSMICA INTEGRAL)
// ==============================================================================
var s1 = ee.ImageCollection("COPERNICUS/S1_GRD")
  .filterBounds(roi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .select(PARAMS.polarizacion);

var pre = s1.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre).median().clip(roi);
var post = s1.filterDate(PARAMS.inicio_post, PARAMS.fin_post).median().clip(roi);
var huellaSismo = post.subtract(pre).lt(PARAMS.umbral_db).selfMask();

// ==============================================================================
// 3. EXTRACCIÓN DE HITOS TEMPORALES (MAPBIOMAS COL. 3) Y MÁSCARAS LÓGICAS
// ==============================================================================
var lulcAsset = ee.Image("projects/mapbiomas-public/assets/venezuela/lulc/collection3/mapbiomas_venezuela_collection3_coverage_v1").clip(roi);

var c1985 = lulcAsset.select('classification_1985');
var c2005 = lulcAsset.select('classification_2005');
var c2014 = lulcAsset.select('classification_2014');
var c2024 = lulcAsset.select('classification_2024');

function getAntropico(img) {
  return img.eq(21).or(img.eq(24)).or(img.eq(25)); 
}

function getNatural(img) {
  return img.eq(3).or(img.eq(50)).or(img.eq(66)).or(img.eq(5)).or(img.eq(12));
}

var a1985 = getAntropico(c1985);
var a2005 = getAntropico(c2005);
var a2014 = getAntropico(c2014);
var a2024 = getAntropico(c2024);

var n1985 = getNatural(c1985);
var n2005 = getNatural(c2005);

// ==============================================================================
// 4. LÓGICA BOOLEANA DE TRAYECTORIAS LULC OPTIMIZADA
// ==============================================================================
var cond1 = n1985.eq(1).and(n2005.eq(1)).and(a2024.eq(1));
var cond2 = c1985.eq(3).and(c2005.eq(21).or(c2005.eq(66))).and(c2024.eq(24).or(c2024.eq(25)));
cond1 = cond1.and(cond2.not());
var cond3 = a1985.eq(1).and(a2005.eq(1)).and(a2024.eq(1));
var cond5 = n1985.eq(1).and(a2005.eq(1)).and(a2024.eq(1));
var cond4 = a2014.eq(0).and(a2024.eq(1))
  .and(cond1.not())
  .and(cond2.not())
  .and(cond3.not())
  .and(cond5.not());

var trayectoriaVulnerabilidad = ee.Image(0)
  .where(cond1, 1)
  .where(cond2, 2)
  .where(cond3, 3)
  .where(cond4, 4)
  .where(cond5, 5)
  .selfMask()
  .updateMask(huellaSismo) 
  .rename('Trayectoria_Dano');

// ==============================================================================
// 5. EXTRACCIÓN ESTADÍSTICA PROPORCIONAL CON NUEVAS DESCRIPCIONES CIENTÍFICAS
// ==============================================================================
var areaHa = ee.Image.pixelArea().divide(10000).rename('Hectareas');
var stats = areaHa.addBands(trayectoriaVulnerabilidad).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'clase'}),
  geometry: roi.geometry(),
  scale: PARAMS.escala_proc,
  maxPixels: 1e9
});

// MEJORA REQUERIDA 1 & 2: Descripciones explícitas y entendibles para el CSV y gráficos
var nombresTrayectorias = ee.List([
  'Sin Afectación Detectada', 
  'T1. Antropización Crítica (Conversión Natural a Antrópica Ocurrida entre 2005 y 2024)', 
  'T2. Laderas en Degradación Progresiva (Pérdida de Densidad de Dosel y Transición a Suelo Desnudo/Urbano)', 
  'T3. Núcleo Urbano Consolidado Histórico (Infraestructura Estable de Alta Densidad con más de 40 años)',
  'T4. Frentes de Expansión Urbana Reciente (Ocupación Inestable en Zonas de Ladera Post-2014)',
  'T5. Ocupación Urbana Post-Tragedia (Consolidación de Infraestructura Media entre 1985 y 2005)'
]);

var statsFC = ee.FeatureCollection(
  ee.List(stats.get('groups')).map(function(grupo) {
    var d = ee.Dictionary(grupo);
    var idClase = ee.Number(d.get('clase'));
    return ee.Feature(null, {
      'ID_Trayectoria': idClase, 
      'Dinamica_Historica_LULC': nombresTrayectorias.get(idClase),
      'Hectareas_Afectadas_SAR': ee.Number(d.get('sum')).round(),
      'Estudio_Fuente': PARAMS.tituloEstudio,
      'Cita_Fuente': PARAMS.citaOficial
    });
  })
).filter(ee.Filter.gt('ID_Trayectoria', 0)).sort('ID_Trayectoria');

print('📊 ' + PARAMS.tituloEstudio, statsFC);

// Visualización de Gráfico de Columnas Actualizado
var chart = ui.Chart.feature.byFeature(statsFC, 'Dinamica_Historica_LULC', 'Hectareas_Afectadas_SAR')
  .setChartType('ColumnChart')
  .setOptions({
    title: PARAMS.tituloEstudio,
    hAxis: {title: 'Trayectorias Históricas de Ocupación Territorial'},
    vAxis: {title: 'Superficie de Pérdida de Coherencia Estructural (Ha)'},
    colors: ['#D4271E'],
    legend: {position: 'none'}
  });
print(chart);

// ==============================================================================
// 6. VISUALIZACIÓN ESPACIAL AJUSTADA CON PALETA DE ALTO CONTRASTE
// ==============================================================================
var paletaContraste = [
  '#E600A9', // T1 -> Magenta Eléctrico
  '#FF7F00', // T2 -> Naranja Brillante
  '#4D4D4D', // T3 -> Gris Antracita Duro
  '#FFFF00', // T4 -> Amarillo Ne Neon
  '#984EA3'  // T5 -> Púrpura Imperial
];

Map.addLayer(c2024.randomVisualizer(), {}, 'Cobertura MapBiomas 2024 (Contexto)', false);
Map.addLayer(huellaSismo, {palette: ['#00FFFF'], opacity: 0.6}, 'Huella de Daño Co-Sísmico Bruta (SAR)', true);
Map.addLayer(trayectoriaVulnerabilidad, {min: 1, max: 5, palette: paletaContraste}, 'Trayectorias Críticas de Vulnerabilidad (Intersección SAR)');

// ==============================================================================
// 7. INTERFAZ GRÁFICA DE USUARIO (GUI) MEJORADA CON NUEVO TÍTULO Y DESCRIPCIONES
// ==============================================================================
var legendPanel = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '12px 15px',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    border: '2px solid #1A1A1A',
    width: '450px'
  }
});

// MEJORA REQUERIDA: Título de Leyenda adaptado al Paradigma Predictivo
var legendTitle = ui.Label({
  value: 'Leyenda - La Guaira Post-Sismo 2026',
  style: {fontWeight: 'bold', fontSize: '13px', margin: '0 0 2px 0', color: '#1A1A1A'}
});
var legendSubTitle = ui.Label({
  value: PARAMS.tituloEstudio,
  style: {fontSize: '11px', margin: '0 0 10px 0', color: '#555555', fontStyle: 'italic'}
});
legendPanel.add(legendTitle).add(legendSubTitle);

var makeRow = function(color, name) {
  var colorBox = ui.Label({style: {backgroundColor: color, padding: '9px', margin: '0 10px 6px 0', border: '1px solid #000'}});
  var description = ui.Label({value: name, style: {margin: '2px 0 0 0', fontSize: '11px', fontWeight: '500'}});
  return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
};

legendPanel.add(ui.Label({value: 'Clasificación de Daño Geomórfico y Estructural:', style: {fontWeight: 'bold', fontSize: '11px', color: '#222', margin: '4px 0'}}));
legendPanel.add(makeRow('#E600A9', 'T1. Antropización Crítica (Conversión Natural a Antrópica 2005-2024)'));
legendPanel.add(makeRow('#FF7F00', 'T2. Laderas en Degradación Progresiva (Pérdida de Dosel a Urbano)'));
legendPanel.add(makeRow('#4D4D4D', 'T3. Núcleo Urbano Consolidado Histórico (Estabilidad Antrópica >40 años)'));
legendPanel.add(makeRow('#FFFF00', 'T4. Frentes de Expansión Urbana Reciente (Ocupación Inestable Post-2014)'));
legendPanel.add(makeRow('#984EA3', 'T5. Ocupación Urbana Post-Tragedia (Consolidación Media 1985-2005)'));
legendPanel.add(makeRow('#00FFFF', 'Huella Sísmica Bruta por Pérdida de Coherencia (Sentinel-1 SAR)'));

var separator = ui.Label({value: '_________________________________________________', style: {margin: '6px 0', color: '#CCCCCC', fontSize: '10px'}});
var citationLabel = ui.Label({value: PARAMS.citaOficial, style: {fontSize: '8.5px', color: '#333333', textAlign: 'justify', fontStyle: 'italic'}});
legendPanel.add(separator).add(citationLabel);
Map.add(legendPanel);

// ==============================================================================
// 8. PIPELINE DE EXPORTACIÓN AUTOMATIZADO Y OPTIMIZADO PARA ARCMAP / DRIVE
// ==============================================================================

// Preparación del Ráster de Trayectorias (uint8) para compatibilidad nativa en GIS de escritorio
var rasterParaArcMap = trayectoriaVulnerabilidad
  .unmask(0) // Asigna 0 a áreas sin afectación o fuera de la huella para conservar la matriz espacial
  .uint8()   // Formato de entero de 8 bits (0-255) requerido por ArcMap para generar Tabla de Atributos (RAT)
  .set({
    'Estudio': PARAMS.tituloEstudio,
    'Cita_Oficial': PARAMS.citaOficial,
    'Institucion': 'LSIGMA-USB',
    'Proyecto': 'Premio MapBiomas Venezuela 2026'
  });

// Exportación del Ráster Clasificado GeoTIFF (5 Clases de Trayectorias + 0 Fondo)
Export.image.toDrive({
  image: rasterParaArcMap,
  description: 'Raster_Trayectorias_LaGuaira_ArcMap_2026',
  folder: 'Premio_MapBiomas_2026_LaGuaira',
  fileNamePrefix: 'MapBiomas_LaGuaira_Trayectorias_SAR_2026_UTM20N',
  scale: PARAMS.escala_proc, // 10 m (Resolución espacial nativa de Sentinel-1)
  region: roi.geometry(),
  crs: 'EPSG:32620',         // UTM Zona 20N (WGS 84) - Requerido para análisis de áreas y distancias en ArcMap
  maxPixels: 1e13,
  formatOptions: {
    cloudOptimized: true
  }
});

// Exportación Tabular Complementaria (CSV)
Export.table.toDrive({
  collection: statsFC,
  description: 'Estadisticas_Trayectorias_LaGuaira_CSV_2026',
  folder: 'Premio_MapBiomas_2026_LaGuaira',
  fileNamePrefix: 'Estadisticas_Trayectorias_MapBiomas_LaGuaira_2026',
  fileFormat: 'CSV'
});
