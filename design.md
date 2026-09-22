# Pulso — Design System

> Guía de identidad visual y sistema de diseño para las dos superficies del producto:
> **Sitio Público** (pacientes) y **Panel Admin** (médicos/administradores).

---

## 1. Principios de Diseño

| # | Principio | Descripción |
|---|-----------|-------------|
| 1 | **Confianza** | El sistema de salud exige transmitir seguridad. Colores sobrios, tipografía legible, componentes predecibles. |
| 2 | **Claridad** | El paciente debe encontrar su turno en máximo 3 clics. El médico, ver su agenda de un vistazo. |
| 3 | **Calidez** | Tecnología médica no implica frialdad. Fotografía real, mensajes humanos, micro-interacciones suaves. |
| 4 | **Consistencia** | Los mismos tokens de color, tipografía y espaciado en ambas superficies. Solo cambia el tema. |
| 5 | **Accesibilidad** | Contraste mínimo WCAG AA (4.5:1 en texto normal). Foco visible en teclado. Labels en todos los inputs. |

---

## 2. Paleta de Colores

### 2.1 Colores de Marca (Brand)

| Token | Nombre | HEX | Uso |
|-------|--------|-----|-----|
| `--brand-primary` | Azul Marca | `#4A6FA5` | Color principal de la marca, nav activo |
| `--brand-primary-light` | Azul Claro | `#6B9BD1` | Gradientes hero, fondos de sección suaves |
| `--brand-primary-dark` | Azul Oscuro | `#2E4E80` | Hover en botones primarios, énfasis |
| `--brand-accent` | Cian Brillante | `#38BDF8` | CTAs principales, links activos, indicadores |
| `--brand-accent-dark` | Cian Oscuro | `#0EA5E9` | Hover en CTAs, estados pressed |
| `--brand-teal` | Turquesa | `#2DD4BF` | Acento secundario, iconos, highlights panel admin |
| `--brand-teal-dark` | Turquesa Oscuro | `#0D9488` | Hover en elementos teal |

### 2.2 Colores de Estado (Turnos)

| Token | Nombre | HEX | Estado de Turno |
|-------|--------|-----|-----------------|
| `--state-confirmed` | Verde Esmeralda | `#10B981` | Turno confirmado |
| `--state-confirmed-bg` | Verde Claro | `#D1FAE5` | Fondo badge confirmado (modo claro) |
| `--state-confirmed-bg-dark` | Verde Oscuro BG | `#064E3B` | Fondo badge confirmado (modo oscuro) |
| `--state-pending` | Ámbar | `#F59E0B` | Turno pendiente / por confirmar |
| `--state-pending-bg` | Ámbar Claro | `#FEF3C7` | Fondo badge pendiente (modo claro) |
| `--state-pending-bg-dark` | Ámbar Oscuro BG | `#78350F` | Fondo badge pendiente (modo oscuro) |
| `--state-cancelled` | Rojo | `#EF4444` | Turno cancelado |
| `--state-cancelled-bg` | Rojo Claro | `#FEE2E2` | Fondo badge cancelado (modo claro) |
| `--state-cancelled-bg-dark` | Rojo Oscuro BG | `#7F1D1D` | Fondo badge cancelado (modo oscuro) |
| `--state-completed` | Índigo | `#6366F1` | Turno completado/atendido |
| `--state-completed-bg` | Índigo Claro | `#EEF2FF` | Fondo badge completado (modo claro) |
| `--state-completed-bg-dark` | Índigo Oscuro BG | `#312E81` | Fondo badge completado (modo oscuro) |

### 2.3 Escala de Neutros — Modo Claro ("papel clínico")

**Principio:** modo claro no es modo blanco. Ninguna superficie es `#FFFFFF` — el blanco puro cansa la vista en sesiones largas de trabajo. Tres capas de papel con tinte frío, cada una un paso más clara que la anterior: página → card → input hundido. La tinta es azul oscuro, nunca negro. El **marco** (sidebar + header) se mantiene oscuro a propósito: encuadra la hoja y reduce la superficie clara total. Un lavado radial con el azul de marca en la esquina superior izquierda da atmósfera sin ruido.

