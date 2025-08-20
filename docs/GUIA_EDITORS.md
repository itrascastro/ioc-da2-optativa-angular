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

    {% include codi.html
       llenguatge="bash"
       contingut="# Exemple de codi
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
{% include codi.html
   llenguatge="bash"
   contingut="npm install
ng serve"
%}
```

### 🤖 Prompt per IA:
```jekyll
{% include prompt-ai.html
   contingut="<strong>🤖 Prompt per IA:</strong>
<p>Text del prompt amb <em>format HTML</em>...</p>"
%}
```

### 🔄 Problema i Solució:
```jekyll
{% include error-solucio.html
   problema="<strong>⚠️ Problema:</strong> Descripció del problema..."
   solucio="<strong>✅ Solució:</strong> Descripció de la solució..."
%}
```

### 💡 Suggeriment:
```jekyll
{% include suggeriment.html
   contingut="<strong>💡 Suggeriment:</strong> Text del suggeriment amb <code>exemples</code>..."
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

    {% include codi.html
       llenguatge="bash"
       contingut="npm install -g @angular/cli
ng version"
    %}

    {% include warning_box.html
       contingut="<strong>⚠️ Important:</strong> Necessites Node.js v18+"
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
**Recorda:** Només HTML + Components Jekyll. NO Markdown. NO CSS personalitzat.