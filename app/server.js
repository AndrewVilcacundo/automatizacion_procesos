const express = require('express');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 3000;

// Contador de solicitudes
let requestCount = 0;

app.get('/', (req, res) => {
    requestCount++;
    const hostname = os.hostname();
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'Desconocida';

    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                ipAddress = net.address;
                break;
            }
        }
    }

    const uptime = Math.floor(process.uptime());
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automatización Continua - UDLA GitOps</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
            padding: 20px;
        }
        .card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            max-width: 680px;
            width: 100%;
            overflow: hidden;
            animation: fadeIn 0.8s ease-in-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header {
            background: #800020;
            color: white;
            padding: 24px;
            text-align: center;
        }
        .header h1 { font-size: 1.6rem; margin-bottom: 6px; }
        .header h2 { font-size: 1.1rem; font-weight: 400; opacity: 0.9; }
        .badge-gitops {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: bold;
            margin-top: 10px;
            box-shadow: 0 2px 8px rgba(40,167,69,0.4);
        }
        .content { padding: 26px; }
        .message-box {
            background: #eef6ff;
            border-left: 5px solid #2a5298;
            padding: 14px 18px;
            border-radius: 4px;
            margin-bottom: 22px;
            font-size: 0.98rem;
            line-height: 1.5;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 20px;
        }
        .info-item {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 12px 14px;
        }
        .info-label {
            font-size: 0.78rem;
            text-transform: uppercase;
            color: #6c757d;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .info-value {
            font-size: 1.05rem;
            font-weight: bold;
            color: #212529;
            word-break: break-all;
        }
        .footer {
            background: #f1f3f5;
            padding: 14px 24px;
            text-align: center;
            font-size: 0.85rem;
            color: #495057;
            border-top: 1px solid #e9ecef;
        }
        .footer span { font-weight: bold; color: #800020; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>Universidad de Las Américas (UDLA)</h1>
            <h2>Automatización de la Configuración Continua (10% P2)</h2>
            <div class="badge-gitops">Desplegado con Kubernetes & Argo CD (GitOps)</div>
        </div>
        <div class="content">
            <div class="message-box">
                <strong>Estado de Entrega:</strong> Esta aplicación web está desplegada de forma automatizada mediante <strong>Kubernetes</strong> y sincronizada continuamente con <strong>Argo CD</strong> bajo el paradigma <strong>GitOps</strong>.
            </div>

            <h3 style="font-size: 1rem; margin-bottom: 12px; color: #495057;">Información del Servidor / Pod en Ejecución</h3>
            <div class="grid">
                <div class="info-item">
                    <div class="info-label">Nombre del Pod / Host</div>
                    <div class="info-value" id="hostname">${hostname}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Dirección IP del Pod</div>
                    <div class="info-value">${ipAddress}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Puerto de Escucha</div>
                    <div class="info-value">${PORT}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tiempo Activo (Uptime)</div>
                    <div class="info-value">${uptime} seg</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Uso Memoria Heap</div>
                    <div class="info-value">${memUsage} MB</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total Solicitudes Atendidas</div>
                    <div class="info-value">${requestCount}</div>
                </div>
            </div>
        </div>
        <div class="footer">
            Estudiante: <span>Andrew Mateo Vilcacundo Almache</span> | Carrera: <span>Ingeniería de Software</span> | Materia: <span>Procesos de Software</span>
        </div>
    </div>
</body>
</html>
    `);
});

// Endpoint de prueba de carga para disparar el HPA (cálculo de CPU intensivo)
app.get('/cpu-burn', (req, res) => {
    const durationMs = parseInt(req.query.ms) || 200;
    const start = Date.now();
    let result = 0;
    while (Date.now() - start < durationMs) {
        result += Math.sqrt(Math.random() * 10000);
    }
    res.json({
        pod: os.hostname(),
        burnedMs: Date.now() - start,
        status: "CPU burned successfully"
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor UDLA GitOps corriendo exitosamente en el puerto ${PORT}`);
});