| Token (`globals.css`) | HEX | Uso |
|-------|-----|-----|
| `--bg` | `#E4EAF2` | Fondo de página — bone azulado |
| `--slate` | `#F5F7FA` | Cards, tablas, modales — hueso frío |
| `--dark` | `#EAEFF5` | Inputs y selects — hundidos en la card |
| `--deep` | `#DDE4ED` | Secciones alternadas, hover |
| `--mid` | `#D3DCE8` | Divisores |
| `--border` | `rgba(43,66,105,.13)` | Bordes de cards |
| `--border-input` | `#B9C7D9` | Bordes de inputs |
| `--text-primary` | `#1B2740` | Títulos y cuerpo — tinta azul |
| `--text-secondary` | `#4A5872` | Subtítulos |
| `--text-tertiary` | `#6F7D95` | Captions, labels de tabla |
| `--header-bg` | `rgba(21,30,50,.94)` | Barra superior (marco oscuro) |
| `--page-wash` | radial azul + teal | Atmósfera de fondo, solo en claro |

Sombras: azuladas (`rgba(43,66,105,…)`) y difusas — la elevación se lee por profundidad, no por borde.

### 2.4 Escala de Neutros — Modo Oscuro (Panel Admin)

| Token | HEX | Uso |
|-------|-----|-----|
| `--dark-bg-deep` | `#0B1120` | Fondo más profundo (sidebar) |
| `--dark-bg-base` | `#0F1729` | Fondo base de página |
| `--dark-bg-card` | `#151E32` | Fondo de cards |
| `--dark-bg-elevated` | `#1E2A44` | Fondo de modales, dropdowns |
| `--dark-border` | `#2A3A5C` | Bordes de cards, separadores |
| `--dark-border-light` | `#3D4F73` | Bordes de inputs, hover |
| `--dark-text-muted` | `#6B7E9F` | Texto terciario, labels desactivados |
| `--dark-text-secondary` | `#8892A4` | Texto secundario, subtítulos |
| `--dark-text-primary` | `#E2E8F0` | Texto de cuerpo |
| `--dark-text-heading` | `#F8FAFC` | Títulos, valores prominentes |

---

## 3. Tokens CSS

### Sitio Público (`:root`)

