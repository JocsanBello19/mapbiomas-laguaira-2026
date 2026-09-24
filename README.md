# 🛰️ Análisis de Vulnerabilidad, Dinámica Histórica e Impacto Co-Sísmico en La Guaira (GEE Pipeline)

[![MapBiomas Venezuela](https://img.shields.io/badge/MapBiomas-Colecci%C3%B3n%203%20(1985--2024)-00a859.svg)](https://venezuela.mapbiomas.org)
[![Google Earth Engine](https://img.shields.io/badge/Google%20Earth%20Engine-API%20JavaScript-4285F4.svg)](https://earthengine.google.com/)
[![EPSG:32620](https://img.shields.io/badge/CRS-UTM%20Zone%2020N-orange.svg)](https://epsg.io/32620)

> **Cita Oficial de Datos Base:**  
> *"MapBiomas - Colección 3 de la Serie Anual de Mapas de Cobertura y Uso del Suelo de Venezuela, consultada el 24/08/2026 a través del enlace: https://venezuela.mapbiomas.org/"*.

---

## 📌 Resumen Ejecutivo y Marco Institucional

Este repositorio contiene todos los scripts y estadísticas de procesamiento geoespacial e hidro-geomorfológico desarrollada en **Google Earth Engine (GEE)** para la evaluación multicriterio de daños co-sísmicos, vulnerabilidad topográfica, riesgo hidro-geomórfico y trayectorias históricas de antropización en el Estado La Guaira, Venezuela.

El estudio integra la serie histórica multitemporal de **MapBiomas Venezuela Colección 3 (1985–2024)** a 30 m de resolución (basada en clasificadores *Random Forest* y mosaicos Landsat) como línea base ambiental previa al **doblete sísmico de junio de 2026**. Esta baseline se cruza con imágenes SAR de **Sentinel-1 (IW, polarización VH)** para mapear la alteración del terreno (remociones en masa y colapsos edilicios) bajo cobertura nubosa tropical.

---

## 🗺️ Contexto Cartográfico y Macroclases (Norte del Orinoco)

De acuerdo con el documento *Algorithm Theoretical Basis Document (ATBD)* de la Colección 3 de MapBiomas Venezuela, el territorio nacional se procesa dividiéndolo en dos macro-regiones principales (Norte y Sur del Orinoco).

┌───────────────────────────────────────────────────────────────────────────────┐
│                    MAPBIOMAS VENEZUELA - COLECCIÓN 3                          │
├──────────────────────────────────────┬────────────────────────────────────────┤
│       NORTE DEL ORINOCO (101)        │           SUR DEL ORINOCO (61)         │
│   • Incluye Estado La Guaira         │   • Amazonas, Bolívar, Delta Amacuro   │
│   • Leyenda Unificada Clase 21       │   • Desagregación agrícola/pasto       │
│   • Procesado por LSIGMA-USB/Provita │   • Procesado por Provita/Wataniba     │
└──────────────────────────────────────┴────────────────────────────────────────┘

> ⚠️ **Nota Metodológica Clave (Leyenda Nivel 2):**  
> Al norte del Orinoco (incluyendo La Guaira), debido a patrones de heterogeneidad espacial y resolución de Landsat (30 m), las actividades agrícolas y pecuarias se unifican bajo la clase **`Uso agropecuario/Tierras en descanso` (Código 21)**. Para los análisis de antropización del litoral costero central se consideran formalmente las clases **Uso Urbano (Código 24)** y **Otras Áreas Antrópicas Sin Vegetación (Código 25)**.

---

## 🛠️ Arquitectura del Pipeline y Scripts de Procesamiento

El flujo de trabajo modular en GEE se estructura en cuatro bloques temáticos estratégicos:

┌─────────────────────────────────────────────────────────────────────────┐
│                      PIPELINE DE PROCESAMIENTO GEE                      │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│    BLOQUE 1     │    BLOQUE 2     │    BLOQUE 3     │     BLOQUE 4     │
│  Detección SAR  │ Disociación LULC│ Vulnerabilidad  │   Trayectorias   │
│   Co-Sísmica    │   y Cobertura   │ Topo-Hidrológica│   Históricas     │
│  (Sentinel-1)   │ (MapBiomas C3)  │  (SRTM / HAND)  │   (1985–2024)    │
└─────────────────┴─────────────────┴─────────────────┴──────────────────┘


---

### 📜 Descripción Detallada de Módulos y Scripts

#### 1. Detección y Caracterización SAR Co-Sísmica

* **`src/01_procesamiento_sentinel1_damage_laguaira.js`**
  * **Objetivo:** Detección primaria de alteraciones de la superficie terrestre (deslizamientos de ladera, flujos de detritos y colapsos estructurales) tras el evento sísmico de junio de 2026.
  * **Metodología:** Filtra la colección `COPERNICUS/S1_GRD` (modo IW, polarización VH) en periodos pre-sismo (`2026-06-01` a `2026-06-23`) y post-sismo (`2026-06-24` a `2026-07-05`). Calcula la diferencia logarítmica de retrodispersión ($\Delta \sigma^0$) y aplica un umbral binario estricto:
    $$\Delta \sigma^0 = 10 \cdot \log_{10}(\sigma^0_{\text{post}}) - 10 \cdot \log_{10}(\sigma^0_{\text{pre}}) <= -3.0\text{ dB}$$
  * **Salida:** Despliegue dinámico en el Dashboard de GEE y exportación asíncrona GeoTIFF a Google Drive en proyección UTM Zona 20N (`EPSG:32620`).
  * **Enlace directo a GEE Code Editor:** [Abrir Script 01 en Google Earth Engine](https://code.earthengine.google.com/d708458a1b75699f53b9b2a7a4474175)

* **`src/02_procesamiento_sentinel1_damage_laguaira_multiclass.js`**
  * **Objetivo:** Clasificación jerárquica de severidad de daños mediante árboles de decisión sobre la firma radiométrica SAR.
  * **Niveles de Severidad:**
    * **Nivel 1 (Leve / Alteración):** $-1.5\text{ dB} \ge \Delta \sigma^0 > -2.0\text{ dB}$ *(Pérdida parcial de vegetación / variación de humedad)*.
    * **Nivel 2 (Daño Severo):** $-2.0\text{ dB} \ge \Delta \sigma^0 > -3.0\text{ dB}$ *(Flujos de detritos y remociones en masa intermedias)*.
    * **Nivel 3 (Catastrófico):** $\Delta \sigma^0 <= -3.0\text{ dB}$ *(Deslizamientos profundos y colapso de infraestructura)*.
  * **Salida:** Mapa ráster multiclase clasificado (`.tif`) exportado a Google Drive.
  * **Enlace directo a GEE Code Editor:** [Abrir Script 02 en Google Earth Engine](https://code.earthengine.google.com/d1a5fc6e013218ea2f94f6ac5b6501c3)
---

#### 2. Sectorización y Discriminación de Cobertura

* **`src/03_analisis_vulnerabilidad_Urbana_Terreno_LaGuaira.js`**
  * **Objetivo:** Disociación matricial de la huella sísmica entre zonas de infraestructura urbana edificada y terrenos naturales.
  * **Metodología:** Cruza el ráster de anomalía SAR ($\Delta \sigma^0 < -3.0\text{ dB}$) con las clases urbanas y construidas de MapBiomas Colección 3 (Clases `24` - Uso Urbano y `25` - Otras Áreas Antrópicas Sin Vegetación), aislándolas de coberturas forestales y agropecuarias o cuerpos de agua (Clases `26` y `33`).
  * **Enlace directo a GEE Code Editor:** [Abrir Script 03 en Google Earth Engine](https://code.earthengine.google.com/ba0cb0fc2738192c21f7e6c5d365e236)

* **`src/06_evaluacion_integral_danos_LaGuaira.js`**
  * **Objetivo:** Cuantificación multitemática automatizada de la superficie afectada por el sismo según la tipología de cobertura de la Colección 3.
  * **Agrupación LULC Reclasificada (MapBiomas Col. 3):**
    1. **Formaciones Boscosas:** Clases 3 (Bosque), 4 (Sabana Arbolada), 5 (Manglar), 6 (Bosque Inundable).
    2. **Arbustales y Vegetación Xerófila:** Clases 66 (Arbustal), 50 (Herbazal/Arbustal Xerófilo), 11 (Herbazal/Arbustal Inundable).
    3. **Sabana / Herbazales:** Clase 12 (Sabana/Herbazal).
    4. **Uso Agropecuario:** Clase 21 (Uso Agropecuario/Tierras en descanso).
    5. **Uso Urbano:** Clase 24 (Infraestructura y tejido urbano).
    6. **Otras Zonas Antrópicas:** Clases 22, 23, 25, 30.
  * **Salida:** Generación de gráficos comparativos (`ui.Chart`) y exportación de tablas tabuladas en `.csv`.
  * **Enlace directo a GEE Code Editor:** [Abrir Script 06 en Google Earth Engine](https://code.earthengine.google.com/d82814e419ada8397a69cab3c35b1d71)

---

#### 3. Vulnerabilidad Topográfica e Hidro-Geomórfica

* **`src/05_vulnerabilidad_topografica_LaGuaira.js`**
  * **Objetivo:** Evaluación del gradiente altitudinal y topográfico del impacto en infraestructuras combinando datos SAR y el modelo digital de elevación SRTM (30m).
  * **Rangos de Pendiente:**
    * *Plano / Suave:* $0^\circ - 15^\circ$
    * *Moderado:* $15^\circ - 30^\circ$
    * *Crítico / Escarpado:* $> 30^\circ$
  * **Enlace directo a GEE Code Editor:** [Abrir Script 05 en Google Earth Engine](https://code.earthengine.google.com/0d198b2af2293d8353ffb301e76494af)

* **`src/07_evaluacion_matriz_pendiente_cobertura_LaGuaira.js`**
  * **Objetivo:** Evaluación cruzada multivariada ($4\text{ clases de pendiente ALOS AW3D30} \times 6\text{ subcategorías LULC MapBiomas}$).
  * **Clasificación del Terreno (ALOS):** $0^\circ-10^\circ$ (Suave), $10^\circ-25^\circ$ (Moderada), $25^\circ-45^\circ$ (Escarpada), $>45^\circ$ (Abrupta / Acantilados de la Cordillera de la Costa).
  * **Salida:** Matriz de hectáreas afectadas desplegada mediante gráficos de columnas apiladas y reportes CSV.
  * **Enlace directo a GEE Code Editor:** [Abrir Script 07 en Google Earth Engine](https://code.earthengine.google.com/ae7200ae499f93ecaa9e8c8a1bce3346)

* **`src/08_evaluacion_sismica_urban_HAND_LaGuaira.js`**
  * **Objetivo:** Modelado de susceptibilidad hidro-geomórfica y potencial licuefacción sísmica en el frente urbano costero utilizando el modelo *Height Above the Nearest Drainage* (HAND, 30m).
  * **Estratificación del Riesgo Hidrológico:**
    * **Riesgo Crítico (Saturación / Licuefacción):** $0 - 3\text{ m}$
    * **Riesgo Moderado (Llanuras aluviales / Ventanas de inundación):** $3 - 6\text{ m}$
    * **Riesgo Bajo (Terrazas consolidadas):** $> 6\text{ m}$
    * **Enlace directo a GEE Code Editor:** [Abrir Script 08 en Google Earth Engine](https://code.earthengine.google.com/d0109a83d4a8be7648626830b33f3463)

---

#### 4. División Parroquial, Trayectorias Históricas y Dinámicas de Antropización (1985–2024)

* **`src/04_analisis_vulnerabilidad_Parroquial_LaGuaira.js`**
  * **Objetivo:** Cuantificación y cruce espacial de alta resolución entre el daño estructural co-sísmico inmediato (detectado mediante anomalías SAR Sentinel-1) y las áreas de infraestructura urbana e intervención antrópica previamente consolidadas, desagregando los resultados a escala político-territorial por parroquia en el Estado La Guaira.
  * **Componentes Metodológicos y Fuentes de Datos:**
    * **Detección de Anomalías SAR:** Estimación de la diferencia logarítmica del coeficiente de retrodispersión ($\Delta \sigma^0 < -3.0\text{ dB}$) en polarización VH a partir de imágenes Sentinel-1 IW GRD entre las ventanas pre-sismo (15/05/2026 – 23/06/2026) y post-sismo (24/06/2026 – 06/07/2026).
    * **Máscara Urbana e Infraestructura Base:** Aislamiento de la huella construida previa al sismo mediante la combinación de las clases 24 (Uso urbano) y 25 (Otras áreas antrópicas sin vegetación) de la Colección 3 de MapBiomas Venezuela (año 2024).
    * **Límite Político-Territorial Oficial:** Cuantificación zonal en hectáreas (ha) por polígono parroquial integrando el asset vectorial oficial del Instituto Nacional de Tierras (INTI) para las 11 parroquias del Estado La Guaira.
    * **Salidas Geoespaciales e Interfaz:** Generación automática de gráficos estadísticos zonales, exportación de tablas (CSV), capas ráster codificadas a 10 m de resolución en EPSG:4326 (GeoTIFF) y archivos vectoriales (SHP) listos para interoperabilidad en ArcMap/ArcGIS.
  * **Enlace directo a GEE Code Editor:** [Abrir Script 04 en Google Earth Engine](https://code.earthengine.google.com/e7e9f466e06cd2ba796b8f4f9a07943e)

* **`src/09_evaluacion_sismica_periodos_urbanizacion_LaGuaira.js`**
  * **Objetivo:** Análisis cruzado entre la severidad del daño co-sísmico y la época de primera intervención antrópica detectada a lo largo de los 40 años de la serie MapBiomas (1985–2024).
  * **Desagregación Temporal:**
    * **Período 1 (Pre-1985):** Cascos históricos y consolidación urbana inicial.
    * **Períodos 2 a 4 (1986–2000):** Crecimiento acelerado previo a la Tragedia de Vargas (1999).
    * **Período 5 (2001–2005):** Obras de reconstrucción post-desastre y canalizaciones.
    * **Períodos 6 a 9 (2006–2024):** Ocupación reciente e inestable en vertientes no aptas.
    * **Enlace directo a GEE Code Editor:** [Abrir Script 09 en Google Earth Engine](https://code.earthengine.google.com/8cd2ebbbc4dfa27d807637ba2d07e126)

* **`src/10_analisis_trayectorias_antropizacion_SAR_LaGuaira.js`**
  * **Objetivo:** Reconstrucción espacio-temporal pixel a pixel (1985–2005–2014–2024) para identificar trayectorias de degradación y ocupación inestable.
  * **Matriz de Trayectorias (T1–T5):**
    * **T1 (Antropización Crítica):** Conversión directa de ecosistema natural a uso antrópico en el periodo 2005–2024.
    * **T2 (Degradación de Laderas):** Transición de bosque denso a arbustal/suelo desnudo.
    * **T3 (Núcleo Urbano Consolidado):** Infraestructura estable registrada de forma continua durante $>40$ años.
    * **T4 (Expansión Urbana Reciente):** Ocupación inestable en vertientes escarpadas post-2014.
    * **T5 (Ocupación Post-Tragedia):** Consolidación urbana realizada en la ventana 1985–2005.
    * **Enlace directo a GEE Code Editor:** [Abrir Script 10 en Google Earth Engine](https://code.earthengine.google.com/61cce6c24d91d160fdc396da7e872d38)
---

## 💻 Requisitos e Instalación

1. **Cuenta en Google Earth Engine:** Se requiere acceso activo a la plataforma [Google Earth Engine](https://earthengine.google.com/).
2. **Ejecución de Código:** Copie el código fuente de cualquier módulo ubicado en la carpeta `src/` e impleméntelo en el **Code Editor** de GEE (`code.earthengine.google.com`).
3. **Gestión de Assets y Exportación:** Las salidas en formato GeoTIFF y las tablas tabuladas CSV se procesarán de forma asíncrona en la pestaña **Tasks** de GEE para su sincronización directa con Google Drive.

---

## 🏛️ Créditos y Referencias

* **Apoyo en el Desarrollo Geoespacial:** Laboratorio de Sistemas de Información Geográfica y Modelado Ambiental (LSIGMA-USB), Universidad Simón Bolívar.
* **Fuente de Datos:** MapBiomas Venezuela — Colección 3 (1985–2024).
* **Repositorio Oficial y Visor:** [https://venezuela.mapbiomas.org](https://venezuela.mapbiomas.org)
