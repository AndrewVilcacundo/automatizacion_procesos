# Automatización de la Configuración Continua con Argo CD y Kubernetes (GitOps)

## 📌 Datos Informativos
- **Institución:** Universidad de Las Américas (UDLA)
- **Carrera:** Ingeniería de Software
- **Materia:** Procesos de Software
- **Componente:** Automatización de la configuración continua (10% P2)
- **Estudiante:** Andrew Mateo Vilcacundo Almache
- **Fecha:** Noviembre 2026

---

## 🎯 1. Objetivo del Proyecto
Implementar un flujo de entrega y despliegue continuo bajo el paradigma **GitOps**, utilizando **Kubernetes (Minikube)** y **Argo CD** como motor de sincronización declarativa, asegurando la automatización continua, la reconciliación de deriva de configuración (*Self-Healing*) y el escalamiento automático horizontal de Pods mediante **HPA (Horizontal Pod Autoscaler)** con métricas de consumo de CPU.

---

## 🛠️ 2. Tecnologías Utilizadas
- **Kubernetes (Minikube v1.39.0 / K8s v1.37.0):** Orquestador de contenedores para ejecutar la infraestructura declarada.
- **Argo CD (v2.x / stable):** Herramienta declarativa GitOps para Kubernetes que mantiene sincronizado el estado del clúster con la fuente de verdad (Git).
- **Docker (v29.5.2):** Motor para empaquetar la aplicación web en un contenedor ligero basado en `node:18-alpine`.
- **Node.js & Express:** Aplicación web funcional con páginas de estado y métricas de pod/host.
- **Metrics Server (v0.9.0):** Pipeline de métricas en clúster para proveer uso de CPU/Memoria al HPA.
- **GitHub:** Repositorio centralizado que actúa como **única fuente de verdad (Single Source of Truth)**.

---

## 🏛️ 3. Arquitectura General
El flujo GitOps implementado sigue el siguiente ciclo:
1. **Desarrollador / DevOps:** Realiza commits y pushes de cambios en los manifiestos declarativos (`k8s/`) al repositorio GitHub.
2. **Argo CD Controller:** Monitorea el repositorio en la rama `main` de manera continua.
3. **Sincronización Automática:** Si detecta discrepancias entre el estado deseado en Git y el clúster, aplica los cambios inmediatamente (`Automated Sync`).
4. **Self-Healing:** Si un administrador modifica un recurso manualmente en Kubernetes, Argo CD detecta el *drift* y revierte el cambio restaurando la definición de Git.
5. **Horizontal Pod Autoscaler (HPA):** Si la carga de solicitudes web supera el 50% de CPU solicitada (100m requests), escala dinámicamente de 2 a un máximo de 5 réplicas.

```
+-----------------------------------------------------------+
|               GitHub (Fuente de Verdad)                   |
|   https://github.com/andrewmateo1503/                     |
|   Automatizacion_Configuracion_Continua_ArgoCD            |
+-----------------------------+-----------------------------+
                              |
                     Polls / Webhooks
                              v
+-----------------------------------------------------------+
|               Kubernetes Cluster (Minikube)               |
|                                                           |
|  [ Argo CD Server / Controller ] (Namespace: argocd)      |
|           | Reconciliación continua / Self-Heal           |
|           v                                               |
|  [ Namespace: gitops-demo ]                               |
|   ├── Deployment: web-app (2-5 replicas)                  |
|   ├── Service: web-app-service (NodePort :30080)          |
|   └── HPA: web-app-hpa (Target CPU: 50%)                  |
|                                                           |
|  [ Metrics Server ] ----> Provee métricas de CPU a HPA    |
+-----------------------------------------------------------+
```

---

## 📋 4. Estructura del Repositorio
```
Automatizacion_Configuracion_Continua_ArgoCD/
│
├── app/
│   ├── package.json         # Dependencias y scripts de Node.js
│   ├── server.js            # Servidor web Express con metadata del pod
│   ├── Dockerfile           # Construcción de la imagen basada en node:18-alpine
│   └── .dockerignore        # Archivos omitidos en el build
│
├── k8s/
│   ├── deployment.yml       # Manifiesto de Deployment (2 réplicas, requests y limits)
│   ├── service.yml          # Manifiesto de Service tipo NodePort (puerto 30080)
│   └── hpa.yml              # HorizontalPodAutoscaler (autoscaling/v2, CPU 50%)
│
├── evidencias/              # Capturas reales de cada fase del proyecto
├── informe.md               # Informe universitario completo
├── README.md                # Documentación del proyecto
└── .gitignore               # Exclusiones de control de versiones
```

---

## ⚙️ 5. Manifiestos de Kubernetes

### `k8s/deployment.yml`
- **Nombre:** `web-app` en el namespace `gitops-demo`.
- **Réplicas iniciales:** 2.
- **Contenedor:** `web-app:v1`, expone el puerto 3000.
- **Recursos definidos:**
  - Requests: CPU `100m`, Memoria `128Mi` (indispensable para cálculo de HPA).
  - Limits: CPU `500m`, Memoria `256Mi`.
- **Probes:** `livenessProbe` y `readinessProbe` apuntando a `/health`.

### `k8s/service.yml`
- **Nombre:** `web-app-service` en el namespace `gitops-demo`.
- **Tipo:** `NodePort`.
- **Puerto:** `80` (redirecciona a `targetPort: 3000`).
- **NodePort:** `30080`.

### `k8s/hpa.yml`
- **Nombre:** `web-app-hpa` en el namespace `gitops-demo`.
- **API:** `autoscaling/v2`.
- **Mínimo réplicas:** 2.
- **Máximo réplicas:** 5.
- **Métrica objetivo:** Utilización promedio de CPU al `50%`.

---

## 🚀 6. Despliegue mediante Argo CD
La aplicación en Argo CD se denomina `web-app-gitops` con los siguientes parámetros:
- **Repo URL:** `https://github.com/andrewmateo1503/Automatizacion_Configuracion_Continua_ArgoCD.git`
- **Target Revision:** `HEAD`
- **Path:** `k8s`
- **Cluster:** `https://kubernetes.default.svc`
- **Namespace:** `gitops-demo`
- **Sync Policy:** Automática (`Automated Sync`), `Prune` y `Self-Heal` habilitados.

---

## 🌐 7. Acceso a los Servicios
- **Aplicación Web:** `http://localhost:30080` (o `minikube service web-app-service -n gitops-demo`).
- **Consola Argo CD:** `https://localhost:8080` vía port-forward:
  ```powershell
  kubectl port-forward svc/argocd-server -n argocd 8080:443
  ```
- **Credenciales Argo CD:** Usuario `admin`.

---

## 📈 8. Verificación de HPA y Resiliencia GitOps
1. **Sincronización Continua:** Los cambios enviados a `main` son detectados por Argo CD y desplegados en segundos sin intervención manual.
2. **Self-Healing:** Cualquier alteración manual o borrado accidental de Pods/Deployments en el clúster es revertido automáticamente por Argo CD.
3. **Escalamiento Horizontal:** Al someter la aplicación a tráfico concurrente en `/cpu-burn`, el uso de CPU supera el 50% de los 100m requests, lo cual activa el HPA elevando los Pods de 2 hasta 5 réplicas. Al cesar la carga, el HPA estabiliza y desescala el clúster a 2 réplicas.
