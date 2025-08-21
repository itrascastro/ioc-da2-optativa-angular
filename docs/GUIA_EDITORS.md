# 📝 Guia per Editors de Materials IOC

## 🎯 Objectiu
Aquest document explica com crear i editar continguts educatius seguint l'arquitectura simplificada d'aquest sistema.

## 📂 Estructura de Fitxers

```
unitat-X/
└── bloc-Y.html               ← TU EDITES AQUÍ
```

## ✅ QUÈ POTS FER

### **HTML + Components Jekyll NOMÉS:**

```html
<div class="section">
    <h2 id="nom-seccio">Títol de la Secció</h2>
    
    <p>Contingut educatiu amb <strong>text destacat</strong> i <em>cursiva</em>.</p>

    {% include info_box.html
       contingut="<strong>💡 Definició:</strong> Angular és un framework complet..."
    %}

    <h3>Subtítol</h3>

    <ul>
        <li><strong>Element destacat:</strong> Descripció</li>
        <li>Element normal de la llista</li>
    </ul>

    {% include code-block.html
       lang="bash"
       code="# Exemple de codi
npm install -g @angular/cli
ng version"
    %}

    {% include warning_box.html
       contingut="<strong>⚠️ Nota important:</strong> El primer build pot trigar..."
    %}

    {% include success_box.html
       contingut="<strong>✅ Objectius aconseguits:</strong>
<ul>
<li>✓ Primera tasca completada</li>
<li>✓ Segona tasca completada</li>
</ul>"
    %}
</div>
```

## 📦 Components Jekyll Disponibles

### 📘 Caixa Informativa:
```jekyll
{% include info_box.html
   contingut="<strong>💡 Informació:</strong> Text explicatiu amb <em>HTML</em>..."
%}
```

### ⚠️ Caixa d'Advertiment:
```jekyll
{% include warning_box.html
   contingut="<strong>⚠️ Atenció:</strong> Text d'advertiment amb <code>codi</code>..."
%}
```

### ✅ Caixa d'Èxit:
```jekyll
{% include success_box.html
   contingut="<strong>✅ Completat:</strong> Text amb llistes HTML
<ul>
<li>✓ Primera tasca</li>
<li>✓ Segona tasca</li>
</ul>"
%}
```

### 💻 Bloc de Codi:
```jekyll
{% include code-block.html
   lang="bash"
   code="npm install
ng serve"
%}
```

**Opcions avançades:**
```jekyll
{% include code-block.html
   lang="typescript"
   filename="src/app/component.ts"
   highlight="1-3,5"
   code="import { Component } from '@angular/core';

@Component({
  selector: 'app-my-component'
})
export class MyComponent { }"
%}
```

### 🤖 Prompt per IA:
```jekyll
{% include prompt-ai.html
   contingut="<strong>🤖 Prompt per IA:</strong>
<p>Text del prompt amb <em>format HTML</em>...</p>"
%}
```

### ⚠️ Error:
```jekyll
{% include error.html
   contingut="Error: ng command not found després d'instal·lar Angular CLI."
%}
```

### ✅ Solució:
```jekyll
{% include solucio.html
   contingut="Reinicia el terminal o executa source ~/.bashrc per actualitzar les variables d'entorn."
%}

{% include solucio.html
   contingut="Alternativament, tanca i obre un nou terminal completament."
%}
```

### 💡 Suggeriment:
```jekyll
{% include suggeriment.html
   contingut="<strong>💡 Suggeriment:</strong> Text del suggeriment amb <code>exemples</code>..."
%}
```

### ✅ Checklist:
```jekyll
{% include checklist.html
   titol="Verificació del Projecte"
   elements="El projecte es crea sense errors|L'aplicació s'executa correctament amb ng serve|Es pot accedir a l'aplicació des del navegador|La recàrrega automàtica funciona en fer canvis"
%}
```

## ❌ QUÈ NO POTS FER

### **Classes CSS Personalitzades:**
```html
<!-- ❌ PROHIBIT -->
<div class="classe-personalitzada">
<span style="color: red;">
```

