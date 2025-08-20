---
layout: default
title: "Unitat 4: Desplegament"
description: "Quarta unitat del curs d'Angular - Testing i desplegament"
sidebar: false
breadcrumb: false
unitat: 4
---

<div class="index-container">
    <h2>Unitat 4: Desplegament</h2>
    <p>En aquesta darrera unitat aprendràs testing i com desplegar la teva aplicació Angular.</p>
    
    <ul class="index-list">
        {% for unitat in site.curs.unitats %}
            {% if unitat.numero == 4 %}
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