```css
:root {
  /* Brand */
  --brand-primary:       #4A6FA5;
  --brand-primary-light: #6B9BD1;
  --brand-primary-dark:  #2E4E80;
  --brand-accent:        #38BDF8;
  --brand-accent-dark:   #0EA5E9;
  --brand-teal:          #2DD4BF;
  --brand-teal-dark:     #0D9488;

  /* Estados de turno */
  --state-confirmed:        #10B981;
  --state-confirmed-bg:     #D1FAE5;
  --state-confirmed-text:   #065F46;
  --state-pending:          #F59E0B;
  --state-pending-bg:       #FEF3C7;
  --state-pending-text:     #92400E;
  --state-cancelled:        #EF4444;
  --state-cancelled-bg:     #FEE2E2;
  --state-cancelled-text:   #991B1B;
  --state-completed:        #6366F1;
  --state-completed-bg:     #EEF2FF;
  --state-completed-text:   #3730A3;

  /* Superficies */
  --surface-page:     #F8FAFC;
  --surface-card:     #FFFFFF;
  --surface-elevated: #FFFFFF;
  --border-default:   #E2E8F0;
  --border-input:     #CBD5E1;

  /* Texto */
  --text-heading:   #0F172A;
  --text-body:      #334155;
  --text-secondary: #64748B;
  --text-disabled:  #94A3B8;
  --text-on-accent: #FFFFFF;

  /* Sombras */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10);
  --shadow-card: 0 4px 24px 0 rgb(74 111 165 / 0.10);

  /* Radios */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Espaciado (base 4px) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

### Panel Admin (`.theme-dark` o `[data-theme="dark"]`)

```css
[data-theme="dark"] {
  /* Superficies */
  --surface-page:     #0F1729;
  --surface-card:     #151E32;
  --surface-elevated: #1E2A44;
  --border-default:   #2A3A5C;
  --border-input:     #3D4F73;

  /* Texto */
  --text-heading:   #F8FAFC;
  --text-body:      #E2E8F0;
  --text-secondary: #8892A4;
  --text-disabled:  #6B7E9F;

  /* Sombras (más visibles en oscuro) */
  --shadow-sm:   0 1px 3px 0 rgb(0 0 0 / 0.30);
  --shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.40);
  --shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.50);
  --shadow-card: 0 4px 24px 0 rgb(0 0 0 / 0.40);

  /* Estados de turno (versión oscura) */
  --state-confirmed-bg:   #064E3B;
  --state-confirmed-text: #6EE7B7;
  --state-pending-bg:     #78350F;
  --state-pending-text:   #FCD34D;
  --state-cancelled-bg:   #7F1D1D;
  --state-cancelled-text: #FCA5A5;
  --state-completed-bg:   #312E81;
  --state-completed-text: #A5B4FC;
}
```

---

## 4. Tipografía

### Familias

| Rol | Familia | Fallback |
|-----|---------|----------|
| UI principal | **Inter** | system-ui, sans-serif |
| Monoespaciado (códigos de turno) | **JetBrains Mono** | 'Courier New', monospace |

> Importar desde Google Fonts:
> ```html
> <link rel="preconnect" href="https://fonts.googleapis.com">
> <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
> ```

### Escala Tipográfica

| Token | Elemento | Tamaño | Peso | Line-height | Letter-spacing |
|-------|----------|--------|------|-------------|----------------|
| `--text-h1` | H1 Hero | `48px / 3rem` | 700 | 1.15 | -0.02em |
| `--text-h2` | H2 Sección | `36px / 2.25rem` | 700 | 1.20 | -0.015em |
| `--text-h3` | H3 Subsección | `28px / 1.75rem` | 600 | 1.25 | -0.01em |
| `--text-h4` | H4 Card title | `22px / 1.375rem` | 600 | 1.30 | -0.005em |
| `--text-h5` | H5 Label grande | `18px / 1.125rem` | 600 | 1.40 | 0 |
| `--text-h6` | H6 Label pequeño | `14px / 0.875rem` | 600 | 1.40 | 0.01em |
| `--text-body-lg` | Párrafo grande | `18px / 1.125rem` | 400 | 1.65 | 0 |
| `--text-body` | Párrafo base | `16px / 1rem` | 400 | 1.60 | 0 |
| `--text-body-sm` | Párrafo pequeño | `14px / 0.875rem` | 400 | 1.55 | 0 |
| `--text-caption` | Caption, meta | `12px / 0.75rem` | 400 | 1.50 | 0.01em |
| `--text-code` | Código de turno | `13px / 0.8125rem` | 500 | 1.40 | 0.05em |

```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;

  --text-h1:       clamp(2rem, 5vw, 3rem);
  --text-h2:       clamp(1.5rem, 3.5vw, 2.25rem);
  --text-h3:       clamp(1.25rem, 2.5vw, 1.75rem);
  --text-h4:       1.375rem;
  --text-h5:       1.125rem;
  --text-h6:       0.875rem;
  --text-body-lg:  1.125rem;
  --text-body:     1rem;
  --text-body-sm:  0.875rem;
  --text-caption:  0.75rem;
  --text-code:     0.8125rem;
}
```

---

## 5. Componentes

### 5.1 Botones

#### Variantes

| Variante | Uso | Fondo | Texto | Borde |
|----------|-----|-------|-------|-------|
| **Primary** | CTA principal ("Buscar", "Reservar") | `--brand-accent` | `#FFFFFF` | none |
| **Secondary** | Acción secundaria ("Ver perfil") | `transparent` | `--brand-primary` | `--brand-primary` |
| **Ghost** | Acción terciaria, nav | `transparent` | `--text-secondary` | none |
| **Danger** | Cancelar turno | `--state-cancelled` | `#FFFFFF` | none |
| **Dark Primary** | CTA en panel admin | `--brand-accent` | `#0B1120` | none |