### **JavaScript:**
```html
<!-- ❌ PROHIBIT -->
<script>
onclick="algo()"
```

### **Markdown:**
```text
❌ NO USAR MARKDOWN - Només HTML + Components Jekyll:
**text en negreta**
*text cursiva*
```

## 📋 Flux de Treball

1. **Troba el fitxer**: `unitat-X/bloc-Y.html`
2. **Edita HTML + Jekyll**: Contingut educatiu amb components Jekyll
3. **Usa components aprovats**: Només els components Jekyll llistats
4. **Text en HTML**: `<strong>`, `<em>`, `<code>`, `<ul>`, `<li>`, etc.
5. **Estructura en seccions**: Cada secció dins de `<div class="section">`
6. **Guarda i commiteja**: Git guardarà els canvis
7. **Revisió tècnica**: Un tècnic validarà abans de publicar

## 🎨 Exemple Complet

```html
---
layout: default
title: "Bloc X: Títol del Bloc"
description: "Descripció breu del contingut"
keywords: "paraules, clau, separades, per, comes"
unit: 1
block: 1
---

<div class="section">
    <h2 id="introduccio">Introducció</h2>
    
    <p><strong>Angular</strong> és un framework modern amb <em>components</em> reutilitzables.</p>

    {% include info_box.html
       contingut="<strong>💡 Definició:</strong> Un framework proporciona <code>estructura completa</code>."
    %}

    <h3>Característiques</h3>

    <ul>
        <li><strong>TypeScript:</strong> Tipatge fort</li>
        <li><strong>Components:</strong> Reutilitzables</li>
    </ul>

    {% include code-block.html
       lang="bash"
       code="npm install -g @angular/cli
ng version"
    %}

    {% include warning_box.html
       contingut="<strong>⚠️ Important:</strong> Necessites Node.js v18+"
    %}
    
    {% include checklist.html
       titol="Instal·lació de Node.js"
       elements="Descarregar Node.js LTS des de nodejs.org|Executar l'instal·lador seguint les instruccions|Verificar la instal·lació amb node --version|Verificar npm amb npm --version"
    %}
</div>

<div class="section">
    <h2 id="configuracio">Configuració</h2>
    
    <p>Contingut de la segona secció amb <strong>HTML</strong> directe...</p>
    
    {% include success_box.html
       contingut="<strong>✅ Completat:</strong> 
<ul>
<li>✓ Entorn configurat</li>
<li>✓ CLI instal·lat</li>
</ul>"
    %}
</div>
```

## 🆘 Ajuda

**Dubtes sobre contingut:** Contacta l'equip educatiu  
**Problemes tècnics:** Contacta l'equip tècnic  
**Errors de sintaxi:** Revisa aquesta guia

---

## 🔄 Reutilitzar Aquest Sistema per Altres Mòduls

**Per professors que vulguin adaptar aquest sistema per crear nous cursos IOC:**

### Només cal canviar 3 variables al `_config.yml`:

```yaml
# 1. Canviar el cicle i mòdul
cicle_modulo: "VOSTRE_CICLE_MODULO"    # Ex: "SMX_UF1", "DAW_M7", etc.

# 2. Canviar el títol del curs
module_title: "TÍTOL DEL VOSTRE CURS"  # Ex: "Sistemes Operatius Linux"

# 3. Canviar l'autor
authors: 
  - "EL VOSTRE NOM"                     # Pot haver-hi múltiples autors
```

**Això és tot!** El sistema mostrarà automàticament:
- El vostre cicle/mòdul entre claudàtors `[VOSTRE_CICLE_MODULO]`
- El títol del vostre curs a totes les pàgines
- El vostre nom com a autor
- `Institut Obert de Catalunya` com a organització

✅ **Sistema 100% portable** - Funciona en qualsevol URL de GitHub Pages  
✅ **Migració completa** - Tot el contingut es transfereix automàticament  
✅ **Configuració mínima** - Només 3 variables per personalitzar

---
**Recorda:** Només HTML + Components Jekyll. NO Markdown. NO CSS personalitzat.