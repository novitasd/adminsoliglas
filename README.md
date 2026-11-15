# Panel de administración de Soliglas

Aplicación independiente de React + Vite para gestionar trabajos realizados, sus fotos y los mensajes de contacto.

## Desarrollo local

1. Configura el backend y PostgreSQL siguiendo `../backend/README.md`.
2. Copia `.env.example` a `.env` y verifica `VITE_API_URL=http://localhost:4000`. En desarrollo, el panel también usa localhost por defecto.
3. Ejecuta `npm install` dentro de `admin/`.
4. Ejecuta `npm run dev`; el panel abrirá en `http://localhost:5174`.

El puerto 5174 coincide con `ADMIN_ORIGIN` predeterminado de la API. No cambies el puerto sin actualizar también la variable `ADMIN_ORIGIN` del backend.

## Despliegue en Render

Crea un Static Site con `admin/` como Root Directory. Usa `npm install` como Build Command y `npm run build` como Publish Command, con `dist` como Publish Directory. En producción, el panel usa `https://api.soliglas.com`; configura ese dominio personalizado para el servicio de API en Render antes de compilar.

En el servicio API, configura `ADMIN_ORIGIN=https://admin.soliglas.com` y `PUBLIC_ORIGIN` con el origen público exacto de la web. El panel usa cookies de sesión: el panel y la API deben estar bajo el mismo dominio raíz para que el navegador envíe la cookie `SameSite=Lax`.

El sitio administrativo incorpora `noindex, nofollow`; la protección real depende de la sesión validada por la API.

## Despliegue desde cPanel Git Version Control

El archivo `.cpanel.yml` compila el panel con `npm ci` y `npm run build`, y copia `dist/` a `/home/soliglas/public_html/admin/`. La ruta base relativa de Vite permite servir el panel desde `/admin/`. Si la raíz pública o la carpeta destino de tu cuenta es distinta, actualiza `DEPLOYPATH` en `.cpanel.yml` antes de desplegar. El build usa `https://api.soliglas.com`; ese subdominio debe estar configurado en Render y en el DNS antes de desplegar el panel.
