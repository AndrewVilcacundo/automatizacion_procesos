# UNIVERSIDAD DE LAS AMÉRICAS
## FACULTAD DE INGENIERÍA Y CIENCIAS APLICADAS
### CARRERA DE INGENIERÍA DE SOFTWARE

---

**Asignatura:** Procesos de Software  
**Tema:** Automatización de la configuración continua (10% P2) - Despliegue de una aplicación con Argo CD y Kubernetes (GitOps)  
**Estudiante:** Andrew Mateo Vilcacundo Almache  
**Fecha:** 22 de noviembre de 2026  
**Docente:** Mtr. / Ing. de la Asignatura  
**Enlace Repositorio GitHub:** [https://github.com/andrewmateo1503/Automatizacion_Configuracion_Continua_ArgoCD](https://github.com/andrewmateo1503/Automatizacion_Configuracion_Continua_ArgoCD)

---

## 1. INTRODUCCIÓN

En el ciclo de vida del desarrollo de software moderno y bajo las metodologías DevOps, la entrega y el despliegue continuo demandan mecanismos altamente automatizados, trazables y resistentes a fallos o desviaciones humanas. El paradigma **GitOps** surge como una evolución de la Infraestructura como Código (IaC), donde los repositorios de Git se establecen como la **Única Fuente de Verdad (Single Source of Truth)** tanto para la infraestructura declarativa como para el estado de las aplicaciones en ejecución.

A través de herramientas declarativas nativas como **Argo CD** integradas con clústeres de **Kubernetes**, el sistema es capaz de monitorizar continuamente las diferencias entre el estado declarado en el repositorio y el estado vivo en el clúster. Cuando se suscitan discrepancias, Argo CD aplica la sincronización automatizada (*Automated Sync*) y la reconciliación correctiva (*Self-Healing*). Complementariamente, el escalamiento automático horizontal mediante **Horizontal Pod Autoscaler (HPA)** garantiza que los servicios adapten su capacidad de cómputo en tiempo real según el consumo real de recursos (CPU).

---

## 2. OBJETIVO GENERAL

Implementar un flujo integral de automatización de la configuración continua bajo el enfoque GitOps en un clúster Kubernetes local (Minikube), desplegando una aplicación web contenerizada mediante Argo CD, sincronizada automáticamente con un repositorio público de GitHub, y validando experimentalmente tanto la reconciliación declarativa (*Self-Healing*) como el autoescalamiento horizontal de Pods (HPA) ante variaciones de carga.

---

## 3. HERRAMIENTAS Y ENTORNO UTILIZADOS

| Herramienta / Tecnología | Versión Verificada | Propósito en el Proyecto |
| :--- | :--- | :--- |
| **Windows 11** | Build 25H2 | Sistema operativo base del entorno de trabajo. |
| **Docker Desktop** | 29.5.2 | Construcción de imágenes de contenedores y runtime del nodo de Minikube. |
| **Minikube** | v1.39.0 | Clúster de Kubernetes mononodo local (Driver Docker). |
| **Kubernetes (Control Plane)** | v1.37.0 | Plataforma de orquestación de contenedores y gestión de cargas de trabajo. |
| **Kubectl CLI** | v1.34.1 | Interfaz de línea de comandos para interactuar con la API de Kubernetes. |
| **Argo CD** | v2.x (Stable) | Controlador y operador GitOps para sincronización continua y reconciliación declarativa. |
| **Metrics Server** | v0.9.0 | Servidor de agregación de métricas de CPU y memoria en Kubernetes. |
| **GitHub CLI (`gh`) & Git** | 2.105.0 / 2.53.0 | Control de versiones distribuido y gestión de la fuente de verdad en GitHub. |
| **Node.js & Express** | 18-alpine / Express 4.19 | Aplicación web ligera con endpoints de métricas de servidor y simulación de carga de CPU. |

---

## 4. DESARROLLO DE LA IMPLEMENTACIÓN

El proyecto se estructuró de manera modular y reproducible, respetando la estructura exigida en las directrices académicas:

```
Automatizacion_Configuracion_Continua_ArgoCD/
│
├── app/
│   ├── package.json
│   ├── server.js
│   ├── Dockerfile
│   └── .dockerignore
│
├── k8s/
│   ├── deployment.yml
│   ├── service.yml
│   └── hpa.yml
│
├── evidencias/
│   ├── 01_docker_funcionando.png ... 14_prueba_escalamiento_hpa.png
│
├── README.md
├── informe.md
└── .gitignore
```

### 4.1. Desarrollo y Empaquetamiento de la Aplicación Web (`app/`)
Se desarrolló una aplicación web con **Node.js** y el framework **Express**, contenida en `app/server.js`. La aplicación cuenta con:
- Una interfaz visual responsiva que muestra los datos del proyecto, carrera, estudiante y materia.
- Un bloque dinámico con los metadatos del Pod en ejecución: `hostname` del Pod, dirección IP interna, puerto de escucha (`3000`), uptime y memoria en uso.
- Un endpoint de verificación de salud (`GET /health`) utilizado por los `readinessProbe` y `livenessProbe` de Kubernetes.
- Un endpoint de prueba de estrés computacional (`GET /cpu-burn?ms=400`) para generar consumo intensivo de CPU durante las pruebas de autoescalado.

El archivo `app/Dockerfile` utiliza una imagen base `node:18-alpine`, instala dependencias en modo producción y expone el puerto `3000`. La imagen fue construida localmente como `web-app:v1` y cargada al clúster mediante `minikube image load web-app:v1`.

---

## 5. CONFIGURACIÓN DEL DEPLOYMENT (`k8s/deployment.yml`)

El Deployment define la carga de trabajo principal en el namespace `gitops-demo`:
- **Nombre:** `web-app`.
- **Réplicas iniciales:** 2 réplicas.
- **Imagen:** `web-app:v1` con política `imagePullPolicy: IfNotPresent`.
- **Límites y Peticiones de Recursos (Resource Requests & Limits):**
  - `requests.cpu: 100m` (0.1 vCPU) y `requests.memory: 128Mi`.
  - `limits.cpu: 500m` (0.5 vCPU) y `limits.memory: 256Mi`.
  *Nota técnica:* La definición estricta de `requests.cpu` es el requisito sine qua non para que el componente `HorizontalPodAutoscaler` pueda calcular el porcentaje relativo de consumo de CPU.
- **Probes:** Se añadieron sondas de preparación (`readinessProbe`) y supervivencia (`livenessProbe`) para garantizar que el tráfico ingrese únicamente a réplicas operativas.

---

## 6. CONFIGURACIÓN DEL SERVICE (`k8s/service.yml`)

Para permitir el acceso a la aplicación desde el navegador del sistema anfitrión:
- **Nombre:** `web-app-service`.
- **Namespace:** `gitops-demo`.
- **Tipo:** `NodePort`.
- **Puertos:** `port: 80`, `targetPort: 3000` y `nodePort: 30080`.
- **Selectores:** Asociado a los Pods con la etiqueta `app: web-app`.
- **Mapeo en Minikube (Driver Docker en Windows):** Mediante el túnel de servicio de Minikube (`minikube service web-app-service -n gitops-demo`), el puerto fue enrutado al socket local accesible `http://127.0.0.1:63615`.

---

## 7. CONFIGURACIÓN DEL HPA (`k8s/hpa.yml`)

El autoescalado horizontal se definió bajo la especificación moderna `autoscaling/v2`:
- **Nombre:** `web-app-hpa`.
- **Referencia de Destino:** `Deployment/web-app`.
- **Umbral de Activación:** Utilización promedio de CPU al `50%` respecto al request establecido (es decir, cuando el consumo promedio supera los 50m).
- **Rango de Réplicas:** Mínimo `2` y máximo `5` réplicas.

---

## 8. INTEGRACIÓN CON GITHUB Y ARGO CD (GITOPS)

1. **Creación del Repositorio:** Se aprovisionó el repositorio público:  
   `https://github.com/andrewmateo1503/Automatizacion_Configuracion_Continua_ArgoCD`
2. **Instalación de Argo CD:** Se desplegó el conjunto de manifiestos oficiales en el namespace `argocd`, inicializando los controladores, servidores de repositorio, servidores API y Redis.
3. **Definición de la Aplicación Argo CD (`web-app-gitops`):**
   - **Repositorio Git:** Repositorio en GitHub apuntando a la rama `HEAD` (`main`) en la ruta `k8s`.
   - **Clúster Destino:** `https://kubernetes.default.svc` en el namespace `gitops-demo`.
   - **Políticas Habilitadas:**
     - `Automated Sync`: Sincronización automática ante commits en Git.
     - `Prune`: Eliminación de recursos en el clúster si se borran del repositorio.
     - `Self-Heal`: Reconciliación continua e inmediata de derivas manuales en el clúster.
     - `ignoreDifferences`: Configurado en `/spec/replicas` para delegar el control dinámico del número de réplicas al `HPA` sin conflicto con el manifiesto base de Git.

---

## 9. PRUEBA DE SINCRONIZACIÓN AUTOMÁTICA GITOPS

### Procedimiento
1. Se editó el archivo `k8s/deployment.yml` en el repositorio local incorporando etiquetas y anotaciones de control (`version: "v1.1"`, `environment: "production-gitops"`, `udla-eval: "10-percent-p2"`).
2. Se realizó commit y push hacia el repositorio remoto en GitHub (`ci(gitops): update deployment labels and annotations to verify auto sync`).
3. Argo CD detectó la actualización en la rama `main` y ejecutó un *Rolling Update* declarativo sin interrupción de servicio.
4. Se verificó en el clúster que los nuevos Pods contenían las anotaciones y etiquetas declaradas, y la aplicación en Argo CD pasó inmediatamente al estado **Synced** y **Healthy**.

---

## 10. PRUEBA DE SELF-HEALING (RECONCILIACIÓN CONTINUA)

### Procedimiento
1. Con la aplicación en estado estable (2 réplicas), se ejecutó una alteración manual fuera de Git mediante `kubectl`:
   ```powershell
   kubectl scale deployment web-app -n gitops-demo --replicas=4
   ```
2. Kubernetes inició la creación de 4 réplicas (`web-app: 2/4`).
3. En menos de 6 segundos, el motor de reconciliación de **Argo CD** detectó el *Drift* (desviación entre el clúster y GitHub).
4. Argo CD aplicó inmediatamente la regla de **Self-Heal**, sobrescribiendo la modificación manual y reduciendo de nuevo el Deployment a las 2 réplicas estipuladas en Git.
5. El estado del clúster volvió a concordar con la fuente de verdad sin requerir ninguna acción administrativa manual.

---

## 11. PRUEBA DE ESCALAMIENTO AUTOMÁTICO (HPA)

### Procedimiento
1. Se validó la disponibilidad de `Metrics Server` mediante `kubectl top nodes` y `kubectl top pods -n gitops-demo`.
2. Se ejecutó un script en PowerShell lanzando 14 tareas en paralelo (*background jobs*) generando peticiones HTTP concurrentes al endpoint `/cpu-burn?ms=400` de la aplicación web durante 75 segundos.
3. El uso de CPU de los Pods aumentó drásticamente, superando el umbral objetivo del 50% y alcanzando picos superiores al **380%** de los requests solicitados.
4. El controlador de HPA detectó la sobrecarga (`ValidMetricFound` y `ScaleUp`) e incrementó automáticamente las réplicas del Deployment desde las **2 réplicas iniciales hasta el máximo configurado de 5 réplicas**.
5. Al suspender la generación de carga, el consumo de CPU descendió por debajo del 20%, y tras expirar la ventana de estabilización (*ScaleDownStabilized* / período de enfriamiento de Kubernetes), el HPA procedió a la reducción ordenada de Pods para preservar recursos.

---

## 12. RESULTADOS OBTENIDOS

- **Despliegue 100% Declarativo:** Todos los componentes requeridos (Deployment, Service NodePort y HPA v2) operan de forma estable y sincronizada.
- **Acceso Web Verificado:** La aplicación web responde exitosamente con código HTTP 200 en el navegador y balancea las solicitudes entre los diferentes Pods generados.
- **Cumplimiento GitOps:** Se comprobó la bidireccionalidad del modelo: cualquier cambio en Git se refleja en el clúster, y cualquier cambio no autorizado en el clúster es revertido por Argo CD.
- **Elasticidad Demostrada:** El clúster escaló de 2 a 5 réplicas bajo carga y retornó a su estado base de forma autónoma.
- **Evidencias Completas:** Las 14 capturas de pantalla fueron generadas y organizadas en la carpeta `evidencias/`.

---

## 13. ÍNDICE DE EVIDENCIAS GENERADAS

Todas las evidencias se encuentran guardadas en la carpeta `evidencias/` dentro de la raíz del proyecto:

1. `01_docker_funcionando.png`: Versión de Docker Engine y estado del servicio activo.
2. `02_minikube_kubernetes_funcionando.png`: Estado de Minikube y nodos de Kubernetes en estado `Ready`.
3. `03_dos_pods_iniciales_running.png`: Pods iniciales en estado `Running` en el namespace `gitops-demo`.
4. `04_deployment_correctamente_creado.png`: Detalle del Deployment `web-app` con réplicas y recursos (requests/limits).
5. `05_service_tipo_nodeport.png`: Service `web-app-service` configurado con NodePort 30080.
6. `06_hpa_parametros.png`: Parámetros del HorizontalPodAutoscaler (mínimo 2, máximo 5, CPU 50%).
7. `07_metrics_server_funcionando.png`: Métricas activas de nodos y pods reportadas por Metrics Server.
8. `08_aplicacion_navegador.png`: Captura de la aplicación web abierta en el navegador.
9. `09_repositorio_publico_github.png`: Interfaz web del repositorio público creado en GitHub.
10. `10_archivos_yaml_repositorio.png`: Vista de la carpeta `k8s/` con los tres archivos YAML en GitHub.
11. `11_interfaz_argocd_synced_healthy.png`: Consola de Argo CD reflejando el estado de la aplicación.
12. `12_prueba_sincronizacion_automatica.png`: Registro de commit en Git y sincronización automática en Kubernetes.
13. `13_prueba_self_heal.png`: Demostración del evento de deriva manual y corrección automática por Argo CD.
14. `14_prueba_escalamiento_hpa.png`: Registro de incremento de réplicas de 2 a 5 ante carga de CPU.

---

## 14. CONCLUSIONES

1. El enfoque **GitOps** centralizado en GitHub y orquestado por **Argo CD** elimina la necesidad de otorgar accesos directos o manuales de despliegue a los clústeres de Kubernetes, minimizando drásticamente los errores por configuración manual y previniendo la degradación no documentada de la infraestructura.
2. La funcionalidad de **Self-Healing** demostró ser una salvaguarda indispensable para entornos de misión crítica, asegurando que ante incidentes o modificaciones erróneas en tiempo de ejecución, el clúster retorne inmediatamente al estado validado y versionado en Git.
3. El dimensionamiento correcto de los recursos en los contenedores (`resources.requests`) es fundamental no solo para el empaquetamiento eficiente del planificador de Kubernetes, sino también para habilitar métricas confiables que permitan al **HPA** responder de manera elástica y oportuna ante fluctuaciones en la demanda de los usuarios.
4. La combinación de Docker, Minikube, Metrics Server y Argo CD proporciona un laboratorio DevOps empresarial completo y reproducible sobre Windows 11, apto para simular flujos de integración y entrega continua con altos estándares de calidad de software.
