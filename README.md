# 🛰️ Análisis de Vulnerabilidad e Impacto Co-Sísmico en La Guaira (GEE Pipeline)

Este repositorio contiene la arquitectura completa de procesamiento geoespacial e hidro-geomorfológico desarrollada en **Google Earth Engine (GEE)** para la evaluación multi-criterio de daños co-sísmicos, vulnerabilidad topográfica, riesgo hidro-geomórfico y trayectorias históricas de antropización en el estado La Guaira, Venezuela.

---

## 🛠️ Estructura del Pipeline y Scripts de Procesamiento

El flujo de procesamiento geoespacial e hidro-geomorfológico está estructurado en scripts modulares desarrollados para Google Earth Engine (GEE), utilizando como fuentes principales la **Colección 3 de MapBiomas Venezuela (1985–2024)**, el radar SAR **Sentinel-1 (GRD, modo IW, polarización VH)**, el modelo **SRTM (30m)** y **Global HAND (30m)**.

### 📜 Descripción Detallada de Módulos y Scripts

#### 1. Detección y Caracterización SAR Co-Sísmica

* **`src/01_procesamiento_sentinel1_damage_laguaira.js`**
  * **Objetivo:** Detección primaria de alteraciones superficiales (remociones en masa y colapsos) tras el evento sísmico (junio 2026).
  * **Metodología:** Filtra la colección Sentinel-1 (IW, VH) pre-sismo (`2026-06-01` a `2026-06-23`) y post-sismo (`2026-06-24` a `2026-07-05`). Calcula la diferencia logarítmica de retrodispersión ($\Delta \sigma^0$) y aplica umbralización binaria estricta ($\Delta \sigma^0 < -3.0 \text{ dB}$).
  * **Visualización/Exportación:** Despliega paneles interactivos en el dashboard de GEE y configura la exportación asíncrona a Google Drive en UTM Zona 20N (`EPSG:32620`).

* **`src/02_procesamiento_sentinel1_damage_laguaira_multiclass.js`**
  * **Objetivo:** Clasificación de severidad de daños e impactos geomórficos mediante un árbol de decisiones vectorizado sobre la señal SAR.
  * **Categorías de Severidad:**
    * **Nivel 1 (Leve / Alteración):** $-1.5 \text{ dB} \ge \Delta \sigma^0 > -2.5 \text{ dB}$ (Caída inicial de dosel / humedad).
    * **Nivel 2 (Daño Severo):** $-2.5 \text{ dB} \ge \Delta \sigma^0 > -3.5 \text{ dB}$ (Flujos de detritos y remoción en masa).
    * **Nivel 3 (Catastrófico):** $\Delta \sigma^0 \le -3.5 \text{ dB}$ (Colapso estructural y deslizamientos profundos).
  * **Salida:** Exportación de mapa de severidad multiclase raster (`.tif`) a Google Drive.

#### 2. Sectorización y Discriminación de Cobertura

* **`src/03_analisis_vulnerabilidad_Urbana_Terreno_LaGuaira.js`**
  * **Objetivo:** Disociación matricial de la huella sísmica entre áreas de infraestructura y terreno natural sin vegetación/bosque.
  * **Metodología:** Cruza las anomalías SAR ($\Delta \sigma^0 < -3.0 \text{ dB}$) con la máscara urbana (clases 24 y 25 de MapBiomas Col. 3) frente a cobertura natural/ecosistémica (excluyendo cuerpos de agua 26 y 33). Incluye evaluación de infraestructura aeroportuaria y despliegue de métricas en gráficos de consola `ui.Chart`.

* **`src/06_evaluacion_integral_danos_LaGuaira.js`**
  * **Objetivo:** Cuantificación multitemática del impacto sísmico según subcategorías de cobertura y uso de suelo.
  * **Agrupación LULC (MapBiomas Col. 3):**
    1. *Bosques* (Clases 3, 4, 5, 6)
    2. *Arbustales* (Clases 66, 50, 11)
    3. *Sabana / Herbazales* (Clases 12, 13)
    4. *Uso Agropecuario* (Clases 15, 18, 21)
    5. *Uso Urbano* (Clase 24)
    6. *Otras Zonas Antrópicas* (Clases 22, 23, 25, 30)
  * **Salida:** Generación de gráficos comparativos y exportación automática de métricas agrupadas en tablas CSV.

#### 3. Vulnerabilidad Topográfica e Hidro-Geomórfica

