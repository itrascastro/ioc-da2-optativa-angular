---
layout: default
title: "Unitat 2: Components Avançats"
description: "Segona unitat del curs d'Angular - Components avançats i aplicació favorits"
sidebar: false
breadcrumb: false
unitat: 2
---

<div class="index-container">
    <h2>Unitat 2: Components Avançats</h2>
    <p>En aquesta unitat aprofundiràs en els components avançats i crearàs una aplicació de favorits.</p>
    
    <ul class="index-list">
        {% for unitat in site.curs.unitats %}
            {% if unitat.numero == 2 %}
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