/**
 * @name 03_analisis_vulnerabilidad_Urbana_Terreno_LaGuaira
 * @project Premio MapBiomas Venezuela 2026 - Categoría Pregrado (LSIGMA-USB)
 * @description Cruce espacial: Anomalías SAR Sentinel-1 vs Cobertura (MapBiomas Colección 3).
 * @institution Laboratorio LSIGMA-USB
 * @authors Jocsan Bello - LSIGMA-USB
 * Aisla daño urbano (colapsos) de daño en terreno (deslizamientos).
 * Incluye módulo de exportación CSV, gráficos UI y evaluación de infraestructura aeroportuaria.
 * @region Estado La Guaira (Vargas), Venezuela
 */

// ==============================================================================
// 1. PARÁMETROS BASE Y ÁREA DE ESTUDIO
// ==============================================================================
var PARAMS = {
  inicio_pre: '2026-05-15', fin_pre: '2026-06-23',
  inicio_post: '2026-06-24', fin_post: '2026-07-06',
  polarizacion: 'VH', umbral_db: -3, escala: 10
};

// Polígono del Estado La Guaira (Vargas)
var roi = ee.FeatureCollection("FAO/GAUL/2015/level1")
  .filter(ee.Filter.eq('ADM1_NAME', 'Vargas'));
Map.centerObject(roi, 12);