#### Tamaños

| Tamaño | Padding | Font-size | Border-radius | Altura mínima |
|--------|---------|-----------|---------------|----------------|
| `sm` | `8px 16px` | `14px` | `var(--radius-sm)` | 36px |
| `md` | `12px 24px` | `16px` | `var(--radius-md)` | 44px |
| `lg` | `16px 32px` | `18px` | `var(--radius-md)` | 52px |

#### Estados

```css
.btn-primary {
  background: var(--brand-accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: background 150ms ease, transform 100ms ease, box-shadow 150ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--brand-accent-dark);
  box-shadow: 0 4px 12px rgb(56 189 248 / 0.35);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: none;
}

.btn-primary:disabled {
  background: var(--neutral-300);
  color: var(--neutral-400);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-primary:focus-visible {
  outline: 2px solid var(--brand-accent);
  outline-offset: 3px;
}
```

---

### 5.2 Inputs y Formularios

```css
.input {
  background: var(--surface-card);
  border: 1.5px solid var(--border-input);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  font-size: var(--text-body);
  color: var(--text-body);
  width: 100%;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.input::placeholder {
  color: var(--text-disabled);
}

.input:hover {
  border-color: var(--brand-primary-light);
}

.input:focus {
  outline: none;
  border-color: var(--brand-accent);
  box-shadow: 0 0 0 3px rgb(56 189 248 / 0.15);
}

.input.error {
  border-color: var(--state-cancelled);
  box-shadow: 0 0 0 3px rgb(239 68 68 / 0.12);
}

/* Select con flecha personalizada */
.select {
  appearance: none;
  background-image: url("data:image/svg+xml,..."); /* chevron-down */
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;
}
```

---

### 5.3 Cards

#### Card Estándar (modo claro)
```css
.card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-card);
  transition: box-shadow 200ms ease, transform 200ms ease;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

#### Card Doctor (perfil + búsqueda)

Estructura visual:
```
┌─────────────────────────────────────┐
│  [Foto 72x72px]  Dra. María López   │
│  ○ Disponible    Cardiología         │
│  ─────────────────────────────────  │
│  ★ 4.8  (127 reseñas)               │
│  📍 CABA · $2.500 la consulta        │
│  [      Reservar turno      ]        │
└─────────────────────────────────────┘
```

#### Card Turno (panel admin / historial)

```css
.appointment-card {
  border-left: 4px solid var(--state-confirmed); /* cambia según estado */
  background: var(--surface-card);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: var(--space-4) var(--space-5);
}
```

---

### 5.4 Badges de Estado

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.badge-confirmed {
  background: var(--state-confirmed-bg);
  color: var(--state-confirmed-text);
}

.badge-pending {
  background: var(--state-pending-bg);
  color: var(--state-pending-text);
}

.badge-cancelled {
  background: var(--state-cancelled-bg);
  color: var(--state-cancelled-text);
}

.badge-completed {
  background: var(--state-completed-bg);
  color: var(--state-completed-text);
}
```

#### Código de turno (TM-XXXXX)
```css
.appointment-code {
  font-family: var(--font-mono);
  font-size: var(--text-code);
  font-weight: 500;
  color: var(--brand-accent);
  background: rgb(56 189 248 / 0.08);
  border: 1px solid rgb(56 189 248 / 0.20);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  letter-spacing: 0.05em;
}
```

---

### 5.5 Hero del Sitio Público

