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