// ==============================================================================
// 2. DETECCIÓN DE ANOMALÍAS SAR (Daños por el sismo doblete 24-Jun-2026)
// ==============================================================================
var s1 = ee.ImageCollection("COPERNICUS/S1_GRD")
  .filterBounds(roi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', PARAMS.polarizacion))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .select(PARAMS.polarizacion);

// Construcción de mosaicos medianos pre y post sismo
var preSismo = s1.filterDate(PARAMS.inicio_pre, PARAMS.fin_pre).median().clip(roi);
var postSismo = s1.filterDate(PARAMS.inicio_post, PARAMS.fin_post).median().clip(roi);

// Cálculo de diferencia logarítmica (Δσ°) y umbralización
var areasAfectadas = postSismo.subtract(preSismo).lt(PARAMS.umbral_db).selfMask();

// ==============================================================================
// 3. AISLAMIENTO MULTI-CLASE (MAPBIOMAS VENEZUELA COL 3)
// ==============================================================================
// Cargamos la capa base histórica estabilizada de MapBiomas (Colección 3, 2024)
var landcover = ee.Image("projects/mapbiomas-public/assets/venezuela/lulc/collection3/mapbiomas_venezuela_collection3_coverage_v1")
  .select('classification_2024').clip(roi);

// Máscara 1: Uso Urbano y Antrópico (Clases 24 y 25)
var maskUrbana = landcover.eq(24).or(landcover.eq(25));
var areasUrbanas = landcover.updateMask(maskUrbana);

// Máscara 2: Ecosistemas y Terreno Natural (Todo lo que NO es 24 ni 25 ni agua)
// Se excluye agua (Clase 33 y 26) para no registrar falsos deslizamientos en el mar
var maskNatural = landcover.neq(24).and(landcover.neq(25)).and(landcover.neq(33)).and(landcover.neq(26));
var areasNaturales = landcover.updateMask(maskNatural);

// ==============================================================================
// 4. CRUCE ESPACIAL: AISLAMIENTO DE DAÑOS
// ==============================================================================
// NOTA: Se ha removido la máscara de exclusión del Aeropuerto para contabilizar
// daños estructurales en terminales y alteraciones en pista (aeronaves afectadas).

// 4.1 Daño Urbano (Colapsos estructurales, incluyendo Aeropuerto)
var danoUrbanoNeto = areasAfectadas.updateMask(maskUrbana);

// 4.2 Daño en Terreno (Deslizamientos en laderas y microcuencas)
var danoTerrenoNeto = areasAfectadas.updateMask(maskNatural);

// ==============================================================================
// 5. CÁLCULO ESTADÍSTICO EXACTO
// ==============================================================================
// Área por píxel en hectáreas
var pixelAreaHa = ee.Image.pixelArea().divide(10000);

// Reducción para calcular la suma de hectáreas afectadas
var stat_dano_urbano = danoUrbanoNeto.multiply(pixelAreaHa).reduceRegion({
  reducer: ee.Reducer.sum(), geometry: roi.geometry(), scale: PARAMS.escala, maxPixels: 1e13
});

var stat_dano_terreno = danoTerrenoNeto.multiply(pixelAreaHa).reduceRegion({
  reducer: ee.Reducer.sum(), geometry: roi.geometry(), scale: PARAMS.escala, maxPixels: 1e13
});

// Extracción de valores numéricos dinámicos
var ha_urbanas = ee.Number(stat_dano_urbano.get(PARAMS.polarizacion));
var ha_terreno = ee.Number(stat_dano_terreno.get(PARAMS.polarizacion));

// Impresión en Consola con el formato exacto requerido
print('🚨 HECTÁREAS DE INFRAESTRUCTURA AFECTADA EN LA GUAIRA (Aeropuerto Incluido):', ha_urbanas);
print('⛰️ HECTÁREAS DE DESLIZAMIENTOS EN TERRENO NATURAL Y AGROPECUARIO:', ha_terreno);

// ==============================================================================
// 6. GENERACIÓN DE DIAGRAMA (UI CHART) EN CONSOLA
// ==============================================================================
// Creamos una FeatureCollection artificial para alimentar el gráfico
var statsFeature = ee.FeatureCollection([
  ee.Feature(null, {'Categoría': 'Daño Urbano (Colapso)', 'Hectáreas': ha_urbanas}),
  ee.Feature(null, {'Categoría': 'Daño Natural y Agropecuario (Deslizamiento y Degradación del Entorno Agropecuario)', 'Hectáreas': ha_terreno})
]);

var chartDamage = ui.Chart.feature.byFeature({
  features: statsFeature, xProperty: 'Categoría', yProperties: ['Hectáreas']
}).setChartType('ColumnChart').setOptions({
  title: 'Distribución del Daño Co-Sísmico en La Guaira (Junio 2026)',
  hAxis: {title: 'Tipo de Cobertura (MapBiomas Col. 3)', titleTextStyle: {italic: false, bold: true}},
  vAxis: {title: 'Superficie Afectada (ha)', titleTextStyle: {italic: false, bold: true}},
  colors: ['#FF0000', '#FFA500'],
  legend: {position: 'none'}
});
print(chartDamage);

// ==============================================================================
// 7. EXPORTACIÓN A CSV (DRIVE)
// ==============================================================================
Export.table.toDrive({
  collection: statsFeature,
  description: 'Estadisticas_Dano_Cosismico_LaGuaira_2026',
  folder: 'Premio_MapBiomas_2026',
  fileFormat: 'CSV',
  selectors: ['Categoría', 'Hectáreas']
});

// ==============================================================================
// 8. VISUALIZACIÓN CARTOGRÁFICA Y LEYENDA UI
// ==============================================================================
Map.setOptions('SATELLITE');
Map.addLayer(areasUrbanas, {palette: ['#FFD700']}, '1. Áreas Urbanas Base (MapBiomas)', false);
Map.addLayer(areasNaturales, {palette: ['#1f8d49']}, '2. Áreas Naturales Base (MapBiomas)', false);
Map.addLayer(danoTerrenoNeto, {palette: ['#FFA500']}, '3. DAÑO NATURAL Y AGROPECUARIO (Deslizamientos y Degradación del Entorno Agropecuario)');
Map.addLayer(danoUrbanoNeto, {palette: ['#FF0000']}, '4. DAÑO URBANO CONFIRMADO (Colapsos e Infraestructura)');

var legend = ui.Panel({
  style: { position: 'bottom-left', padding: '12px', backgroundColor: '#FFFFFF', border: '1px solid #cccccc' }
});
legend.add(ui.Label('Vulnerabilidad Post-Sismo (M7.5)', {fontWeight: 'bold', fontSize: '15px'}));
legend.add(ui.Label('Cruce SAR vs MapBiomas Col. 3', {fontSize: '11px', color: '#666666'}));

function addColor(title, color) {
  legend.add(ui.Panel({
    widgets: [
      ui.Label('', {backgroundColor: color, padding: '8px', margin: '0 8px 4px 0', border: '1px solid black'}),
      ui.Label(title, {fontSize: '12px'})
    ], layout: ui.Panel.Layout.Flow('horizontal')
  }));
}

addColor('Área Urbana (Uso Urbano y Otras Áreas Antrópicas)', '#FFD700');
addColor('Área Natural (Bosques/Herbazales, Sabanas y Arbustales/Agropecuario)', '#1f8d49');
addColor('Deslizamientos en Terreno Natural y Agropecuario', '#FFA500');
addColor('Colapso de Infraestructura', '#FF0000');
Map.add(legend);

// ==============================================================================
// 9. EXPORTACIÓN ROBUSTA Y MULTI-CAPA A GOOGLE DRIVE (PARA ARCMAP / QGIS)
// ==============================================================================

// Definición formal del sistema de proyección de trabajo para La Guaira (UTM 20N)
var CRS_PROYECTO = 'EPSG:32620';

// ------------------------------------------------------------------------------
// 9.1 INTEGRACIÓN EN CAPA CATEGÓRICA UNIFICADA (RÁSTER DE ANÁLISIS ESPACIAL)
// Asigna códigos enteros según la jerarquía del mapa para geoprocesamiento en ArcMap:
// Código 1: Áreas Naturales Base | Código 2: Áreas Urbanas Base
// Código 3: Deslizamientos en Terreno Natural/Agropecuario | Código 4: Colapso Urbano
// ------------------------------------------------------------------------------
var mapaCategoricoDano = ee.Image(0)
  .where(areasNaturales, 1)
  .where(areasUrbanas, 2)
  .where(danoTerrenoNeto, 3)
  .where(danoUrbanoNeto, 4)
  .selfMask()
  .rename('clase_dano_cosismico');

// Exportación del Ráster Categórico (10m, UTM 20N)
Export.image.toDrive({
  image: mapaCategoricoDano,
  description: 'Mapa_Categorico_Dano_CoSismico_LaGuaira_10m',
  folder: 'Premio_MapBiomas_2026',
  scale: PARAMS.escala,
  region: roi.geometry(),
  maxPixels: 1e10,
  crs: CRS_PROYECTO
});

// ------------------------------------------------------------------------------
// 9.2 GENERACIÓN Y EXPORTACIÓN DEL RÁSTER VISUAL RGB (PRESENTACIÓN CARTOGRÁFICA)
// Exporta la composición de 3 bandas en formato Byte con la paleta de colores oficial.
// ------------------------------------------------------------------------------
var mapaVisualRGB = mapaCategoricoDano.visualize({
  min: 1,
  max: 4,
  palette: ['#1f8d49', '#FFD700', '#FFA500', '#FF0000']
});

// Exportación del Ráster RGB (10m, UTM 20N)
Export.image.toDrive({
  image: mapaVisualRGB,
  description: 'Mapa_Visual_RGB_Dano_CoSismico_LaGuaira_10m',
  folder: 'Premio_MapBiomas_2026',
  scale: PARAMS.escala,
  region: roi.geometry(),
  maxPixels: 1e10,
  crs: CRS_PROYECTO
});