* **`src/05_vulnerabilidad_topografica_LaGuaira.js`**
  * **Objetivo:** Cruzar la infraestructura destruida (fusión SAR + MapBiomas urbano) con el modelo digital de elevación SRTM (30m).
  * **Clasificación de Pendientes:**
    * *Plano / Suave:* $0^\circ - 15^\circ$
    * *Moderado:* $15^\circ - 30^\circ$
    * *Crítico:* $> 30^\circ$
  * **Salidas:** Generación de tablas estadísticas CSV y gráficos interactivos ordenados por gradiente topográfico.

* **`src/07_evaluacion_matriz_pendiente_cobertura_LaGuaira.js`**
  * **Objetivo:** Matriz de riesgo cruzado multivariada ($4 \text{ clases de pendiente ALOS AW3D30} \times 6 \text{ subcategorías LULC MapBiomas}$).
  * **Inclinación del Terreno (ALOS):** $0^\circ-10^\circ$ (Suave), $10^\circ-25^\circ$ (Moderada), $25^\circ-45^\circ$ (Escarpada), $>45^\circ$ (Abrupta/Crítica).
  * **Resultado:** Matriz de hectáreas destruidas expuesta mediante gráfico de columnas apiladas y exportación matricial `.csv`.

* **`src/08_evaluacion_sismica_urban_HAND_LaGuaira.js`**
  * **Objetivo:** Modelado de vulnerabilidad hidro-geomórfica y susceptibilidad a licuefacción sísmica sobre la huella urbana afectada.
  * **Modelo HAND (*Height Above Nearest Drainage* - 30m):**
    * *Riesgo Crítico (Saturado / Licuefacción):* $0 - 3 \text{ m}$
    * *Riesgo Moderado (Llanuras aluviales):* $3 - 6 \text{ m}$
    * *Riesgo Bajo (Terrazas fijas):* $> 6 \text{ m}$
  * **Salidas:** Mapeo de exposición hídrica y reporte automático CSV.

#### 4. Trayectorias Históricas y Dinámicas de Urbanización

* **`src/09_evaluacion_sismica_periodos_urbanizacion_LaGuaira.js`**
  * **Objetivo:** Evaluación del daño co-sísmico cruzado con la época/año de primera intervención antrópica en los 40 años de serie de MapBiomas (1985–2024).
  * **Desagregación Temporal de Infraestructura:**
    * *Período 1:* Hasta 1985 (Cascos históricos y cimientos tradicionales).
    * *Períodos 2 al 4:* 1986–2000 (Incluye el pico de presión antrópica previo a la Tragedia de Vargas de 1999).
    * *Período 5:* 2001–2005 (Obras post-desastre y obras de mitigación).
    * *Períodos 6 al 9:* 2006–2024 (Frentes urbanos recientes e inestables).
  * **Salida:** Distribución cronológica de la pérdida de coherencia SAR respecto a la edad edilicia en formato CSV y gráfico de barras.

* **`src/10_analisis_trayectorias_antropizacion_SAR_LaGuaira.js`**
  * **Objetivo:** Reconstrucción histórica pixel a pixel (1985–2005–2014–2024) para identificar patrones dinámicos de vulnerabilidad territorial.
  * **Trayectorias Analizadas (T1 – T5):**
    * **T1:** Antropización Crítica (Conversión de ecosistema natural a antrópico ocurrida entre 2005 y 2024).
    * **T2:** Laderas en Degradación Progresiva (Pérdida de densidad del dosel a suelo desnudo/urbano).
    * **T3:** Núcleo Urbano Consolidado Histórico (Infraestructura de alta densidad con $>40$ años).
    * **T4:** Frentes de Expansión Urbana Reciente (Ocupación inestable en vertientes post-2014).
    * **T5:** Ocupación Urbana Post-Tragedia (Consolidación entre 1985 y 2005).

---

## 💻 Requisitos e Instalación

1. **Google Earth Engine Account:** Se requiere acceso habilitado a la plataforma de [Google Earth Engine](https://earthengine.google.com/).
2. **Ejecución:** Copia el contenido de cualquiera de los scripts ubicados en la carpeta `src/` e impleméntalo directamente en el Code Editor de GEE (`code.earthengine.google.com`).
3. **Exportaciones:** Los archivos de salida (GeoTIFFs y CSVs) se generarán directamente en la pestaña **Tasks** de la consola de Earth Engine para su posterior sincronización con Google Drive.