```css
.hero {
  position: relative;
  min-height: 480px;
  background: linear-gradient(
    135deg,
    #2E4E80 0%,
    #4A6FA5 40%,
    #6B9BD1 100%
  );
  overflow: hidden;
  display: flex;
  align-items: center;
}

/* Overlay sutil sobre la fotografía de médicos */
.hero__photo-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    rgba(46, 78, 128, 0.85) 0%,
    rgba(74, 111, 165, 0.50) 50%,
    rgba(74, 111, 165, 0.10) 100%
  );
  z-index: 1;
}

.hero__content {
  position: relative;
  z-index: 2;
  max-width: 520px;
}

/* Search bar flotante */
.hero__searchbar {
  background: #FFFFFF;
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.25);
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
```

---

## 6. Modo Claro vs. Modo Oscuro

### Tabla de Mapeo de Tokens

| Token semántico | Modo Claro | Modo Oscuro |
|-----------------|------------|-------------|
| `--surface-page` | `#F8FAFC` | `#0F1729` |
| `--surface-card` | `#FFFFFF` | `#151E32` |
| `--surface-elevated` | `#FFFFFF` | `#1E2A44` |
| `--border-default` | `#E2E8F0` | `#2A3A5C` |
| `--border-input` | `#CBD5E1` | `#3D4F73` |
| `--text-heading` | `#0F172A` | `#F8FAFC` |
| `--text-body` | `#334155` | `#E2E8F0` |
| `--text-secondary` | `#64748B` | `#8892A4` |
| `--text-disabled` | `#94A3B8` | `#6B7E9F` |
| `--shadow-card` | `0 4px 24px rgb(74 111 165 / 0.10)` | `0 4px 24px rgb(0 0 0 / 0.40)` |

### Estrategia de Implementación

El sitio público **siempre usa modo claro**. El panel admin **siempre usa modo oscuro**. No hay toggle de tema — son dos superficies distintas con intenciones distintas.

```html
<!-- Sitio público: sin data-theme, usa :root -->
<html lang="es">

<!-- Panel admin -->
<html lang="es" data-theme="dark">
```

---

## 7. Guía de Imágenes / Fotografía

### 7.1 Fotos de Médicos — Especificaciones

| Atributo | Especificación |
|----------|---------------|
| **Encuadre** | Retrato 3/4 o busto, mirando a cámara |
| **Vestimenta** | Bata blanca (obligatoria), estetoscopio como elemento recurrente |
| **Fondo** | Neutro claro desenfocado (blanco, gris perla, azul muy suave) |
| **Expresión** | Cálida, sonriente, accesible — no seria ni clínica |
| **Diversidad** | Mixtura de género (50/50), edad (30-60 años), etnia |
| **Iluminación** | Suave, frontal o de tres cuartos. Evitar sombras duras |
| **Formato** | JPG/WebP, mínimo 400×400px para thumbnails, 800×800px para perfiles |
| **Ratio** | Cuadrado (1:1) para avatares, 4:3 o 16:9 para hero |

### 7.2 Uso por Contexto

| Contexto | Especificación | Dimensiones |
|----------|---------------|-------------|
| **Hero landing** | Foto de cuerpo completo o 3/4, overlay de color de marca encima | 1200×600px+ |
| **Card de doctor** | Avatar circular o cuadrado con bordes redondeados | 72×72px – 120×120px |
| **Perfil completo** | Foto de perfil grande, fondo blanco/neutro | 200×200px – 300×300px |
| **Estado vacío** | Ilustración friendly (no foto) — médico con tableta, sonriente | SVG/PNG 200×200px |

### 7.3 Tratamiento del Overlay en Hero

El overlay sobre la foto tiene dos funciones: mantener contraste del texto blanco y reforzar el color de marca.

