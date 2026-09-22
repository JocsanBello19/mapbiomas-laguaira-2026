# 🛰️ Análisis de Vulnerabilidad, Dinámica Histórica e Impacto Co-Sísmico en La Guaira (GEE Pipeline)

[![MapBiomas Venezuela](https://img.shields.io/badge/MapBiomas-Colecci%C3%B3n%203%20(1985--2024)-00a859.svg)](https://venezuela.mapbiomas.org)
[![Google Earth Engine](https://img.shields.io/badge/Google%20Earth%20Engine-API%20JavaScript-4285F4.svg)](https://earthengine.google.com/)
[![EPSG:32620](https://img.shields.io/badge/CRS-UTM%20Zone%2020N-orange.svg)](https://epsg.io/32620)

> **Cita Oficial de Datos Base:**  
> *"MapBiomas – Colección 3 de la Serie Anual de Mapas de Cobertura y Uso del Suelo de Venezuela, consultada a través de https://venezuela.mapbiomas.org"*[cite: 4].

---

## 📌 Resumen Ejecutivo y Marco Institucional

Este repositorio contiene la arquitectura completa de procesamiento geoespacial e hidro-geomorfológico desarrollada en **Google Earth Engine (GEE)** para la evaluación multicriterio de daños co-sísmicos, vulnerabilidad topográfica, riesgo hidro-geomórfico y trayectorias históricas de antropización en el Estado La Guaira, Venezuela[cite: 4].

La investigación se enmarca metodológicamente en las contribuciones del **Laboratorio de Sistemas de Información Geográfica y Modelado Ambiental (LSIGMA-USB)** de la Universidad Simón Bolívar, institución nodo responsable del procesamiento de las regiones del norte del Orinoco dentro de la iniciativa **MapBiomas Venezuela**[cite: 4].

El estudio integra la serie histórica multitemporal de **MapBiomas Venezuela Colección 3 (1985–2024)**[cite: 4] a 30 m de resolución (basada en clasificadores *Random Forest* y mosaicos Landsat[cite: 4]) como línea base ambiental previa al **doblete sísmico de junio de 2026**. Esta baseline se cruza con imágenes SAR de **Sentinel-1 (IW, polarización VH)** para mapear la alteración del terreno (remociones en masa y colapsos edilicios) bajo cobertura nubosa tropical[cite: 4].

---

## 🗺️ Contexto Cartográfico y Macroclases (Norte del Orinoco)

De acuerdo con el documento *Algorithm Theoretical Basis Document (ATBD)* de la Colección 3 de MapBiomas Venezuela, el territorio nacional se procesa dividiéndolo en dos macro-regiones principales (Norte y Sur del Orinoco)[cite: 4].

┌────────────────────────────────────────────────────────────────────────┐
│                   MAPBIOMAS VENEZUELA - COLECCIÓN 3                   │
├───────────────────────────────────┬────────────────────────────────────┤
│       NORTE DEL ORINOCO (101)     │       SUR DEL ORINOCO (61)         │
│   • Incluye Estado La Guaira      │   • Amazonas, Bolívar, Delta Am.   │
│   • Leyenda Unificada Clase 21    │   • Desagregación agrícola/pasto   │
│   • Procesado por LSIGMA-USB/Provita │   • Procesado por Provita/Wataniba  │
└───────────────────────────────────┴────────────────────────────────────┘


> ⚠️ **Nota Metodológica Clave (Leyenda Nivel 2):**  
> Al norte del Orinoco (incluyendo La Guaira), debido a patrones de heterogeneidad espacial y resolución de Landsat (30 m), las actividades agrícolas y pecuarias se unifican bajo la clase **`Uso agropecuario/Tierras en descanso` (Código 21)**[cite: 4]. Para los análisis de antropización del litoral costero central se consideran formalmente las clases **Uso Urbano (Código 24)** y **Otras Áreas Antrópicas Sin Vegetación (Código 25)**[cite: 4].

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
    $$\Delta \sigma^0 = 10 \cdot \log_{10}(\sigma^0_{\text{post}}) - 10 \cdot \log_{10}(\sigma^0_{\text{pre}}) < -3.0\text{ dB}$$
  * **Salida:** Despliegue dinámico en el Dashboard de GEE y exportación asíncrona GeoTIFF a Google Drive en proyección UTM Zona 20N (`EPSG:32620`).
  * **Enlace directo a GEE Code Editor:** [Abrir Script 01 en Google Earth Engine](https://code.earthengine.google.com/d708458a1b75699f53b9b2a7a4474175)

* **`src/02_procesamiento_sentinel1_damage_laguaira_multiclass.js`**
  * **Objetivo:** Clasificación jerárquica de severidad de daños mediante árboles de decisión sobre la firma radiométrica SAR.
  * **Niveles de Severidad:**
    * **Nivel 1 (Leve / Alteración):** $-1.5\text{ dB} \ge \Delta \sigma^0 > -2.5\text{ dB}$ *(Pérdida parcial de vegetación / variación de humedad)*.
    * **Nivel 2 (Daño Severo):** $-2.5\text{ dB} \ge \Delta \sigma^0 > -3.5\text{ dB}$ *(Flujos de detritos y remociones en masa intermedias)*.
    * **Nivel 3 (Catastrófico):** $\Delta \sigma^0 \le -3.5\text{ dB}$ *(Deslizamientos profundos y colapso de infraestructura)*.
  * **Salida:** Mapa ráster multiclase clasificado (`.tif`) exportado a Google Drive.
  * **Enlace directo a GEE Code Editor:** [Abrir Script 01 en Google Earth Engine](https://code.earthengine.google.com/d708458a1b75699f53b9b2a7a4474175)
---

#### 2. Sectorización y Discriminación de Cobertura

* **`src/03_analisis_vulnerabilidad_Urbana_Terreno_LaGuaira.js`**
  * **Objetivo:** Disociación matricial de la huella sísmica entre zonas de infraestructura urbana edificada y terrenos naturales no arbolados.
  * **Metodología:** Cruza el ráster de anomalía SAR ($\Delta \sigma^0 < -3.0\text{ dB}$) con las clases urbanas y construidas de MapBiomas Colección 3 (Clases `24` - Uso Urbano y `25` - Otras Áreas Antrópicas Sin Vegetación)[cite: 4], aislándolas de coberturas forestales o cuerpos de agua (Clases `26` y `33`)[cite: 4]. Incluye máscaras específicas para evaluar la infraestructura del Aeropuerto Internacional Simón Bolívar de Maiquetía.
  * **Enlace directo a GEE Code Editor:** [Abrir Script 02 en Google Earth Engine](https://code.earthengine.google.com/d1a5fc6e013218ea2f94f6ac5b6501c3)

* **`src/06_evaluacion_integral_danos_LaGuaira.js`**
  * **Objetivo:** Cuantificación multitemática automatizada de la superficie afectada por el sismo según la tipología de cobertura de la Colección 3[cite: 4].
  * **Agrupación LULC Reclasificada (MapBiomas Col. 3):**
    1. **Formaciones Boscosas:** Clases 3 (Bosque), 4 (Sabana Arbolada), 5 (Manglar), 6 (Bosque Inundable)[cite: 4].
    2. **Arbustales y Vegetación Xerófila:** Clases 66 (Arbustal), 50 (Herbazal/Arbustal Xerófilo), 11 (Herbazal/Arbustal Inundable)[cite: 4].
    3. **Sabana / Herbazales:** Clase 12 (Sabana/Herbazal)[cite: 4].
    4. **Uso Agropecuario:** Clase 21 (Uso Agropecuario/Tierras en descanso)[cite: 4].
    5. **Uso Urbano:** Clase 24 (Infraestructura y tejido urbano)[cite: 4].
    6. **Otras Zonas Antrópicas:** Clases 22, 23, 25, 30[cite: 4].
  * **Salida:** Generación de gráficos comparativos (`ui.Chart`) y exportación de tablas tabuladas en `.csv`.
  * **Enlace directo a GEE Code Editor:** [Abrir Script 02 en Google Earth Engine](https://code.earthengine.google.com/38ba1ba67263062a32589620f445796c)

---

#### 3. Vulnerabilidad Topográfica e Hidro-Geomórfica

* **`src/05_vulnerabilidad_topografica_LaGuaira.js`**
  * **Objetivo:** Evaluación del gradiente altitudinal y topográfico del impacto en infraestructuras combinando datos SAR y el modelo digital de elevación SRTM (30m).
  * **Rangos de Pendiente:**
    * *Plano / Suave:* $0^\circ - 15^\circ$
    * *Moderado:* $15^\circ - 30^\circ$
    * *Crítico / Escarpado:* $> 30^\circ$

* **`src/07_evaluacion_matriz_pendiente_cobertura_LaGuaira.js`**
  * **Objetivo:** Evaluación cruzada multivariada ($4\text{ clases de pendiente ALOS AW3D30} \times 6\text{ subcategorías LULC MapBiomas}$)[cite: 4].
  * **Clasificación del Terreno (ALOS):** $0^\circ-10^\circ$ (Suave), $10^\circ-25^\circ$ (Moderada), $25^\circ-45^\circ$ (Escarpada), $>45^\circ$ (Abrupta / Acantilados de la Cordillera de la Costa).
  * **Salida:** Matriz de hectáreas afectadas desplegada mediante gráficos de columnas apiladas y reportes CSV.

* **`src/08_evaluacion_sismica_urban_HAND_LaGuaira.js`**
  * **Objetivo:** Modelado de susceptibilidad hidro-geomórfica y potencial licuefacción sísmica en el frente urbano costero utilizando el modelo *Height Above the Nearest Drainage* (HAND, 30m).
  * **Estratificación del Riesgo Hidrológico:**
    * **Riesgo Crítico (Saturación / Licuefacción):** $0 - 3\text{ m}$
    * **Riesgo Moderado (Llanuras aluviales / Ventanas de inundación):** $3 - 6\text{ m}$
    * **Riesgo Bajo (Terrazas consolidadas):** $> 6\text{ m}$

---

#### 4. Trayectorias Históricas y Dinámicas de Antropización (1985–2024)

* **`src/09_evaluacion_sismica_periodos_urbanizacion_LaGuaira.js`**
  * **Objetivo:** Análisis cruzado entre la severidad del daño co-sísmico y la época de primera intervención antrópica detectada a lo largo de los 40 años de la serie MapBiomas (1985–2024)[cite: 4].
  * **Desagregación Temporal:**
    * **Período 1 (Pre-1985):** Cascos históricos y consolidación urbana inicial[cite: 4].
    * **Períodos 2 a 4 (1986–2000):** Crecimiento acelerado previo a la Tragedia de Vargas (1999)[cite: 4].
    * **Período 5 (2001–2005):** Obras de reconstrucción post-desastre y canalizaciones[cite: 4].
    * **Períodos 6 a 9 (2006–2024):** Ocupación reciente e inestable en vertientes no aptas[cite: 4].

* **`src/10_analisis_trayectorias_antropizacion_SAR_LaGuaira.js`**
  * **Objetivo:** Reconstrucción espacio-temporal pixel a pixel (1985–2005–2014–2024)[cite: 4] para identificar trayectorias de degradación y ocupación inestable.
  * **Matriz de Trayectorias (T1–T5):**
    * **T1 (Antropización Crítica):** Conversión directa de ecosistema natural a uso antrópico en el periodo 2005–2024[cite: 4].
    * **T2 (Degradación de Laderas):** Transición de bosque denso a arbustal/suelo desnudo[cite: 4].
    * **T3 (Núcleo Urbano Consolidado):** Infraestructura estable registrada de forma continua durante $>40$ años[cite: 4].
    * **T4 (Expansión Urbana Reciente):** Ocupación inestable en vertientes escarpadas post-2014[cite: 4].
    * **T5 (Ocupación Post-Tragedia):** Consolidación urbana realizada en la ventana 1985–2005[cite: 4].

---

## 💻 Requisitos e Instalación

1. **Cuenta en Google Earth Engine:** Se requiere acceso activo a la plataforma [Google Earth Engine](https://earthengine.google.com/).
2. **Ejecución de Código:** Copie el código fuente de cualquier módulo ubicado en la carpeta `src/` e impleméntelo en el **Code Editor** de GEE (`code.earthengine.google.com`).
3. **Gestión de Assets y Exportación:** Las salidas en formato GeoTIFF y las tablas tabuladas CSV se procesarán de forma asíncrona en la pestaña **Tasks** de GEE para su sincronización directa con Google Drive.

---

## 🏛️ Créditos y Referencias

* **Desarrollo Geoespacial:** Laboratorio de Sistemas de Información Geográfica y Modelado Ambiental (LSIGMA-USB), Universidad Simón Bolívar.
* **Fuente de Datos:** MapBiomas Venezuela — Colección 3 (1985–2024)[cite: 4].
* **Repositorio Oficial y Visor:** [https://venezuela.mapbiomas.org](https://venezuela.mapbiomas.org)[cite: 4]
