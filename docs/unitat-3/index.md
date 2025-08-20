---
layout: default
title: "Unitat 3: Aplicació Avançada"
description: "Tercera unitat del curs d'Angular - Arquitectura i serveis"
sidebar: false
breadcrumb: false
unitat: 3
---

<div class="index-container">
    <h2>Unitat 3: Aplicació Avançada</h2>
    <p>En aquesta unitat treballaràs amb arquitectura avançada i serveis d'Angular.</p>
    
    <ul class="index-list">
        {% for unitat in site.curs.unitats %}
            {% if unitat.numero == 3 %}
                {% for bloc in unitat.blocs %}
                    <li class="index-item">
                        <a href="{{ bloc.url | relative_url }}" class="index-link">
                            <span class="index-number">{{ bloc.numero }}</span>
                            {{ bloc.nom }}
                        </a>
                    </li>
                {% endfor %}
            {% endif %}
        {% endfor %}
    </ul>
</div>