```css
/* Hero con foto de fondo */
.hero {
  background-image: url('/images/hero-doctors.jpg');
  background-size: cover;
  background-position: center right;
}

/* Overlay degradado: cubre el lado izquierdo (donde va el texto)
   y deja la foto visible en el lado derecho */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(46, 78, 128, 0.92) 0%,
    rgba(74, 111, 165, 0.75) 45%,
    rgba(74, 111, 165, 0.20) 70%,
    transparent 100%
  );
}
```

### 7.4 Fuentes de Fotografía Recomendadas

- **Unsplash** (gratuito): buscar "doctor white coat smiling", "medical professional portrait"
- **Pexels** (gratuito): mismos términos
- **Freepik** (plan gratuito/pago): mayor variedad, ilustraciones médicas también
- **Shutterstock / Getty**: uso comercial con licencia

---

## 8. Iconografía

| Atributo | Especificación |
|----------|---------------|
| **Librería** | Lucide React (ya instalado en el proyecto) |
| **Estilo** | Línea fina (stroke), no relleno sólido |
| **Grosor de trazo** | `strokeWidth={1.5}` para UI estándar, `strokeWidth={2}` para énfasis |
| **Tamaño estándar** | 20px (inline en texto), 24px (standalone), 32px (destacado) |
| **Color** | Hereda `currentColor` — adapta automáticamente al tema |

### Iconos Clave del Dominio

| Icono (Lucide) | Uso |
|----------------|-----|
| `Calendar` | Turnos, agenda |
| `Clock` | Horarios, duración |
| `User` / `Users` | Paciente, pacientes |
| `Stethoscope` | Médico, especialidad |
| `FileText` | Informes médicos, recetas |
| `CheckCircle2` | Turno confirmado |
| `XCircle` | Turno cancelado |
| `AlertCircle` | Turno pendiente |
| `Bell` | Notificaciones |
| `Activity` | Dashboard, estadísticas |
| `Search` | Buscar médico |
| `MapPin` | Ubicación |
| `Phone` | Contacto |
| `Download` | Descargar comprobante/informe |
| `Printer` | Imprimir |

---

## 9. Espaciado y Grid

### Sistema de Espaciado (base 4px)

| Token | Valor | Uso típico |
|-------|-------|------------|
| `--space-1` | `4px` | Gaps mínimos, iconos internos |
| `--space-2` | `8px` | Padding de badges, gap entre icon y label |
| `--space-3` | `12px` | Padding de inputs pequeños, gaps de lista |
| `--space-4` | `16px` | Padding de cards pequeñas, gap estándar |
| `--space-5` | `20px` | Margen entre secciones menores |
| `--space-6` | `24px` | Padding de cards estándar |
| `--space-8` | `32px` | Margen entre cards, secciones |
| `--space-10` | `40px` | Secciones de contenido |
| `--space-12` | `48px` | Separación entre bloques de página |
| `--space-16` | `64px` | Secciones principales |
| `--space-20` | `80px` | Secciones hero, padding vertical de página |

### Grid

```css
.container {
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: var(--space-6);
}

/* Grid de doctors */
.doctors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-6);
}

/* Grid de estadísticas (dashboard) */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-5);
}
```

### Breakpoints

| Nombre | Valor | Dispositivo |
|--------|-------|-------------|
| `sm` | `640px` | Móvil grande |
| `md` | `768px` | Tablet |
| `lg` | `1024px` | Desktop pequeño |
| `xl` | `1280px` | Desktop estándar |
| `2xl` | `1536px` | Desktop grande |

---

## 10. Animaciones y Transiciones

```css
:root {
  /* Duraciones */
  --duration-fast:   100ms;
  --duration-base:   150ms;
  --duration-slow:   300ms;
  --duration-slower: 500ms;

  /* Easings */
  --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Entrada de páginas y listas */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-enter {
  animation: fadeSlideUp var(--duration-slow) var(--ease-out) both;
}

/* Skeleton loader para datos asincrónicos */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.skeleton {
  background: var(--border-default);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
```

---

*Última actualización: Septiembre 2026 — Pulso Design System v1.0*
