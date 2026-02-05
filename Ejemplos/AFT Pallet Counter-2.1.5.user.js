// ==UserScript==
// @name         AFT Pallet Counter
// @namespace    http://tampermonkey.net/
// @downloadURL  https://drive.corp.amazon.com/view/chuecc@/Scripts/VLC1/AFT%20Pallet%20Counter.user.js
// @updateURL    https://drive.corp.amazon.com/view/chuecc@/Scripts/VLC1/AFT%20Pallet%20Counter.user.js
// @version      2.1.5
// @description  Contador de Pallets con análisis avanzado de FcSku: Sortable, Bins, Team Lift, y más. Incluye descarga de contenedores y tabla.
// @author       Carlos Vasquez (@Chuecc) 🇻🇪
// @match        *://afttransshipmenthub-eu.aka.amazon.com/*
// @match        *://afttransshipmenthub-na.aka.amazon.com/*
// @icon         https://drive.corp.amazon.com/view/chuecc@/Scripts/Logo_Script.png
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      dr-sku-dub.amazon.com
// @require      https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .result-container {
            margin: 1px;
            background-color: #f5f5f5;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .buttons-container {
            float: right;
        }

        .buttons-container button {
            margin-right: 10px;
            padding: 10px;
            background-color: #4CAF50;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 14px;
        }

        #sos-button {
            background-color: #008CBA;
            border-radius: 4px;
        }

        #csv-button {
            background-color: #4CAF50;
            border-radius: 4px;
        }

        .buttons-container button:hover {
            opacity: 0.8;
        }

        /* Contenedor para la fecha formateada SBD */
        .sbd-formatted-container {
            margin-left: 10px;
            display: inline-block;
        }

        /* Estilos para el separador de color SBD */
        .sbd-color-badge {
            display: inline-block;
            font-weight: bold;
            padding: 4px 12px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
        }

        /* Estilos para el texto del día de la semana */
        .sbd-day-text {
            color: #000000;
            font-size: 14px;
            font-weight: normal;
        }

        /* Estilos para los separadores */
        .sbd-separator {
            color: #666;
            font-size: 14px;
            margin: 0 4px;
        }

        /* Texto de la fecha formateada */
        .sbd-formatted-date {
            color: #000000;
            font-size: 14px;
        }

        /* Colores de fondo por día de la semana - EDITABLES */
        .sbd-day-lunes {
            background-color: #FF8C00; /* Naranja */
        }

        .sbd-day-martes {
            background-color: #FF69B4; /* Rosa */
        }

        .sbd-day-miercoles {
            background-color: #32CD32; /* Verde */
        }

        .sbd-day-jueves {
            background-color: #1E90FF; /* Azul */
        }

        .sbd-day-viernes {
            background-color: #FFD700; /* Amarillo */
            color: #000000; /* Texto negro para mejor contraste con amarillo */
        }

        .sbd-day-sabado {
            background-color: #9370DB; /* Morado */
        }

        .sbd-day-domingo {
            background-color: #FF0000; /* Rojo */
        }

        /* ================================= */
        /* ESTILOS PARA MODAL DE ANÁLISIS    */
        /* ================================= */
        
        .analysis-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9998;
            display: none;
        }

        .analysis-modal {
            position: fixed;
            top: 10vh;
            left: 50%;
            transform: translateX(-50%) scale(1.2);
            background-color: white;
            border-radius: 0.625rem;
            box-shadow: 0 0.25rem 1.25rem rgba(0, 0, 0, 0.3);
            z-index: 9999;
            width: 90vw;
            max-width: 75rem;
            max-height: calc(90vh - 10vh);
            display: none;
            flex-direction: column;
            overflow: hidden;
        }

        .analysis-modal-header {
            padding: 1.25rem;
            border-bottom: 0.125rem solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #21303f 0%, #063b66 100%);
            color: white;
            border-radius: 0.625rem 0.625rem 0 0;
        }

        .analysis-modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
        }

        .analysis-modal-close {
            background: transparent;
            border: none;
            color: white;
            font-size: 1.75rem;
            cursor: pointer;
            padding: 0;
            width: 1.875rem;
            height: 1.875rem;
            line-height: 1.875rem;
            text-align: center;
            border-radius: 50%;
            transition: background-color 0.3s;
        }

        .analysis-modal-close:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }

        .analysis-tabs {
            display: flex;
            border-bottom: 0.125rem solid #e0e0e0;
            background-color: #f5f5f5;
            padding: 0 1.25rem;
        }

        .analysis-tab {
            padding: 0.9375rem 1.5625rem;
            cursor: pointer;
            border: none;
            background: transparent;
            font-size: 1rem;
            font-weight: 500;
            color: #666;
            border-bottom: 0.1875rem solid transparent;
            transition: all 0.3s;
        }

        .analysis-tab:hover {
            background-color: #e0e0e0;
            color: #333;
        }

        .analysis-tab.active {
            color: #063b66;
            border-bottom-color: #063b66;
            background-color: white;
        }

        .analysis-modal-content {
            padding: 1.25rem;
            overflow-y: auto;
            flex: 1;
            min-height: 0;
            max-height: calc(90vh - 10vh - 8rem);
        }

        .analysis-tab-content {
            display: none;
        }

        .analysis-tab-content.active {
            display: block;
        }

        .progress-container {
            margin: 1.25rem 0;
            padding: 0.9375rem;
            background-color: #f9f9f9;
            border-radius: 0.5rem;
            border: 0.0625rem solid #e0e0e0;
        }

        .progress-bar-container {
            width: 100%;
            height: 1.875rem;
            background-color: #e0e0e0;
            border-radius: 0.9375rem;
            overflow: hidden;
            margin: 0.625rem 0;
            position: relative;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #21303f 0%, #063b66 100%);
            transition: width 0.3s;
            width: 0%;
        }

        .progress-bar-percentage {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #333;
            font-weight: bold;
            font-size: 0.875rem;
            z-index: 10;
            pointer-events: none;
            transition: color 0.2s ease;
        }

        .progress-bar-percentage.on-bar {
            color: white;
            text-shadow: 0 0 0.1875rem rgba(0, 0, 0, 0.5);
        }

        .progress-text {
            text-align: center;
            color: #333;
            font-size: 14px;
            margin-top: 5px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(12.5rem, 1fr));
            gap: 0.9375rem;
            margin: 1.25rem 0;
        }

        .stat-card {
            background: linear-gradient(135deg, #21303f 0%, #063b66 100%);
            color: white;
            padding: 1.25rem;
            border-radius: 0.625rem;
            box-shadow: 0 0.125rem 0.625rem rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: transform 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .stat-card h3 {
            margin: 0 0 0.625rem 0;
            font-size: 0.875rem;
            opacity: 0.9;
        }

        .stat-card .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 0;
        }

        .stat-card .stat-percentage {
            font-size: 0.875rem;
            opacity: 0.8;
            margin-top: 0.3125rem;
        }

        .stat-card.clickable {
            cursor: pointer;
        }

        .stat-card.total {
            background: linear-gradient(135deg, #21303f 0%, #063b66 100%);
        }

        .stat-card.standard {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .stat-card.team-lift {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }

        .stat-card.unsortable {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }

        .stat-card.sortable {
            background: linear-gradient(135deg, #ff9a9e 0%,rgb(204, 92, 169) 100%);
        }

        .stat-card.pout {
            background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
        }

        .asin-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .asin-list-item {
            padding: 0.75rem;
            margin: 0.5rem 0;
            background-color: #f9f9f9;
            border-radius: 0.375rem;
            border-left: 0.25rem solid #063b66;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s;
        }

        .asin-list-item:hover {
            background-color: #e8e8e8;
        }

        .asin-link {
            color: #063b66;
            text-decoration: none;
            font-weight: bold;
            font-size: 1rem;
        }

        .asin-link:hover {
            text-decoration: underline;
            color: #21303f;
        }

        .asin-quantity {
            background-color: #063b66;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 0.75rem;
            font-weight: bold;
            font-size: 0.875rem;
        }

        .section-title {
            font-size: 1.25rem;
            font-weight: bold;
            color: #333;
            margin: 1.25rem 0 0.625rem 0;
            padding-bottom: 0.625rem;
            border-bottom: 0.125rem solid #063b66;
        }

        .bin-section {
            margin: 1.5625rem 0;
            padding: 0.9375rem;
            background-color: #f9f9f9;
            border-radius: 0.5rem;
            border: 0.125rem solid #e0e0e0;
        }

        .bin-section h3 {
            margin: 0 0 0.9375rem 0;
            color: #063b66;
            font-size: 1.125rem;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        }

        .bin-collapse-icon {
            font-size: 14px;
            transition: transform 0.3s;
        }

        .bin-collapse-icon.collapsed {
            transform: rotate(-90deg);
        }

        .bin-list {
            display: block;
            overflow: visible;
            transition: all 0.3s ease-out;
            opacity: 1;
        }

        .bin-list.collapsed {
            display: none;
            opacity: 0;
        }

        .bins-kpi-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 0.9375rem;
            margin-bottom: 1.875rem;
            justify-content: center;
        }

        .bin-kpi-card {
            background: linear-gradient(135deg, #21303f 0%, #063b66 100%);
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 8rem;
            width: 11.25rem;
            flex-shrink: 0;
        }

        .bin-kpi-card .bin-icon {
            width: 2.64rem;
            height: 2.64rem;
            margin-bottom: 0.5rem;
        }

        .bin-kpi-card h4 {
            margin: 0 0 0.5rem 0;
            font-size: 0.875rem;
            opacity: 0.9;
        }

        .bin-kpi-card .value {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0.3125rem 0;
        }

        .bin-kpi-card .subtitle {
            font-size: 0.75rem;
            opacity: 0.8;
        }

        .error-message {
            background-color: #ffebee;
            color: #c62828;
            padding: 0.9375rem;
            border-radius: 0.5rem;
            margin: 0.625rem 0;
            border-left: 0.25rem solid #c62828;
        }

        .retry-button {
            background-color: #063b66;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.3125rem;
            cursor: pointer;
            font-size: 0.875rem;
            margin-top: 0.625rem;
        }

        .retry-button:hover {
            background-color: #21303f;
        }

        #analyze-button {
            background-color: #063b66;
            border-radius: 4px;
            margin-left: 10px;
        }

        #analyze-button-small {
            background-color: #063b66;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 10px;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        #analyze-button-small:hover {
            background-color: #21303f;
        }

        .empty-state {
            text-align: center;
            padding: 2.5rem;
            color: #999;
        }

        .empty-state-icon {
            font-size: 3rem;
            margin-bottom: 0.625rem;
        }

        .loading-spinner {
            display: inline-block;
            width: 1.25rem;
            height: 1.25rem;
            border: 0.1875rem solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* ================================= */
        /* ESTILOS PARA AFT DOWNLOADER      */
        /* ================================= */
        #aft-descarga-button, #aft-tabla-button {
            padding-top: 15px;
            padding-bottom: 10px;
            padding-left: 15px;
            padding-right: 15px;
            margin: 0;
            color: #777;
            background-color: transparent;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: normal;
            text-decoration: none;
            display: block;
            transition: color 0.3s;
            line-height: 20px;
            vertical-align: middle;
        }

        #aft-descarga-button:hover {
            color: #337ab7;
        }

        #aft-descarga-button:disabled {
            color: #cccccc;
            cursor: not-allowed;
            opacity: 0.6;
        }

        #aft-tabla-button:hover {
            color: #337ab7;
        }

        #aft-tabla-button:disabled {
            color: #cccccc;
            cursor: not-allowed;
            opacity: 0.6;
        }

        #aft-progress {
            padding: 8px 12px;
            background-color: #e8f5e9;
            border: 1px solid #4CAF50;
            border-radius: 4px;
            display: none;
            margin-left: 10px;
            white-space: nowrap;
        }

        #aft-progress.active {
            display: inline-block;
        }

        .aft-progress-text {
            margin: 0;
            font-size: 13px;
            color: #333;
            font-weight: normal;
        }

        .aft-progress-stats {
            margin-top: 2px;
            font-size: 11px;
            color: #666;
        }
    `);

    let palletData = [];
    let paxData = [];
    let fluidData = [];
    let vrid = 'NoVRID';
    let fcSkuDataWithQuantity = {}; // Objeto para almacenar ASIN con su cantidad total
    let analysisResults = {}; // Resultados del análisis completo
    let analysisErrors = []; // ASINs con error
    let analysisCompleted = false; // Flag para saber si ya se completó el análisis
    
    // CONFIGURACIÓN DE RENDIMIENTO (EDITABLE)
    const CONCURRENT_REQUESTS = 5; // Número de ASINs a procesar simultáneamente
    
    // CACHE DE REFERENCIAS DOM (OPTIMIZACIÓN)
    const domCache = {
        modal: null,
        overlay: null,
        closeBtn: null,
        tabs: null,
        tabContent: null,
        progressBar: null,
        progressText: null,
        progressStatus: null
    };
    
    // FLAGS DE RENDERING (LAZY LOADING)
    const renderedTabs = {
        overview: false,
        asinsType: false,
        bins: false
    };
    
    // DEBOUNCER PARA MUTATION OBSERVER
    let mutationDebounceTimer = null;
    const MUTATION_DEBOUNCE_MS = 300;

    // =======================================
    // VARIABLES PARA AFT DOWNLOADER
    // =======================================
    let allContenedoresData = [];
    let shipmentIds = [];
    let isProcessing = false;
    let isProcessingTabla = false;

    // =======================================
    // ICONOS SVG PARA BIN-TYPES (EDITABLE)
    // =======================================
    
    const BIN_ICONS = {
        'Barrel': `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20">
            <!-- Generator: Adobe Illustrator 30.1.0, SVG Export Plug-In . SVG Version: 2.1.1 Build 136)  -->
            <g>
                <g>
                <rect x="11.52" y=".66" width=".77" height="12.1" transform="translate(1.8 -2.49) rotate(12.91)" style="fill: #999;"/>
                <rect x="12.08" y=".73" width=".21" height="12.04" transform="translate(1.82 -2.55) rotate(12.91)" style="fill: #efeeed;"/>
                </g>
                <g>
                <rect x="9.55" y="1.09" width=".77" height="12.1" transform="translate(1.85 -2.04) rotate(12.91)" style="fill: #999;"/>
                <rect x="10.12" y="1.15" width=".21" height="12.04" transform="translate(1.86 -2.1) rotate(12.91)" style="fill: #efeeed;"/>
                </g>
                <g>
                <rect x="11.93" y="2.5" width="1.55" height="12.1" transform="translate(2.23 -2.62) rotate(12.91)" style="fill: #6d502f;"/>
                <rect x="13.05" y="2.62" width=".42" height="12.04" transform="translate(2.27 -2.74) rotate(12.91)" style="fill: #564330;"/>
                </g>
                <g>
                <rect x="9.82" y="3.27" width="1.55" height="12.1" transform="translate(2.35 -2.13) rotate(12.91)" style="fill: #6d502f;"/>
                <rect x="10.94" y="3.4" width=".42" height="12.04" transform="translate(2.39 -2.25) rotate(12.91)" style="fill: #564330;"/>
                </g>
                <g>
                <path d="M13.93,7.09v12.91h-7.99V7.09c0-.21.17-.37.37-.37h7.24c.21,0,.37.17.37.37Z" style="fill: #9d7945;"/>
                <path d="M13.93,7.09v12.91h-7.99c6.56-.35,7.61-13.29,7.61-13.29.21,0,.37.17.37.37Z" style="fill: #7f5c32;"/>
                </g>
            </g>
            <rect x="7.7" y="7.75" width="4.15" height="2.54" rx=".68" ry=".68" style="fill: #d1d1d1;"/>
            </svg>`,
        
        'Barrel TL': `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20">
            <!-- Generator: Adobe Illustrator 30.1.0, SVG Export Plug-In . SVG Version: 2.1.1 Build 136)  -->
            <g>
                <g>
                <rect x="11.52" y=".66" width=".77" height="12.1" transform="translate(1.8 -2.49) rotate(12.91)" style="fill: #999;"/>
                <rect x="12.08" y=".73" width=".21" height="12.04" transform="translate(1.82 -2.55) rotate(12.91)" style="fill: #efeeed;"/>
                </g>
                <g>
                <rect x="9.55" y="1.09" width=".77" height="12.1" transform="translate(1.85 -2.04) rotate(12.91)" style="fill: #999;"/>
                <rect x="10.12" y="1.15" width=".21" height="12.04" transform="translate(1.86 -2.1) rotate(12.91)" style="fill: #efeeed;"/>
                </g>
                <g>
                <rect x="11.93" y="2.5" width="1.55" height="12.1" transform="translate(2.23 -2.62) rotate(12.91)" style="fill: #6d502f;"/>
                <rect x="13.05" y="2.62" width=".42" height="12.04" transform="translate(2.27 -2.74) rotate(12.91)" style="fill: #564330;"/>
                </g>
                <g>
                <rect x="9.82" y="3.27" width="1.55" height="12.1" transform="translate(2.35 -2.13) rotate(12.91)" style="fill: #6d502f;"/>
                <rect x="10.94" y="3.4" width=".42" height="12.04" transform="translate(2.39 -2.25) rotate(12.91)" style="fill: #564330;"/>
                </g>
                <g>
                <path d="M13.93,7.09v12.91h-7.99V7.09c0-.21.17-.37.37-.37h7.24c.21,0,.37.17.37.37Z" style="fill: #9d7945;"/>
                <path d="M13.93,7.09v12.91h-7.99c6.56-.35,7.61-13.29,7.61-13.29.21,0,.37.17.37.37Z" style="fill: #7f5c32;"/>
                </g>
            </g>
            <rect x="7.7" y="7.75" width="4.15" height="2.54" rx=".68" ry=".68" style="fill: #d1d1d1;"/>
            </svg>`,
        
        'Library Deep': `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20">
                <!-- Generator: Adobe Illustrator 30.1.0, SVG Export Plug-In . SVG Version: 2.1.1 Build 136)  -->
                <g>
                    <rect x="4.65" y="17.68" width="11.64" height="1.04" style="fill: #8cc0e3;"/>
                    <rect x="4.65" y="9.03" width="11.64" height="1.04" style="fill: #8cc0e3;"/>
                    <g>
                    <rect x="16.15" y="8.89" width=".96" height="10.79" style="fill: #8d8d8d;"/>
                    <rect x="4.03" y="8.89" width=".96" height="10.79" style="fill: #8d8d8d;"/>
                    <rect x="16.85" y="8.89" width=".26" height="10.79" style="fill: #606161;"/>
                    <rect x="4.03" y="8.89" width=".26" height="10.79" style="fill: #606161;"/>
                    </g>
                </g>
                <g>
                    <rect x="4.65" y="9.09" width="11.64" height="1.04" style="fill: #8cc0e3;"/>
                    <rect x="4.65" y=".44" width="11.64" height="1.04" style="fill: #8cc0e3;"/>
                    <g>
                    <rect x="16.15" y=".3" width=".96" height="10.79" style="fill: #8d8d8d;"/>
                    <rect x="4.03" y=".3" width=".96" height="10.79" style="fill: #8d8d8d;"/>
                    <rect x="16.85" y=".3" width=".26" height="10.79" style="fill: #606161;"/>
                    <rect x="4.03" y=".3" width=".26" height="10.79" style="fill: #606161;"/>
                    </g>
                </g>
                </svg>`,
        
        'Library Deep TL': `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20">
            <!-- Generator: Adobe Illustrator 30.1.0, SVG Export Plug-In . SVG Version: 2.1.1 Build 136)  -->
            <g>
                <rect x="4.65" y="17.68" width="11.64" height="1.04" style="fill: #8cc0e3;"/>
                <rect x="4.65" y="9.03" width="11.64" height="1.04" style="fill: #8cc0e3;"/>
                <g>
                <rect x="16.15" y="8.89" width=".96" height="10.79" style="fill: #8d8d8d;"/>
                <rect x="4.03" y="8.89" width=".96" height="10.79" style="fill: #8d8d8d;"/>
                <rect x="16.85" y="8.89" width=".26" height="10.79" style="fill: #606161;"/>
                <rect x="4.03" y="8.89" width=".26" height="10.79" style="fill: #606161;"/>
                </g>
            </g>
            <g>
                <rect x="4.65" y="9.09" width="11.64" height="1.04" style="fill: #8cc0e3;"/>
                <rect x="4.65" y=".44" width="11.64" height="1.04" style="fill: #8cc0e3;"/>
                <g>
                <rect x="16.15" y=".3" width=".96" height="10.79" style="fill: #8d8d8d;"/>
                <rect x="4.03" y=".3" width=".96" height="10.79" style="fill: #8d8d8d;"/>
                <rect x="16.85" y=".3" width=".26" height="10.79" style="fill: #606161;"/>
                <rect x="4.03" y=".3" width=".26" height="10.79" style="fill: #606161;"/>
                </g>
            </g>
            </svg>`,
        
        'Half Vertical': `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20">
            <!-- Generator: Adobe Illustrator 30.1.0, SVG Export Plug-In . SVG Version: 2.1.1 Build 136)  -->
            <rect x="2.14" y="16.49" width="15.45" height="1.56" style="fill: #8cc0e3;"/>
            <g>
                <rect x="17.41" y="1.25" width="1.28" height="18.26" style="fill: #8d8d8d;"/>
                <rect x="1.32" y="1.25" width="1.28" height="18.26" style="fill: #8d8d8d;"/>
                <rect x="18.34" y="1.25" width=".34" height="18.26" style="fill: #606161;"/>
                <rect x="1.32" y="1.25" width=".34" height="18.26" style="fill: #606161;"/>
            </g>
            </svg>`,
        
        'Half Vertical TL': `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20">
            <!-- Generator: Adobe Illustrator 30.1.0, SVG Export Plug-In . SVG Version: 2.1.1 Build 136)  -->
            <rect x="2.14" y="16.49" width="15.45" height="1.56" style="fill: #8cc0e3;"/>
            <g>
                <rect x="17.41" y="1.25" width="1.28" height="18.26" style="fill: #8d8d8d;"/>
                <rect x="1.32" y="1.25" width="1.28" height="18.26" style="fill: #8d8d8d;"/>
                <rect x="18.34" y="1.25" width=".34" height="18.26" style="fill: #606161;"/>
                <rect x="1.32" y="1.25" width=".34" height="18.26" style="fill: #606161;"/>
            </g>
            </svg>`,
        
        'Floor-Pallet': `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20">
            <!-- Generator: Adobe Illustrator 30.1.0, SVG Export Plug-In . SVG Version: 2.1.1 Build 136)  -->
            <g>
                <path d="M10.09,17.02" style="fill: none;"/>
                <path d="M17.08,17.3l-.31,2.09c0,.06-.03.12-.06.17-.07.12-.19.2-.32.23-.03,0-.06,0-.09,0h-.38s-.03,0-.04,0c-.16-.02-.29-.13-.32-.29l-.19-.87c-.04-.18-.2-.31-.39-.31h-3.36c-.19,0-.36.14-.39.33l-.14.86c-.03.16-.16.28-.32.29,0,0-.02,0-.03,0h-1.29s-.02,0-.03,0c-.16-.01-.29-.13-.32-.29l-.14-.86c-.03-.19-.2-.33-.39-.33h-3.36c-.19,0-.35.13-.39.31l-.19.87c-.04.17-.19.29-.36.29h-.38c-.06,0-.13-.01-.18-.04-.15-.06-.27-.2-.3-.37h0s-.31-2.11-.31-2.11c0-.02,0-.03,0-.05,0-.04.01-.07.03-.1.04-.07.12-.13.21-.13h13.5c.09,0,.17.05.21.13.02.03.03.07.03.1,0,.02,0,.03,0,.05Z" style="fill: #333;"/>
                <path d="M17.08,17.25H3.1s.01-.07.03-.1h13.92s.03.07.03.1Z" style="fill: #a8a8a8;"/>
                <path d="M10.25,19.5v.31h-.32v-.31c0-.09.07-.16.16-.16.04,0,.09.02.11.05.03.03.05.07.05.11Z" style="fill: #3d3d3d;"/>
                <path d="M9.74,19.5v.31h-.3s-.02,0-.03,0v-.31c0-.09.07-.16.16-.16.04,0,.09.02.11.05.03.03.05.07.05.11Z" style="fill: #3d3d3d;"/>
                <path d="M10.76,19.5v.31s-.02,0-.03,0h-.3v-.31c0-.09.07-.16.16-.16.04,0,.09.02.11.05.03.03.05.07.05.11Z" style="fill: #3d3d3d;"/>
                <path d="M3.71,19.5v.27c-.15-.06-.27-.2-.3-.37.03-.04.08-.07.13-.07.04,0,.09.02.11.05.03.03.05.07.05.11Z" style="fill: #3d3d3d;"/>
                <path d="M4.22,19.5v.31s-.02,0-.03,0h-.3v-.31c0-.09.07-.16.16-.16.04,0,.09.02.11.05.03.03.05.07.05.11Z" style="fill: #3d3d3d;"/>
                <path d="M16.2,19.5v.31h-.32v-.31c0-.09.07-.16.16-.16.04,0,.09.02.11.05.03.03.05.07.05.11Z" style="fill: #3d3d3d;"/>
                <path d="M16.71,19.5v.07c-.07.12-.19.2-.32.23v-.3c0-.09.07-.16.16-.16.04,0,.09.02.11.05.03.03.05.07.05.11Z" style="fill: #3d3d3d;"/>
                <rect x="3.1" y="6.1" width=".34" height="11.04" style="fill: #1b1c1c;"/>
                <rect x="3.39" y="6.1" width="13.32" height="11.04" style="fill: #3d3d3d;"/>
                <path d="M16.71,6.1S7.68,16.99,3.39,17.15h13.66l-.34-11.04Z" style="fill: #30302f;"/>
                <rect x="16.71" y="6.1" width=".34" height="11.04" style="fill: #1b1c1c;"/>
            </g>
            <g>
                <rect x="11.51" y=".19" width="4.99" height="16.96" style="fill: #9d7945;"/>
                <path d="M16.5.19v16.96h-4.43C15.66,16.35,16.5.19,16.5.19Z" style="fill: #7f5c32;"/>
            </g>
            <g>
                <rect x="1.61" y="8.4" width="16.74" height=".75" transform="translate(.3 17.88) rotate(-84.58)" style="fill: #9d7945;"/>
                <path d="M11.14.48l-1.58,16.66-.66-.06c.61-.73,2.24-16.6,2.24-16.6Z" style="fill: #7f5c32;"/>
            </g>
            <g>
                <rect x=".66" y="8.3" width="16.74" height=".75" transform="translate(-.45 16.85) rotate(-84.58)" style="fill: #9d7945;"/>
                <path d="M10.2.38l-1.58,16.66-.66-.06c.61-.73,2.24-16.6,2.24-16.6Z" style="fill: #7f5c32;"/>
            </g>
            <g>
                <rect x="-.2" y="8.31" width="16.74" height=".75" transform="translate(-1.25 15.99) rotate(-84.58)" style="fill: #9d7945;"/>
                <path d="M9.33.39l-1.58,16.66-.66-.06c.61-.73,2.24-16.6,2.24-16.6Z" style="fill: #7f5c32;"/>
            </g>
            </svg>`,
        
        'POUT': `<svg class="bin-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="24" fill="white" opacity="0.3"/>
            <line x1="20" y1="20" x2="44" y2="44" stroke="white" stroke-width="4" stroke-linecap="round"/>
            <line x1="44" y1="20" x2="20" y2="44" stroke="white" stroke-width="4" stroke-linecap="round"/>
        </svg>`,
        
        'Sin clasificar': `<svg class="bin-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="20" fill="white" opacity="0.3"/>
            <text x="32" y="38" text-anchor="middle" fill="white" font-size="24" font-weight="bold">?</text>
        </svg>`
    };

    // =======================================
    // CONFIGURACIÓN DE REGLAS (EDITABLE)
    // =======================================
    
    const RULES_CONFIG = {
        pout: {
            height_max: 176, // cm - Artículos con altura superior van a POUT
            weight_max: 23,  // kg - Artículos con peso igual o superior van a POUT
            height_weight_combo: { 
                height: 120, // cm
                weight: 15   // kg - Si altura > 120 Y peso >= 15, va a POUT
            }
        },
        team_lift_weight: 15, // kg - Peso >= 15kg es Team Lift
        bins: [
            {
                name: 'Barrel',
                priority: 1,
                conditions: {
                    min_length: 70,
                    max_height: 15,
                    max_width: 15,
                    max_weight: 14.999
                },
                operator: 'AND'
            },
            {
                name: 'Barrel TL',
                priority: 2,
                conditions: {
                    min_length: 70,
                    max_height: 15,
                    max_width: 40,
                    min_weight: 15,
                    max_weight: 22.999
                },
                operator: 'AND'
            },
            {
                name: 'Library Deep',
                priority: 3,
                conditions: {
                    max_weight: 14.999,
                    max_length: 70,
                    max_height: 48,
                    max_width: 48
                },
                operator: 'AND'
            },
            {
                name: 'Library Deep TL',
                priority: 4,
                conditions: {
                    min_weight: 15,
                    max_weight: 22.999,
                    max_length: 70,
                    max_height: 48,
                    max_width: 48
                },
                operator: 'AND'
            },
            {
                name: 'Half Vertical',
                priority: 5,
                conditions: {
                    max_weight: 14.999,
                    max_length: 137,
                    max_width: 76,
                    max_height: 75
                },
                operator: 'AND'
            },
            {
                name: 'Half Vertical TL',
                priority: 6,
                conditions: {
                    min_weight: 15,
                    max_weight: 22.999,
                    max_length: 137,
                    max_width: 76,
                    max_height: 75
                },
                operator: 'AND'
            },
            {
                name: 'Floor-Pallet',
                priority: 7,
                conditions: {
                    max_weight: 22.999
                },
                operator: 'AND',
                custom_check: 'floor_pallet'
            }
        ],
        fc_code: 'VLC1' // Código del Fulfillment Center para la API
    };

    // =======================================
    // FUNCIONES PARA ANÁLISIS DE FcSku/ASIN
    // =======================================

    /**
     * Extrae todos los FcSku de los contenedores CSX con sus cantidades
     */
    function extraerFcSkuConCantidades() {
        const fcSkuMap = {}; // Mapa para sumar cantidades por ASIN
        const processedContainers = new Set(); // Para evitar procesar el mismo contenedor dos veces
        
        // Buscar SOLO contenedores CSX expandidos (IDs que empiezan con "csx" o "csX")
        const allChildrenContainers = document.querySelectorAll('[id$="-children"]');
        const csxContainers = Array.from(allChildrenContainers).filter(container => {
            const id = container.id.toLowerCase();
            return id.startsWith('csx') || id.startsWith('cs');
        });
        
        // Optimizar loop: usar for en lugar de forEach
        for (let i = 0; i < csxContainers.length; i++) {
            const container = csxContainers[i];
            const containerId = container.id;
            
            if (processedContainers.has(containerId)) continue;
            processedContainers.add(containerId);
            
            const containerList = container.querySelector('.container-list');
            if (!containerList) continue;
            
            const itemRows = containerList.querySelectorAll('.row.details:not(.details-header)');
            if (itemRows.length === 0) continue;
            
            // Optimizar loop interno
            for (let j = 0; j < itemRows.length; j++) {
                const row = itemRows[j];
                const fcSkuElement = row.querySelector('.item-fcSku a');
                const quantityElement = row.querySelector('.item-quantity');
                
                if (!fcSkuElement || !quantityElement) continue;
                
                const fcSku = fcSkuElement.innerText.trim();
                const quantityText = quantityElement.innerText.trim();
                const quantity = parseInt(quantityText, 10);
                
                if (isNaN(quantity)) continue;
                
                // Validar que sea un ASIN válido (10 caracteres)
                if (fcSku && fcSku.length === 10) {
                    fcSkuMap[fcSku] = (fcSkuMap[fcSku] || 0) + quantity;
                }
            }
        }
        
        // Calcular total de units
        let totalUnits = 0;
        for (const qty of Object.values(fcSkuMap)) {
            totalUnits += qty;
        }
        
        console.log(`✓ Extracción: ${Object.keys(fcSkuMap).length} ASINs, ${totalUnits} units`);
        
        return fcSkuMap;
    }

    /**
     * Decodifica campos en Base64 recursivamente
     */
    function decodeBase64Field(encodedStr) {
        try {
            const decodedBytes = atob(encodedStr);
            try {
                return JSON.parse(decodedBytes);
            } catch {
                return decodedBytes;
            }
        } catch {
            return encodedStr;
        }
    }

    /**
     * Decodifica recursivamente objetos que puedan contener Base64
     */
    function recursivelyDecode(obj) {
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                return obj.map(item => recursivelyDecode(item));
            } else {
                const newObj = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'string') {
                        newObj[key] = decodeBase64Field(value);
                    } else if (typeof value === 'object') {
                        newObj[key] = recursivelyDecode(value);
                    } else {
                        newObj[key] = value;
                    }
                }
                return newObj;
            }
        }
        return obj;
    }

    /**
     * Extrae datos relevantes de la respuesta de la API
     */
    function extractProductData(asin, product) {
        try {
            const attr = product.attributes;
            if (!attr) {
                return null;
            }

            // Extraer datos necesarios
            const sortableInfo = attr.is_sortable || {};
            const is_sortable = sortableInfo.value !== undefined ? sortableInfo.value : null;
            
            const conveyableInfo = attr.is_conveyable || {};
            const is_conveyable = conveyableInfo.value !== undefined ? conveyableInfo.value : null;
            
            const hazmatInfo = attr.is_hazmat || {};
            const is_hazmat = hazmatInfo.value !== undefined ? hazmatInfo.value : null;
            
            const dimensions = attr.item_dimensions || {};
            const height = parseFloat(dimensions.height?.value || 0);
            const length = parseFloat(dimensions.length?.value || 0);
            const width = parseFloat(dimensions.width?.value || 0);
            
            const weightData = attr.item_weight || {};
            let itemWeight = 0;
            if (weightData.value) {
                itemWeight = typeof weightData.value === 'object' 
                    ? parseFloat(weightData.value.value || 0)
                    : parseFloat(weightData.value);
            }
            
            const itemNameData = attr.item_name || {};
            const itemName = itemNameData.value || '';
            
            const glProductGroup = attr.gl_product_group_localized_name || {};
            const category = glProductGroup.value || '';
            
            return {
                asin: asin,
                is_sortable: is_sortable,
                is_conveyable: is_conveyable,
                is_hazmat: is_hazmat,
                height_cm: height,
                length_cm: length,
                width_cm: width,
                weight_kg: itemWeight,
                item_name: itemName,
                category: category
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Consulta la API DR-SKU-DUB para un ASIN específico
     */
    function consultarAPIParaASIN(asin, fc = RULES_CONFIG.fc_code) {
        return new Promise((resolve, reject) => {
            const url = `https://dr-sku-dub.amazon.com/api/attributes/${fc}/${asin}`;
            
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const jsonData = JSON.parse(response.responseText);
                            const cleanedJson = recursivelyDecode(jsonData);
                            const data = extractProductData(asin, cleanedJson);
                            resolve({ asin, data, error: null });
                        } catch (error) {
                            resolve({ asin, data: null, error: 'Error parseando datos' });
                        }
                    } else {
                        resolve({ asin, data: null, error: `Error ${response.status}` });
                    }
                },
                onerror: function(error) {
                    resolve({ asin, data: null, error: 'Error de red' });
                }
            });
        });
    }

    /**
     * Verifica si un artículo debe ir a POUT
     */
    function shouldGoPOUT(data) {
        const rules = RULES_CONFIG.pout;
        
        // Altura superior a límite
        if (data.height_cm > rules.height_max) {
            return { pout: true, reason: `Altura ${data.height_cm}cm > ${rules.height_max}cm` };
        }
        
        // Peso igual o superior a límite
        if (data.weight_kg >= rules.weight_max) {
            return { pout: true, reason: `Peso ${data.weight_kg}kg >= ${rules.weight_max}kg` };
        }
        
        // Combinación altura y peso
        if (data.height_cm > rules.height_weight_combo.height && 
            data.weight_kg >= rules.height_weight_combo.weight) {
            return { 
                pout: true, 
                reason: `Altura ${data.height_cm}cm > ${rules.height_weight_combo.height}cm Y Peso ${data.weight_kg}kg >= ${rules.height_weight_combo.weight}kg` 
            };
        }
        
        return { pout: false, reason: null };
    }

    /**
     * Determina el tipo de Bin apropiado para un artículo
     */
    function determineBinType(data) {
        const poutCheck = shouldGoPOUT(data);
        if (poutCheck.pout) {
            return { binType: 'POUT', reason: poutCheck.reason };
        }
        
        // Obtener las dimensiones ordenadas de mayor a menor
        const dimensiones = [data.length_cm, data.width_cm, data.height_cm].sort((a, b) => b - a);
        const mayorDimension = dimensiones[0];
        const segundaMayorDimension = dimensiones[1];
        const menorDimension = dimensiones[2];
        
        // Ordenar bins por prioridad
        const sortedBins = [...RULES_CONFIG.bins].sort((a, b) => a.priority - b.priority);
        
        for (const bin of sortedBins) {
            let meetsAllConditions = true;
            
            // Verificar si es Floor-Pallet con lógica especial
            if (bin.custom_check === 'floor_pallet') {
                // Verificar que el peso sea < 23kg (condición base)
                if (data.weight_kg >= 23) continue;
                
                // Condición 1: Mayor dimensión entre 138-175.9 cm
                const condition1 = mayorDimension >= 138 && mayorDimension <= 175.9;
                
                // Condición 2: Segunda dimensión > 76cm (artículos anchos/largos)
                const condition2 = segundaMayorDimension > 76;
                
                // Condición 3: Mayor dimensión > 70cm Y segunda > 70cm (artículos grandes en general)
                const condition3 = mayorDimension > 70 && segundaMayorDimension > 70;
                
                if (condition1) {
                    return { binType: bin.name, reason: `Dimensión mayor ${mayorDimension.toFixed(1)}cm` };
                } else if (condition2) {
                    return { binType: bin.name, reason: `Segunda dimensión ${segundaMayorDimension.toFixed(1)}cm > 76cm` };
                } else if (condition3) {
                    return { binType: bin.name, reason: `Artículo grande: ${mayorDimension.toFixed(1)}×${segundaMayorDimension.toFixed(1)}cm` };
                } else {
                    continue;
                }
            }
            
            // Lógica normal para otros bins
            for (const [key, value] of Object.entries(bin.conditions)) {
                const [comparison, field] = key.split('_');
                let fieldValue;
                
                // Mapear campos
                if (field === 'length') fieldValue = data.length_cm;
                else if (field === 'height') fieldValue = data.height_cm;
                else if (field === 'width') fieldValue = data.width_cm;
                else if (field === 'weight') fieldValue = data.weight_kg;
                
                // Evaluar condición
                if (comparison === 'min') {
                    if (fieldValue < value) meetsAllConditions = false;
                } else if (comparison === 'max') {
                    if (fieldValue > value) meetsAllConditions = false;
                }
            }
            
            if (meetsAllConditions) {
                return { binType: bin.name, reason: 'Cumple condiciones' };
            }
        }
        
        return { binType: 'Sin clasificar', reason: 'No cumple ninguna condición de bin' };
    }

    /**
     * Determina si es Team Lift o Standard
     */
    function determineWeightCategory(data) {
        if (data.weight_kg >= RULES_CONFIG.team_lift_weight) {
            return 'Team Lift';
        }
        return 'Standard';
    }

    /**
     * Analiza todos los FcSku y genera el reporte completo
     */
    async function analizarTodosLosFcSkus(progressCallback) {
        const startTime = Date.now();
        
        console.log('🔍 Extrayendo FcSkus...');
        fcSkuDataWithQuantity = extraerFcSkuConCantidades();
        const asins = Object.keys(fcSkuDataWithQuantity);
        
        if (asins.length === 0) {
            throw new Error('No se encontraron FcSku. Asegúrate de expandir los contenedores CSX.');
        }
        
        console.log(`📡 Consultando API para ${asins.length} ASINs en lotes de ${CONCURRENT_REQUESTS}...`);
        
        analysisResults = {
            totalUnits: 0,
            sortable: { count: 0, units: 0, asins: [] },
            unsortable: { count: 0, units: 0, asins: [] },
            pout: { count: 0, units: 0, asins: [], reasons: {} },
            teamLift: { count: 0, units: 0, asins: [] },
            standard: { count: 0, units: 0, asins: [] },
            bins: {},
            byQuantity: []
        };
        
        analysisErrors = [];
        
        // Inicializar bins
        RULES_CONFIG.bins.forEach(bin => {
            analysisResults.bins[bin.name] = { count: 0, units: 0, asins: [] };
        });
        analysisResults.bins['POUT'] = { count: 0, units: 0, asins: [] };
        analysisResults.bins['Sin clasificar'] = { count: 0, units: 0, asins: [] };
        
        // Calcular total de units
        for (const [asin, qty] of Object.entries(fcSkuDataWithQuantity)) {
            analysisResults.totalUnits += qty;
        }
        
        // Procesar ASINs en lotes paralelos
        let processedCount = 0;
        
        for (let i = 0; i < asins.length; i += CONCURRENT_REQUESTS) {
            // Obtener lote de ASINs
            const batch = asins.slice(i, i + CONCURRENT_REQUESTS);
            
            // Procesar todos los ASINs del lote en paralelo
            const batchPromises = batch.map(asin => consultarAPIParaASIN(asin));
            const batchResults = await Promise.all(batchPromises);
            
            // Procesar resultados del lote
            batchResults.forEach(result => {
                processedCount++;
                const asin = result.asin;
                const quantity = fcSkuDataWithQuantity[asin];
                
                if (progressCallback) {
                    progressCallback(processedCount, asins.length, asin);
                }
                
                if (result.error || !result.data) {
                    analysisErrors.push({ asin, error: result.error || 'Sin datos', quantity });
                    return;
                }
                
                const data = result.data;
                data.quantity = quantity;
                
                // Analizar sortable
                if (data.is_sortable === true) {
                    analysisResults.sortable.count++;
                    analysisResults.sortable.units += quantity;
                    analysisResults.sortable.asins.push(data);
                } else {
                    analysisResults.unsortable.count++;
                    analysisResults.unsortable.units += quantity;
                    analysisResults.unsortable.asins.push(data);
                }
                
                // Analizar POUT y Bins
                const binInfo = determineBinType(data);
                data.binType = binInfo.binType;
                data.binReason = binInfo.reason;
                
                if (binInfo.binType === 'POUT') {
                    analysisResults.pout.count++;
                    analysisResults.pout.units += quantity;
                    analysisResults.pout.asins.push(data);
                    
                    if (!analysisResults.pout.reasons[binInfo.reason]) {
                        analysisResults.pout.reasons[binInfo.reason] = { count: 0, units: 0, asins: [] };
                    }
                    analysisResults.pout.reasons[binInfo.reason].count++;
                    analysisResults.pout.reasons[binInfo.reason].units += quantity;
                    analysisResults.pout.reasons[binInfo.reason].asins.push(data);
                }
                
                if (analysisResults.bins[binInfo.binType]) {
                    analysisResults.bins[binInfo.binType].count++;
                    analysisResults.bins[binInfo.binType].units += quantity;
                    analysisResults.bins[binInfo.binType].asins.push(data);
                }
                
                // Analizar Team Lift vs Standard
                const weightCategory = determineWeightCategory(data);
                data.weightCategory = weightCategory;
                
                if (weightCategory === 'Team Lift') {
                    analysisResults.teamLift.count++;
                    analysisResults.teamLift.units += quantity;
                    analysisResults.teamLift.asins.push(data);
                } else {
                    analysisResults.standard.count++;
                    analysisResults.standard.units += quantity;
                    analysisResults.standard.asins.push(data);
                }
                
                // Agregar a lista ordenada por cantidad
                analysisResults.byQuantity.push(data);
            });
        }
        
        // Ordenar por cantidad descendente
        analysisResults.byQuantity.sort((a, b) => b.quantity - a.quantity);
        
        // Calcular tiempo total
        const endTime = Date.now();
        const totalSeconds = ((endTime - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Completado: ${asins.length} ASINs en ${totalSeconds}s (${(asins.length / totalSeconds).toFixed(1)} ASINs/s)`);
        
        return analysisResults;
    }


    function sumarItems() {
        let palletTotalQty = 0;
        let palletTotalUnits = 0;
        let paxTotalQty = 0;
        let paxTotalUnits = 0;
        let fluidTotalUnits = 0;

        const notYetStowedSection = document.querySelector('#not-yet-stowed');
        const notYetReceivedSection = document.querySelector('#not-yet-received');

        function procesarContenedores(section, estado) {
            const containerRows = section.querySelectorAll('.row.details');

            if (!containerRows.length) {
                console.error(`No se encontraron filas de contenedores en la sección ${estado}`);
                return;
            }

            // Optimizar loop: usar for en lugar de forEach
            for (let i = 0; i < containerRows.length; i++) {
                const row = containerRows[i];
                const scannableIdEl = row.querySelector('.container-scannableId');
                const itemsEl = row.querySelector('.container-items');
                
                if (!scannableIdEl) continue;
                
                const scannableId = scannableIdEl.innerText.trim();
                const itemsText = itemsEl?.innerText.trim() || '0';
                const items = parseInt(itemsText, 10) || 0;
                const scannableIdLower = scannableId.toLowerCase();

                if (scannableIdLower.startsWith('pallet_')) {
                    palletTotalQty++;
                    palletTotalUnits += items;
                    palletData.push({ id: scannableId, items: items, status: estado });
                } else if (scannableIdLower.startsWith('pax')) {
                    paxTotalQty++;
                    paxTotalUnits += items;
                    paxData.push({ id: scannableId, items: items, status: estado });
                } else if (scannableIdLower.startsWith('csx')) {
                    fluidTotalUnits += items;
                    fluidData.push({ id: scannableId, items: items, status: estado });
                }
            }
        }

        if (notYetStowedSection) procesarContenedores(notYetStowedSection, "Not Yet Stowed");
        if (notYetReceivedSection) procesarContenedores(notYetReceivedSection, "Not Yet Received");

        vrid = document.querySelector('#loadId')?.innerText.trim() || 'NoVRID';

        console.log(`Pallet Mix: Qty Pallets ${palletTotalQty} | Units ${palletTotalUnits}`);
        console.log(`Pallet Mono: Qty Pallets ${paxTotalQty} | Units ${paxTotalUnits}`);
        console.log(`Fluid: Units ${fluidTotalUnits}`);

        mostrarResultado(palletTotalQty, palletTotalUnits, paxTotalQty, paxTotalUnits, fluidTotalUnits);
    }

    function mostrarResultado(palletTotalQty, palletTotalUnits, paxTotalQty, paxTotalUnits, fluidTotalUnits) {
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `
            <div class="col-xs-6" style="padding: 0px 10px;">
                <div class="well">
                    <div class="result-container">
                        <div>
                            <p><b>Pallet Mix</b>: Qty Pallets ${palletTotalQty} | Units ${palletTotalUnits}</p>
                            <p><b>Pallet Mono</b>: Qty Pallets ${paxTotalQty} | Units ${paxTotalUnits}</p>
                            <p>
                                <b>Fluid</b>: Units ${fluidTotalUnits} 
                                <span style="color: #999; margin: 0 8px;">|</span>
                                <button id="analyze-button-small" title="Analizar FcSku">Analizar Fluid</button>
                            </p>
                        </div>
                        <div class="buttons-container">
                            <button id="csv-button">CSV</button>
                            <button id="sos-button">SOS</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const targetElement = document.evaluate("//html/body/div[1]/div[4]/div[1]/div[2]/div/div[3]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (targetElement) {
            targetElement.insertAdjacentHTML("beforeend", resultDiv.innerHTML);
        } else {
            console.error("No se pudo encontrar el contenedor de destino.");
            return; // Salir si no se encuentra el contenedor
        }

        document.getElementById('analyze-button-small').addEventListener('click', abrirModalAnalisis);
        document.getElementById('csv-button').addEventListener('click', descargarCSV);
        document.getElementById('sos-button').addEventListener('click', function() {
            copiarDatosSOS(paxTotalQty, palletTotalQty);
        });
    }

    function descargarCSV() {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Contenedor,Unidades,Estado\n";

        palletData.forEach(row => {
            csvContent += `${row.id},${row.items},${row.status}\n`;
        });

        paxData.forEach(row => {
            csvContent += `${row.id},${row.items},${row.status}\n`;
        });

        fluidData.forEach(row => {
            csvContent += `${row.id},${row.items},${row.status}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        const filename = `${vrid}_Pallets.csv`;
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
    }

    function copiarDatosSOS(paxTotalQty, palletTotalQty) {
        // Obtener el SBD del elemento
        const stowByDateElement = document.getElementById('stowByDate');
        const sbd = stowByDateElement ? stowByDateElement.innerText.trim() : 'N/A';
        
        const textoACopiar = `${vrid}\t${paxTotalQty}\t${palletTotalQty}\t${sbd}`;

        const tempElement = document.createElement('textarea');
        tempElement.value = textoACopiar;

        document.body.appendChild(tempElement);
        tempElement.select();
        document.execCommand('copy');

        document.body.removeChild(tempElement);

        console.log('Datos copiados al portapapeles:', textoACopiar);
    }

    // =======================================
    // FUNCIONES PARA EL MODAL DE ANÁLISIS
    // =======================================

    /**
     * Abre el modal y comienza el análisis
     */
    async function abrirModalAnalisis() {
        crearModal();
        mostrarModal();
        
        // Resetear flags de rendering
        renderedTabs.overview = false;
        renderedTabs.asinsType = false;
        renderedTabs.bins = false;
        
        // Si ya se completó el análisis, mostrar resultados directamente
        if (analysisCompleted) {
            // Ocultar pestaña de progreso
            const progressTab = document.querySelector('[data-tab="progress"]');
            if (progressTab) progressTab.style.display = 'none';
            cambiarTab('overview');
            return;
        }
        
        // IMPORTANTE: Reiniciar variables al iniciar nuevo análisis
        fcSkuDataWithQuantity = {};
        analysisResults = {};
        analysisErrors = [];
        analysisCompleted = false;
        
        // Mostrar pestaña de progreso
        const progressTab = document.querySelector('[data-tab="progress"]');
        if (progressTab) progressTab.style.display = 'block';
        cambiarTab('progress');
        
        // Usar cache de referencias DOM
        const progressBar = domCache.progressBar;
        const progressText = domCache.progressText;
        const progressStatus = domCache.progressStatus;
        
        try {
            await analizarTodosLosFcSkus((current, total, asin) => {
                // Usar requestAnimationFrame para actualizaciones suaves
                requestAnimationFrame(() => {
                    const percentage = Math.round((current / total) * 100);
                    if (progressBar) {
                        progressBar.style.width = `${percentage}%`;
                    }
                    if (domCache.progressPercentage) {
                        domCache.progressPercentage.textContent = `${percentage}%`;
                        // Cambiar color cuando la barra está debajo del número (aproximadamente > 50%)
                        if (percentage > 50) {
                            domCache.progressPercentage.classList.add('on-bar');
                        } else {
                            domCache.progressPercentage.classList.remove('on-bar');
                        }
                    }
                    if (progressText) progressText.textContent = `Procesando ${current} de ${total} ASINs`;
                    if (progressStatus) progressStatus.textContent = `Analizando: ${asin}`;
                });
            });
            
            // Análisis completado
            progressStatus.innerHTML = '<strong>✅ Análisis completado</strong>';
            analysisCompleted = true;
            
            // Ocultar pestaña de progreso inmediatamente
            const progressTab = document.querySelector('[data-tab="progress"]');
            if (progressTab) progressTab.style.display = 'none';
            
            renderizarResultados();
            cambiarTab('overview');
            
        } catch (error) {
            progressStatus.innerHTML = `<div class="error-message">
                <strong>❌ Error:</strong> ${error.message}
                <button class="retry-button" onclick="location.reload()">Recargar página</button>
            </div>`;
        }
    }

    /**
     * Crea el modal en el DOM
     */
    function crearModal() {
        // Verificar si ya existe
        if (document.getElementById('analysis-modal-overlay')) {
            return;
        }
        
        const modalHTML = `
            <div class="analysis-modal-overlay" id="analysis-modal-overlay"></div>
            <div class="analysis-modal" id="analysis-modal">
                <div class="analysis-modal-header">
                    <h2>Análisis de Carga Fluid</h2>
                    <button class="analysis-modal-close" id="analysis-modal-close">&times;</button>
                </div>
                <div class="analysis-tabs" id="analysis-tabs-container">
                    <button class="analysis-tab" data-tab="progress" style="display: none;">Progreso</button>
                    <button class="analysis-tab" data-tab="overview">Resumen</button>
                    <button class="analysis-tab" data-tab="asins-type">Asins Type</button>
                    <button class="analysis-tab" data-tab="bins">Bin-Type</button>
                </div>
                <div class="analysis-modal-content">
                    <div class="analysis-tab-content" id="tab-progress">
                        <div class="progress-container">
                            <h3>Analizando FcSkus...</h3>
                            <div class="progress-bar-container">
                                <div class="progress-bar" id="analysis-progress-bar"></div>
                                <span class="progress-bar-percentage" id="analysis-progress-percentage">0%</span>
                            </div>
                            <p class="progress-text" id="analysis-progress-text">Iniciando...</p>
                            <p class="progress-text" id="analysis-progress-status"></p>
                        </div>
                    </div>
                    <div class="analysis-tab-content" id="tab-overview"></div>
                    <div class="analysis-tab-content" id="tab-asins-type"></div>
                    <div class="analysis-tab-content" id="tab-bins"></div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Cachear referencias DOM
        domCache.modal = document.getElementById('analysis-modal');
        domCache.overlay = document.getElementById('analysis-modal-overlay');
        domCache.closeBtn = document.getElementById('analysis-modal-close');
        domCache.tabs = document.getElementById('analysis-tabs-container');
        domCache.tabContent = document.querySelectorAll('.analysis-tab-content');
        domCache.progressBar = document.getElementById('analysis-progress-bar');
        domCache.progressPercentage = document.getElementById('analysis-progress-percentage');
        domCache.progressText = document.getElementById('analysis-progress-text');
        domCache.progressStatus = document.getElementById('analysis-progress-status');
        
        // EVENT DELEGATION: Un solo listener para todos los tabs
        domCache.tabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.analysis-tab');
            if (tab) {
                const tabName = tab.getAttribute('data-tab');
                cambiarTab(tabName);
            }
        });
        
        // Event listeners para cerrar modal
        domCache.closeBtn.addEventListener('click', cerrarModal);
        domCache.overlay.addEventListener('click', cerrarModal);
    }

    /**
     * Muestra el modal
     */
    function mostrarModal() {
        if (domCache.overlay) domCache.overlay.style.display = 'block';
        if (domCache.modal) domCache.modal.style.display = 'flex';
    }

    /**
     * Cierra el modal
     */
    function cerrarModal() {
        if (domCache.overlay) domCache.overlay.style.display = 'none';
        if (domCache.modal) domCache.modal.style.display = 'none';
    }

    /**
     * Cambia de pestaña en el modal (con lazy rendering)
     */
    function cambiarTab(tabName) {
        // Actualizar tabs activas usando cache
        const tabs = domCache.tabs?.querySelectorAll('.analysis-tab') || [];
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        }
        
        // Actualizar contenido activo usando cache
        if (domCache.tabContent) {
            for (let i = 0; i < domCache.tabContent.length; i++) {
                const content = domCache.tabContent[i];
                content.classList.remove('active');
            }
        }
        
        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) {
            targetTab.classList.add('active');
            
            // LAZY RENDERING: Solo renderizar cuando se activa la pestaña
            requestAnimationFrame(() => {
                if (tabName === 'overview' && !renderedTabs.overview) {
                    renderizarOverview();
                    renderedTabs.overview = true;
                } else if (tabName === 'asins-type' && !renderedTabs.asinsType) {
                    renderizarAsinsType();
                    renderedTabs.asinsType = true;
                } else if (tabName === 'bins' && !renderedTabs.bins) {
                    renderizarBins();
                    renderedTabs.bins = true;
                }
            });
        }
    }

    /**
     * Renderiza todos los resultados en el modal
     */
    function renderizarResultados() {
        renderizarOverview();
        renderizarAsinsType();
        renderizarBins();
        
        // Mostrar en consola ASINs sin clasificar
        mostrarSinClasificarEnConsola();
        
        // Mostrar errores en consola si los hay
        if (analysisErrors.length > 0) {
            console.error(`❌ ERRORES: ${analysisErrors.length} ASINs`);
            const errorTable = analysisErrors.map(e => ({
                ASIN: e.asin,
                Error: e.error,
                Units: e.quantity
            }));
            console.table(errorTable);
        }
    }
    
    /**
     * Muestra en consola los ASINs sin clasificar con sus datos
     */
    function mostrarSinClasificarEnConsola() {
        const sinClasificar = analysisResults.bins['Sin clasificar'];
        
        if (sinClasificar && sinClasificar.count > 0) {
            console.warn(`⚠️ SIN CLASIFICAR: ${sinClasificar.count} ASINs (${sinClasificar.units} units)`);
            
            const tableData = sinClasificar.asins.map(item => ({
                ASIN: item.asin,
                Qty: item.quantity,
                Length: item.length_cm.toFixed(1),
                Width: item.width_cm.toFixed(1),
                Height: item.height_cm.toFixed(1),
                Weight: item.weight_kg.toFixed(2),
                TL: item.weightCategory === 'Team Lift' ? 'Sí' : 'No'
            }));
            
            console.table(tableData);
        }
    }

    /**
     * Renderiza la pestaña de Resumen
     */
    function renderizarOverview() {
        const container = document.getElementById('tab-overview');
        const results = analysisResults;
        
        const sortablePercentage = results.totalUnits > 0 
            ? ((results.sortable.units / results.totalUnits) * 100).toFixed(1)
            : 0;
        const unsortablePercentage = results.totalUnits > 0 
            ? ((results.unsortable.units / results.totalUnits) * 100).toFixed(1)
            : 0;
        const teamLiftPercentage = results.totalUnits > 0 
            ? ((results.teamLift.units / results.totalUnits) * 100).toFixed(1)
            : 0;
        const standardPercentage = results.totalUnits > 0 
            ? ((results.standard.units / results.totalUnits) * 100).toFixed(1)
            : 0;
        const poutPercentage = results.totalUnits > 0 
            ? ((results.pout.units / results.totalUnits) * 100).toFixed(1)
            : 0;
        
        container.innerHTML = `
            <h3 class="section-title">Estadísticas Generales</h3>
            <div class="stats-grid">
                <div class="stat-card total">
                    <h3>Total Units</h3>
                    <p class="stat-value">${results.totalUnits}</p>
                    <p class="stat-percentage">${Object.keys(fcSkuDataWithQuantity).length} ASINs únicos</p>
                </div>
                
                <div class="stat-card standard clickable" onclick="window.cambiarATabAsinsType('standard')">
                    <h3>Standard</h3>
                    <p class="stat-value">${results.standard.units}</p>
                    <p class="stat-percentage">${standardPercentage}% (${results.standard.count} ASINs)</p>
                </div>
                
                <div class="stat-card team-lift clickable" onclick="window.cambiarATabAsinsType('teamLift')">
                    <h3>Team Lift</h3>
                    <p class="stat-value">${results.teamLift.units}</p>
                    <p class="stat-percentage">${teamLiftPercentage}% (${results.teamLift.count} ASINs)</p>
                </div>
                
                <div class="stat-card unsortable clickable" onclick="window.cambiarATabAsinsType('unsortable')">
                    <h3>No Sortable</h3>
                    <p class="stat-value">${results.unsortable.units}</p>
                    <p class="stat-percentage">${unsortablePercentage}% (${results.unsortable.count} ASINs)</p>
                </div>
                
                <div class="stat-card sortable clickable" onclick="window.cambiarATabAsinsType('sortable')">
                    <h3>Sortable</h3>
                    <p class="stat-value">${results.sortable.units}</p>
                    <p class="stat-percentage">${sortablePercentage}% (${results.sortable.count} ASINs)</p>
                </div>
                
                <div class="stat-card pout clickable" onclick="window.cambiarATabAsinsType('pout')">
                    <h3>POUT</h3>
                    <p class="stat-value">${results.pout.units}</p>
                    <p class="stat-percentage">${poutPercentage}% (${results.pout.count} ASINs)</p>
                </div>
            </div>
            
            <h3 class="section-title">Artículos Prohibidos - POUT</h3>
            <div class="bin-section">
                <p><strong>Total POUT:</strong> ${results.pout.units} units (${results.pout.count} ASINs)</p>
                ${Object.entries(results.pout.reasons).map(([reason, data]) => `
                    <div class="asin-list-item">
                        <span>${reason}</span>
                        <span class="asin-quantity">${data.units} units (${data.count} ASINs)</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Renderiza la pestaña Asins Type
     */
    function renderizarAsinsType(filtroInicial = null) {
        const container = document.getElementById('tab-asins-type');
        const results = analysisResults;
        
        const categorias = [
            { key: 'teamLift', nombre: 'Team Lift', asins: results.teamLift.asins, units: results.teamLift.units },
            { key: 'standard', nombre: 'Standard', asins: results.standard.asins, units: results.standard.units },
            { key: 'sortable', nombre: 'Sortable', asins: results.sortable.asins, units: results.sortable.units },
            { key: 'pout', nombre: 'Problem Out (POUT)', asins: results.pout.asins, units: results.pout.units }
        ];
        
        // Filtrar categorías que tienen unidades > 0
        const categoriasConDatos = categorias.filter(cat => cat.units > 0);
        
        const categoriasHTML = categoriasConDatos.map((cat, index) => {
            const isOpen = filtroInicial === cat.key;
            // Ordenar ASINs por cantidad descendente
            const asinsSorted = [...cat.asins].sort((a, b) => b.quantity - a.quantity);
            
            return `
                <div class="bin-section">
                    <h3 class="bin-header" data-asin-category="${cat.key}" data-index="${index}">
                        <span>${cat.nombre} - ${cat.units} units (${cat.asins.length} ASINs)</span>
                        <span class="bin-collapse-icon ${isOpen ? '' : 'collapsed'}" id="icon-asintype-${index}">▼</span>
                    </h3>
                    <div class="bin-list ${isOpen ? '' : 'collapsed'}" id="list-asintype-${index}">
                        <ul class="asin-list">
                            ${asinsSorted.map(item => `
                                <li class="asin-list-item">
                                    <div>
                                        <a href="https://fcresearch-eu.aka.amazon.com/${RULES_CONFIG.fc_code}/results?s=${item.asin}" 
                                           target="_blank" 
                                           class="asin-link">${item.asin}</a>
                                        <div style="font-size: 11px; color: #666; margin-top: 2px;">
                                            ${item.is_sortable ? 'Sortable' : 'No Sortable'} | 
                                            L:${item.length_cm.toFixed(1)} × W:${item.width_cm.toFixed(1)} × H:${item.height_cm.toFixed(1)} cm | 
                                            ${item.weight_kg.toFixed(2)} kg
                                        </div>
                                    </div>
                                    <span class="asin-quantity">${item.quantity} units</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <h3 class="section-title">Clasificación por Tipo de ASIN</h3>
            ${categoriasHTML}
        `;
        
        // EVENT DELEGATION: Un solo listener para todos los headers
        // Remover listener previo si existe
        const oldHandler = container._asinsTypeClickHandler;
        if (oldHandler) {
            container.removeEventListener('click', oldHandler);
        }
        
        const clickHandler = (e) => {
            const header = e.target.closest('.bin-header');
            if (header) {
                const index = header.getAttribute('data-index');
                if (index !== null) {
                    toggleBinCollapse(`asintype-${index}`);
                }
            }
        };
        
        container._asinsTypeClickHandler = clickHandler;
        container.addEventListener('click', clickHandler);
    }

    /**
     * Renderiza la clasificación por Bins
     */
    function renderizarBins() {
        const container = document.getElementById('tab-bins');
        const bins = analysisResults.bins;
        
        // Filtrar bins con datos
        const binsWithData = Object.entries(bins).filter(([_, data]) => data.count > 0);
        
        // Crear KPIs para cada bin
        const kpisHTML = binsWithData.map(([binName, data]) => {
            const percentage = analysisResults.totalUnits > 0 
                ? ((data.units / analysisResults.totalUnits) * 100).toFixed(1)
                : 0;
            
            const iconSVG = BIN_ICONS[binName] || BIN_ICONS['Sin clasificar'];
            
            return `
                <div class="bin-kpi-card">
                    ${iconSVG}
                    <h4>${binName}</h4>
                    <div class="value">${data.units}</div>
                    <div class="subtitle">${data.count} ASINs (${percentage}%)</div>
                </div>
            `;
        }).join('');
        
        // Crear secciones colapsables para cada bin (inicialmente colapsadas)
        const binsHTML = binsWithData.map(([binName, data], index) => {
            const percentage = analysisResults.totalUnits > 0 
                ? ((data.units / analysisResults.totalUnits) * 100).toFixed(1)
                : 0;
            
            // Ordenar ASINs por cantidad descendente
            const asinsSorted = [...data.asins].sort((a, b) => b.quantity - a.quantity);
            
            return `
                <div class="bin-section">
                    <h3 class="bin-header" data-bin-index="${index}">
                        <span>${binName} - ${data.units} units (${data.count} ASINs)</span>
                        <span class="bin-collapse-icon collapsed" id="icon-bin-${index}">▼</span>
                    </h3>
                    <div class="bin-list collapsed" id="list-bin-${index}">
                        <ul class="asin-list">
                            ${asinsSorted.map(item => `
                                <li class="asin-list-item">
                                    <div>
                                        <a href="https://fcresearch-eu.aka.amazon.com/${RULES_CONFIG.fc_code}/results?s=${item.asin}" 
                                           target="_blank" 
                                           class="asin-link">${item.asin}</a>
                                        <div style="font-size: 11px; color: #666; margin-top: 2px;">
                                            L:${item.length_cm.toFixed(1)} × W:${item.width_cm.toFixed(1)} × H:${item.height_cm.toFixed(1)} cm | ${item.weight_kg.toFixed(2)} kg
                                        </div>
                                    </div>
                                    <span class="asin-quantity">${item.quantity} units</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <h3 class="section-title">Clasificación por Bin-Type</h3>
            <div class="bins-kpi-grid">
                ${kpisHTML}
            </div>
            ${binsHTML}
        `;
        
        // EVENT DELEGATION: Un solo listener para todos los headers
        // Remover listener previo si existe
        const oldHandler = container._binsClickHandler;
        if (oldHandler) {
            container.removeEventListener('click', oldHandler);
        }
        
        const clickHandler = (e) => {
            const header = e.target.closest('.bin-header');
            if (header) {
                const index = header.getAttribute('data-bin-index');
                if (index !== null) {
                    toggleBinCollapse(`bin-${index}`);
                }
            }
        };
        
        container._binsClickHandler = clickHandler;
        container.addEventListener('click', clickHandler);
    }

    /**
     * Toggle collapse de bin list
     */
    function toggleBinCollapse(binId) {
        const list = document.getElementById(`list-${binId}`);
        const icon = document.getElementById(`icon-${binId}`);
        
        if (list && icon) {
            list.classList.toggle('collapsed');
            icon.classList.toggle('collapsed');
        }
    }
    
    // No necesitamos window.toggleBinCollapse ya que ahora es una función local


    /**
     * Cambia a la pestaña Asins Type y expande la categoría seleccionada
     */
    window.cambiarATabAsinsType = function(categoria) {
        cambiarTab('asins-type');
        renderizarAsinsType(categoria);
    };

    function formatearFechaSBD() {
        const stowByDateElement = document.getElementById('stowByDate');
        
        if (!stowByDateElement) {
            return;
        }

        // Verificar si ya se agregó la fecha formateada para evitar duplicados
        if (stowByDateElement.nextElementSibling && stowByDateElement.nextElementSibling.classList.contains('sbd-formatted-container')) {
            return;
        }

        const fechaTexto = stowByDateElement.innerText.trim();
        
        // Parsear la fecha (formato: "2025-12-13 00:00 CET")
        const fechaMatch = fechaTexto.match(/(\d{4})-(\d{2})-(\d{2})/);
        
        if (!fechaMatch) {
            console.error('No se pudo parsear la fecha:', fechaTexto);
            return;
        }

        const año = parseInt(fechaMatch[1], 10);
        const mes = parseInt(fechaMatch[2], 10) - 1; // Los meses en JS son 0-indexados
        const dia = parseInt(fechaMatch[3], 10);

        const fecha = new Date(año, mes, dia);
        
        // Nombres de los días en español
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const diaSemana = diasSemana[fecha.getDay()];
        const nombreMes = meses[fecha.getMonth()];
        const diaMes = fecha.getDate();

        // Formatear fecha: "16 Diciembre 2025" (sin guiones)
        const fechaFormateada = `${diaMes} ${nombreMes} ${año}`;

        // Clase CSS y nombre del color según el día de la semana
        const infoDia = {
            'Lunes': { clase: 'sbd-day-lunes', color: 'Naranja' },
            'Martes': { clase: 'sbd-day-martes', color: 'Rosa' },
            'Miercoles': { clase: 'sbd-day-miercoles', color: 'Verde' },
            'Jueves': { clase: 'sbd-day-jueves', color: 'Azul' },
            'Viernes': { clase: 'sbd-day-viernes', color: 'Amarillo' },
            'Sabado': { clase: 'sbd-day-sabado', color: 'Morado' },
            'Domingo': { clase: 'sbd-day-domingo', color: 'Rojo' }
        };

        const info = infoDia[diaSemana] || { clase: '', color: '' };
        const claseColor = info.clase;
        const nombreColor = info.color;

        // Crear el contenedor principal
        const contenedorElement = document.createElement('span');
        contenedorElement.className = 'sbd-formatted-container';

        // Crear separador inicial
        const separadorInicial = document.createElement('span');
        separadorInicial.className = 'sbd-separator';
        separadorInicial.textContent = '| ';

        // Crear el div con solo el color (ej: "Rosa")
        const colorBadgeElement = document.createElement('div');
        colorBadgeElement.className = `sbd-color-badge ${claseColor}`;
        colorBadgeElement.textContent = nombreColor;

        // Crear el span con el día de la semana como texto normal
        const diaSemanaElement = document.createElement('span');
        diaSemanaElement.className = 'sbd-day-text';
        diaSemanaElement.textContent = ` ${diaSemana}`;

        // Crear separador entre badge/día y fecha
        const separadorMedio = document.createElement('span');
        separadorMedio.className = 'sbd-separator';
        separadorMedio.textContent = ' | ';

        // Crear el span con la fecha formateada (texto negro normal)
        const fechaFormateadaElement = document.createElement('span');
        fechaFormateadaElement.className = 'sbd-formatted-date';
        fechaFormateadaElement.textContent = fechaFormateada;

        // Agregar todos los elementos al contenedor en orden
        contenedorElement.appendChild(separadorInicial);
        contenedorElement.appendChild(colorBadgeElement);
        contenedorElement.appendChild(diaSemanaElement);
        contenedorElement.appendChild(separadorMedio);
        contenedorElement.appendChild(fechaFormateadaElement);

        // Insertar el contenedor después del elemento stowByDate
        stowByDateElement.parentNode.insertBefore(contenedorElement, stowByDateElement.nextSibling);
    }

    function inicializarFechaSBD() {
        // Intentar formatear la fecha inmediatamente
        formatearFechaSBD();

        // Observar cambios en el DOM por si la fecha se actualiza dinámicamente
        // CON DEBOUNCING para evitar ejecuciones excesivas
        const observer = new MutationObserver(function(mutations) {
            // Debounce: cancelar timer anterior y crear uno nuevo
            if (mutationDebounceTimer) {
                clearTimeout(mutationDebounceTimer);
            }
            
            mutationDebounceTimer = setTimeout(() => {
                const stowByDateElement = document.getElementById('stowByDate');
                if (stowByDateElement) {
                    // Si el elemento cambió, actualizar la fecha formateada
                    const fechaFormateadaExistente = stowByDateElement.nextElementSibling;
                    if (fechaFormateadaExistente && fechaFormateadaExistente.classList.contains('sbd-formatted-container')) {
                        fechaFormateadaExistente.remove();
                    }
                    formatearFechaSBD();
                }
            }, MUTATION_DEBOUNCE_MS);
        });

        // Observar cambios en el contenedor padre (con scope limitado)
        const stowByDateElement = document.getElementById('stowByDate');
        if (stowByDateElement && stowByDateElement.parentNode) {
            observer.observe(stowByDateElement.parentNode, {
                childList: true,
                subtree: false, // Solo observar hijos directos, no todo el árbol
                characterData: true
            });
        }
    }

    // =======================================
    // FUNCIONES PARA AFT DOWNLOADER
    // =======================================

    // Función para agregar los botones en el navbar
    function agregarBotonDescarga() {
        // Buscar el elemento "Search Transfers"
        const searchTransferButton = document.querySelector('#searchTransferNavButton');
        if (!searchTransferButton) {
            console.error('No se encontró el botón "Search Transfers"');
            // Fallback: intentar agregar después de un tiempo
            setTimeout(agregarBotonDescarga, 1000);
            return;
        }

        // Crear botón "Download All VRID"
        const li1 = document.createElement('li');
        const button1 = document.createElement('button');
        button1.id = 'aft-descarga-button';
        button1.textContent = 'Download All VRID';
        button1.addEventListener('click', iniciarDescarga);
        li1.appendChild(button1);

        // Crear botón "Download Table"
        const li2 = document.createElement('li');
        const button2 = document.createElement('button');
        button2.id = 'aft-tabla-button';
        button2.textContent = 'Download Table';
        button2.addEventListener('click', iniciarDescargaTabla);
        li2.appendChild(button2);

        // Crear el contenedor de progreso en el navbar
        const liProgress = document.createElement('li');
        const progressDiv = document.createElement('div');
        progressDiv.id = 'aft-progress';
        progressDiv.innerHTML = `
            <div class="aft-progress-text" id="aft-progress-text">Preparando...</div>
            <div class="aft-progress-stats" id="aft-progress-stats"></div>
        `;
        liProgress.appendChild(progressDiv);

        // Insertar los botones y la barra de progreso justo después de "Search Transfers" en el navbar-left
        const parentUl = searchTransferButton.parentElement; // El ul.navbar-left
        if (parentUl) {
            // Insertar el primer botón después de Search Transfers
            parentUl.insertBefore(li1, searchTransferButton.nextSibling);
            // Insertar el segundo botón después del primero
            parentUl.insertBefore(li2, li1.nextSibling);
            // Insertar la barra de progreso después del segundo botón
            parentUl.insertBefore(liProgress, li2.nextSibling);
        } else {
            console.error('No se encontró el contenedor padre (ul.navbar-left)');
        }
    }

    // Función para cambiar el select a "All"
    function cambiarSelectToAll() {
        return new Promise((resolve) => {
            const selectElement = document.querySelector('select[name="inboundTransfersTable_length"]');
            if (selectElement) {
                selectElement.value = '99999';
                selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                console.log("Select cambiado a 'All'");
                // Esperar a que la tabla se actualice
                setTimeout(resolve, 15000);
            } else {
                console.log("Select no encontrado, continuando...");
                setTimeout(resolve, 2000);
            }
        });
    }

    // Función para extraer Shipment Reference IDs de la tabla
    function extraerShipmentReferenceIds() {
        const table = document.querySelector('table');
        if (!table) {
            console.error("No se encontró la tabla");
            return [];
        }

        // Buscar headers de múltiples maneras
        let headers = [];
        
        // Método 1: Buscar en la PRIMERA fila del thead (excluyendo filterRow)
        const thead = table.querySelector('thead');
        if (thead) {
            // Buscar la primera fila que NO sea filterRow
            const firstHeaderRow = thead.querySelector('tr:not(#filterRow)');
            if (firstHeaderRow) {
                headers = Array.from(firstHeaderRow.querySelectorAll('th'));
                if (headers.length === 0) {
                    // Si no hay th, buscar td
                    headers = Array.from(firstHeaderRow.querySelectorAll('td'));
                }
            }
        }
        
        // Método 2: Si no se encontró, buscar en thead > tr > th (excluyendo filterRow)
        if (headers.length === 0) {
            const theadHeaders = table.querySelectorAll('thead tr:not(#filterRow) th');
            if (theadHeaders.length > 0) {
                // Tomar solo la primera fila
                const firstRow = theadHeaders[0].closest('tr');
                if (firstRow) {
                    headers = Array.from(firstRow.querySelectorAll('th'));
                }
            }
        }
        
        // Método 3: Si aún no se encontró, buscar en thead > tr > td (excluyendo filterRow)
        if (headers.length === 0) {
            const theadTdHeaders = table.querySelectorAll('thead tr:not(#filterRow) td');
            if (theadTdHeaders.length > 0) {
                const firstRow = theadTdHeaders[0].closest('tr');
                if (firstRow) {
                    headers = Array.from(firstRow.querySelectorAll('td'));
                }
            }
        }
        
        // Método 4: Si aún no se encontró, buscar en la primera fila de tbody
        if (headers.length === 0) {
            const firstRow = table.querySelector('tbody tr:first-child, tr:first-child');
            if (firstRow && !firstRow.id || firstRow.id !== 'filterRow') {
                headers = Array.from(firstRow.querySelectorAll('th, td'));
            }
        }
        
        // Método 5: Último recurso - buscar todos los th en la tabla (excluyendo filterRow)
        if (headers.length === 0) {
            const allTh = table.querySelectorAll('th:not(#filterRow th)');
            // Tomar solo los de la primera fila que no sea filterRow
            if (allTh.length > 0) {
                const firstRow = allTh[0].closest('tr');
                if (firstRow && firstRow.id !== 'filterRow') {
                    headers = Array.from(firstRow.querySelectorAll('th'));
                }
            }
        }

        console.log(`Headers encontrados: ${headers.length}`);
        headers.forEach((h, i) => {
            console.log(`  [${i}] ${h.textContent.trim()}`);
        });

        let shipmentRefIndex = null;

        // Buscar la columna con variaciones del nombre
        const posiblesNombres = [
            'Shipment Reference Id',
            'Shipment Reference',
            'Shipment Ref',
            'Reference Id',
            'Reference',
            'Shipment ID',
            'ShipmentId',
            'Shipment'
        ];

        headers.forEach((header, index) => {
            const headerText = header.textContent.trim().toLowerCase();
            for (const nombre of posiblesNombres) {
                if (headerText.includes(nombre.toLowerCase())) {
                    shipmentRefIndex = index;
                    console.log(`✓ Columna encontrada en índice ${index}: "${header.textContent.trim()}"`);
                    break;
                }
            }
        });

        if (shipmentRefIndex === null) {
            console.error("No se encontró la columna 'Shipment Reference Id'");
            console.error("Headers disponibles:", headers.map(h => h.textContent.trim()));
            return [];
        }

        // Buscar filas de datos de múltiples maneras
        let rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) {
            // Si no hay tbody, buscar todas las filas tr (excepto la primera si es header)
            rows = table.querySelectorAll('tr');
            // Filtrar la primera fila si parece ser header
            const filteredRows = Array.from(rows).filter((row, index) => {
                if (index === 0) {
                    const cells = row.querySelectorAll('th, td');
                    const hasHeaderCells = Array.from(cells).some(cell => {
                        const text = cell.textContent.trim().toLowerCase();
                        return posiblesNombres.some(nombre => text.includes(nombre.toLowerCase()));
                    });
                    return !hasHeaderCells; // Si la primera fila tiene headers, excluirla
                }
                return true;
            });
            rows = filteredRows;
        }

        console.log(`Filas de datos encontradas: ${rows.length}`);
        const ids = [];

        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length > shipmentRefIndex) {
                const shipmentId = cells[shipmentRefIndex].textContent.trim();
                if (shipmentId && shipmentId.length > 0) {
                    ids.push(shipmentId);
                }
            } else {
                console.warn(`Fila ${rowIndex + 1}: No tiene suficientes celdas (tiene ${cells.length}, necesita ${shipmentRefIndex + 1})`);
            }
        });

        console.log(`✓ Se encontraron ${ids.length} Shipment Reference IDs`);
        if (ids.length > 0) {
            console.log(`Ejemplos: ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''}`);
        }
        return ids;
    }

    // Función para obtener datos de una página usando iframe
    async function obtenerDatosPagina(shipmentId) {
        const url = `https://afttransshipmenthub-eu.aka.amazon.com/VLC1/view-contents/${shipmentId}`;
        console.log(`  → Obteniendo datos de: ${url}`);
        
        return new Promise((resolve) => {
            // Crear iframe oculto
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.position = 'absolute';
            iframe.style.visibility = 'hidden';
            
            document.body.appendChild(iframe);
            
            // Timeout para evitar esperar indefinidamente
            const timeout = setTimeout(() => {
                console.error(`  → Timeout esperando carga del iframe para ${shipmentId}`);
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
                resolve([]);
            }, 30000); // 30 segundos timeout
            
            // Esperar a que el iframe cargue
            iframe.onload = function() {
                // Esperar un poco más para que el JavaScript se ejecute
                setTimeout(() => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        
                        // Verificar si podemos acceder al documento (puede estar bloqueado por X-Frame-Options)
                        if (!iframeDoc || !iframeDoc.body) {
                            throw new Error('No se puede acceder al contenido del iframe (posible bloqueo X-Frame-Options)');
                        }
                        
                        // Extraer Load ID (usar innerText como en el script original)
                        const loadIdElement = iframeDoc.querySelector('#loadId');
                        const loadId = loadIdElement ? (loadIdElement.innerText ? loadIdElement.innerText.trim() : loadIdElement.textContent.trim()) : 'NoVRID';
                        console.log(`  → Load ID: ${loadId}`);

                        // Extraer Stow By Date
                        const stowByDateElement = iframeDoc.querySelector('#stowByDate');
                        const stowByDate = stowByDateElement ? (stowByDateElement.innerText ? stowByDateElement.innerText.trim() : stowByDateElement.textContent.trim()) : 'N/A';
                        console.log(`  → Stow By Date: ${stowByDate}`);

                        const contenedores = [];

                        // Procesar sección "Not Yet Stowed"
                        const notYetStowedSection = iframeDoc.querySelector('#not-yet-stowed');
                        if (notYetStowedSection) {
                            console.log(`  → Sección "Not Yet Stowed" encontrada`);
                            const contenedoresStowed = procesarSeccionDownloader(notYetStowedSection, 'Not Yet Stowed', loadId, stowByDate);
                            contenedores.push(...contenedoresStowed);
                            console.log(`  → Contenedores de "Not Yet Stowed": ${contenedoresStowed.length}`);
                        } else {
                            console.log(`  → Sección "Not Yet Stowed" NO encontrada`);
                        }

                        // Procesar sección "Not Yet Received"
                        const notYetReceivedSection = iframeDoc.querySelector('#not-yet-received');
                        if (notYetReceivedSection) {
                            console.log(`  → Sección "Not Yet Received" encontrada`);
                            const contenedoresReceived = procesarSeccionDownloader(notYetReceivedSection, 'Not Yet Received', loadId, stowByDate);
                            contenedores.push(...contenedoresReceived);
                            console.log(`  → Contenedores de "Not Yet Received": ${contenedoresReceived.length}`);
                        } else {
                            console.log(`  → Sección "Not Yet Received" NO encontrada`);
                        }

                        // Limpiar iframe y timeout
                        clearTimeout(timeout);
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                        
                        resolve(contenedores);
                    } catch (error) {
                        console.error(`  → Error al acceder al contenido del iframe:`, error);
                        clearTimeout(timeout);
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                        resolve([]);
                    }
                }, 4000); // Esperar 4 segundos para que el JS se ejecute completamente
            };
            
            iframe.onerror = function() {
                console.error(`  → Error al cargar el iframe para ${shipmentId}`);
                clearTimeout(timeout);
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
                resolve([]);
            };
            
            // Cargar la URL
            iframe.src = url;
        });
    }

    // Función para procesar una sección de contenedores (renombrada para evitar conflicto)
    function procesarSeccionDownloader(section, estado, loadId, stowByDate) {
        const contenedores = [];
        const containerRows = section.querySelectorAll('.row.details');
        
        console.log(`  → Filas encontradas en sección ${estado}: ${containerRows.length}`);

        containerRows.forEach((row, index) => {
            const scannableIdElement = row.querySelector('.container-scannableId');
            const itemsElement = row.querySelector('.container-items');

            if (!scannableIdElement) {
                console.log(`  → Fila ${index + 1}: No se encontró scannableId`);
                return;
            }

            // Usar innerText como en el script original
            const scannableId = scannableIdElement.innerText ? scannableIdElement.innerText.trim() : scannableIdElement.textContent.trim();
            const itemsText = itemsElement ? (itemsElement.innerText ? itemsElement.innerText.trim() : itemsElement.textContent.trim()) : '0';
            const items = parseInt(itemsText, 10) || 0;

            const scannableIdLower = scannableId.toLowerCase();
            
            console.log(`  → Fila ${index + 1}: ${scannableId} (${items} unidades)`);
            
            // Filtrar por tipo de contenedor
            if (scannableIdLower.startsWith('pallet_') || 
                scannableIdLower.startsWith('pax') || 
                scannableIdLower.startsWith('pavehv')) {
                
                console.log(`  → ✓ Contenedor válido: ${scannableId}`);
                contenedores.push({
                    Contenedor: scannableId,
                    Unidades: items,
                    Estado: estado,
                    'Load ID': loadId,
                    'Stow By Date': stowByDate
                });
            } else {
                console.log(`  → ✗ Contenedor ignorado (no es pallet_/pax/paVEHV): ${scannableId}`);
            }
        });

        return contenedores;
    }

    // Función para actualizar el progreso
    function actualizarProgreso(texto, stats = null) {
        const progressText = document.getElementById('aft-progress-text');
        if (progressText) {
            progressText.textContent = texto;
        }
        const progressStats = document.getElementById('aft-progress-stats');
        if (progressStats && stats) {
            progressStats.textContent = stats;
        }
        console.log(texto);
    }

    // Función principal para iniciar la descarga
    async function iniciarDescarga() {
        if (isProcessing) {
            alert('Ya hay un proceso en ejecución. Por favor espera...');
            return;
        }

        isProcessing = true;
        const button = document.getElementById('aft-descarga-button');
        const progress = document.getElementById('aft-progress');
        
        button.disabled = true;
        progress.classList.add('active');
        allContenedoresData = [];

        try {
            // Paso 1: Extraer Shipment Reference IDs
            actualizarProgreso('Extrayendo Shipment Reference IDs...');
            shipmentIds = extraerShipmentReferenceIds();

            if (shipmentIds.length === 0) {
                const mensajeError = 'No se encontraron Shipment Reference IDs en la tabla.\n\n' +
                    'Posibles causas:\n' +
                    '1. La tabla aún no se ha cargado completamente. Espera unos segundos y vuelve a intentar.\n' +
                    '2. La columna puede tener un nombre diferente. Revisa la consola para ver los headers disponibles.\n' +
                    '3. Asegúrate de estar en la página de "Inbound Transfers".\n\n' +
                    'Revisa la consola del navegador (F12) para más detalles.';
                alert(mensajeError);
                actualizarProgreso('❌ Error: No se encontraron Shipment Reference IDs. Revisa la consola.');
                return;
            }

            actualizarProgreso(`Se encontraron ${shipmentIds.length} shipments. Procesando en paralelo...`);

            // Paso 2: Procesar shipments en lotes paralelos (2-3 a la vez)
            const PARALLEL_LIMIT = 3; // Número de páginas a procesar simultáneamente
            let procesados = 0;
            let contenedoresTotales = 0;

            // Función para procesar un lote de shipments
            async function procesarLote(lote, numeroLote) {
                const promesas = lote.map(async (shipmentId, indexEnLote) => {
                    const indiceGlobal = shipmentIds.indexOf(shipmentId) + 1;
                    const textoProgreso = `Procesando ${indiceGlobal}/${shipmentIds.length}: ${shipmentId.substring(0, 20)}...`;
                    const statsProgreso = `Lote ${numeroLote} | Contenedores encontrados: ${contenedoresTotales}`;
                    actualizarProgreso(textoProgreso, statsProgreso);
                    
                    try {
                        const contenedores = await obtenerDatosPagina(shipmentId);
                        procesados++;
                        contenedoresTotales += contenedores.length;
                        console.log(`  → [${indiceGlobal}/${shipmentIds.length}] Encontrados ${contenedores.length} contenedores (Total: ${contenedoresTotales})`);
                        return contenedores;
                    } catch (error) {
                        console.error(`  → Error procesando ${shipmentId}:`, error);
                        procesados++;
                        return [];
                    }
                });
                
                const resultados = await Promise.all(promesas);
                return resultados.flat();
            }

            // Dividir en lotes y procesar
            const totalLotes = Math.ceil(shipmentIds.length / PARALLEL_LIMIT);
            for (let i = 0; i < shipmentIds.length; i += PARALLEL_LIMIT) {
                const numeroLote = Math.floor(i / PARALLEL_LIMIT) + 1;
                const lote = shipmentIds.slice(i, i + PARALLEL_LIMIT);
                
                actualizarProgreso(
                    `Procesando lote ${numeroLote}/${totalLotes} (${lote.length} shipments en paralelo)...`,
                    `Progreso: ${procesados}/${shipmentIds.length} | Contenedores: ${contenedoresTotales}`
                );
                
                const contenedoresLote = await procesarLote(lote, numeroLote);
                allContenedoresData.push(...contenedoresLote);
                
                // Pequeña pausa entre lotes para no sobrecargar
                if (i + PARALLEL_LIMIT < shipmentIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            // Paso 3: Generar y descargar CSV
            actualizarProgreso(`Generando CSV con ${allContenedoresData.length} contenedores...`);
            descargarCSVContenedores();

            actualizarProgreso(`✅ Completado! Se descargaron ${allContenedoresData.length} contenedores.`);

        } catch (error) {
            console.error('Error durante la descarga:', error);
            alert(`Error: ${error.message}`);
            actualizarProgreso(`❌ Error: ${error.message}`);
        } finally {
            isProcessing = false;
            button.disabled = false;
        }
    }

    // Función para descargar el CSV de contenedores (renombrada para evitar conflicto)
    function descargarCSVContenedores() {
        if (allContenedoresData.length === 0) {
            alert('No hay datos para descargar.');
            return;
        }

        // Preparar headers
        const headers = ['Contenedor', 'Unidades', 'Estado', 'Load ID', 'Stow By Date', 'SBD-DDMMYYYY', 'SBD-DiaSemana'];
        
        // Crear contenido CSV
        let csvContent = headers.map(escapeCSV).join(',') + '\n';

        // Agregar datos
        allContenedoresData.forEach(row => {
            const contenedor = row.Contenedor || '';
            const unidades = row.Unidades || 0;
            const estado = row.Estado || '';
            const loadId = row['Load ID'] || '';
            const stowByDate = row['Stow By Date'] || '';
            const sbdDDMMYYYY = formatearFechaDDMMYYYY(row['Stow By Date']);
            const sbdDiaSemana = obtenerDiaSemana(row['Stow By Date']);
            
            const rowData = [contenedor, unidades, estado, loadId, stowByDate, sbdDDMMYYYY, sbdDiaSemana];
            csvContent += rowData.map(escapeCSV).join(',') + '\n';
        });

        // Generar y descargar archivo
        const fecha = new Date().toISOString().split('T')[0];
        const filename = `AFT_Contenedores_Unificado_${fecha}.csv`;
        
        // Crear blob con BOM UTF-8 para que Excel lo abra correctamente
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Función para escapar valores CSV
    function escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Si contiene comas, comillas o saltos de línea, envolver en comillas
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    // Función para parsear fecha desde diferentes formatos y extraer la fecha
    function parsearFecha(stowByDate) {
        if (!stowByDate || stowByDate === 'N/A' || stowByDate.trim() === '') {
            return null;
        }
        
        const fechaStr = stowByDate.trim();
        let fecha = null;
        
        // Intentar parsear formato YYYY-MM-DD HH:mm CET (ejemplo: 2025-12-14 15:30 CET)
        const formatoISO = /(\d{4})-(\d{2})-(\d{2})/;
        const matchISO = fechaStr.match(formatoISO);
        if (matchISO) {
            const año = parseInt(matchISO[1], 10);
            const mes = parseInt(matchISO[2], 10) - 1; // Los meses en JS son 0-indexed
            const dia = parseInt(matchISO[3], 10);
            fecha = new Date(año, mes, dia);
        } else {
            // Intentar parsear formato DD/MM/YYYY
            const partes = fechaStr.split('/');
            if (partes.length === 3) {
                const dia = parseInt(partes[0], 10);
                const mes = parseInt(partes[1], 10) - 1;
                const año = parseInt(partes[2], 10);
                fecha = new Date(año, mes, dia);
            } else {
                // Intentar parsear como fecha estándar
                fecha = new Date(fechaStr);
            }
        }
        
        // Verificar que la fecha sea válida
        if (fecha && !isNaN(fecha.getTime())) {
            return fecha;
        }
        
        return null;
    }

    // Función para convertir fecha a formato DD/MM/YYYY
    function formatearFechaDDMMYYYY(stowByDate) {
        const fecha = parsearFecha(stowByDate);
        if (!fecha) {
            return '';
        }
        
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses en JS son 0-indexed
        const año = fecha.getFullYear();
        
        return `${dia}/${mes}/${año}`;
    }

    // Función para obtener el día de la semana en español
    function obtenerDiaSemana(stowByDate) {
        const fecha = parsearFecha(stowByDate);
        if (!fecha) {
            return '';
        }
        
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const diaSemana = fecha.getDay();
        return diasSemana[diaSemana];
    }

    // Función para descargar la tabla como XLSX
    async function iniciarDescargaTabla() {
        if (isProcessingTabla) {
            alert('Ya hay un proceso de descarga de tabla en ejecución. Por favor espera...');
            return;
        }

        isProcessingTabla = true;
        const button = document.getElementById('aft-tabla-button');
        const progress = document.getElementById('aft-progress');
        
        button.disabled = true;
        progress.classList.add('active');

        try {
            // Paso 1: Extraer datos de la tabla
            actualizarProgreso('Extrayendo datos de la tabla...');
            const table = document.querySelector('table');
            
            if (!table) {
                alert('No se encontró la tabla en la página.');
                return;
            }

            // Extraer encabezados
            const headers = [];
            const headerRows = table.querySelectorAll('thead tr, th');
            
            if (headerRows.length > 0) {
                // Si hay thead, usar esos headers
                const firstHeaderRow = table.querySelector('thead tr') || table.querySelector('tr');
                const headerCells = firstHeaderRow.querySelectorAll('th, td');
                headerCells.forEach(cell => {
                    const text = (cell.innerText || cell.textContent || '').trim();
                    headers.push(text);
                });
            } else {
                // Si no hay thead, usar la primera fila
                const firstRow = table.querySelector('tbody tr:first-child, tr:first-child');
                if (firstRow) {
                    const cells = firstRow.querySelectorAll('td, th');
                    cells.forEach(cell => {
                        const text = (cell.innerText || cell.textContent || '').trim();
                        headers.push(text);
                    });
                }
            }

            // Extraer filas de datos
            const rows = table.querySelectorAll('tbody tr, tr');
            const tableData = [];
            
            actualizarProgreso(`Procesando ${rows.length} filas...`);

            rows.forEach((row, index) => {
                // Saltar la primera fila si es header
                if (row.closest('thead')) {
                    return;
                }

                const cells = row.querySelectorAll('td, th');
                const rowData = [];
                
                cells.forEach(cell => {
                    const text = (cell.innerText || cell.textContent || '').trim();
                    rowData.push(text);
                });

                // Solo agregar si tiene datos
                if (rowData.length > 0 && rowData.some(cell => cell !== '')) {
                    tableData.push(rowData);
                }

                // Actualizar progreso cada 50 filas
                if ((index + 1) % 50 === 0 || index === rows.length - 1) {
                    const porcentaje = Math.round(((index + 1) / rows.length) * 100);
                    actualizarProgreso(
                        `Procesando... ${index + 1}/${rows.length} filas`,
                        `${porcentaje}% completado`
                    );
                }
            });

            // Paso 2: Crear libro de Excel con ExcelJS
            actualizarProgreso(`Generando archivo XLSX con ${tableData.length} filas...`);
            
            // Verificar que ExcelJS esté disponible
            if (typeof ExcelJS === 'undefined') {
                alert('Error: ExcelJS no está cargado. Por favor recarga la página.');
                return;
            }

            // Crear workbook con ExcelJS
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('AFT_Table');

            // Agregar headers
            if (headers.length > 0) {
                worksheet.addRow(headers);
                
                // Estilizar la fila de encabezados
                const headerRow = worksheet.getRow(1);
                headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                headerRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF4472C4' }
                };
                headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
            }

            // Agregar datos
            tableData.forEach(row => {
                worksheet.addRow(row);
            });

            // Ajustar ancho de columnas
            worksheet.columns.forEach((column, index) => {
                let maxLength = headers[index] ? headers[index].length : 10;
                worksheet.getColumn(index + 1).eachCell({ includeEmpty: false }, (cell) => {
                    const cellValue = cell.value ? String(cell.value).length : 0;
                    if (cellValue > maxLength) {
                        maxLength = cellValue;
                    }
                });
                column.width = Math.min(maxLength + 2, 50); // Máximo 50 caracteres de ancho
            });

            // Paso 3: Descargar archivo
            const fecha = new Date().toISOString().split('T')[0];
            const filename = `AFT_Tabla_${fecha}.xlsx`;
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            actualizarProgreso(`✅ Completado! Se descargaron ${tableData.length} filas en ${filename}.`);

        } catch (error) {
            console.error('Error durante la descarga de la tabla:', error);
            alert(`Error: ${error.message}`);
            actualizarProgreso(`❌ Error: ${error.message}`);
        } finally {
            isProcessingTabla = false;
            button.disabled = false;
        }
    }

    // =======================================
    // INICIALIZACIÓN
    // =======================================
    
    window.addEventListener('load', function() {
        setTimeout(sumarItems, 500);
        setTimeout(inicializarFechaSBD, 500);
        
        // Inicializar AFT Downloader
        function inicializarDownloader() {
            // Esperar a que la página esté lista
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    agregarBotonDescarga();
                    // Cambiar select a "All" automáticamente después de agregar los botones
                    setTimeout(() => {
                        cambiarSelectToAll();
                    }, 3000);
                });
            } else {
                // Si la página ya está cargada, esperar un poco para que la tabla se renderice
                setTimeout(() => {
                    agregarBotonDescarga();
                    // Cambiar select a "All" automáticamente después de agregar los botones
                    setTimeout(() => {
                        cambiarSelectToAll();
                    }, 3000);
                }, 2000);
            }
        }
        
        // Solo inicializar si estamos en la página de inbound transfers
        if (window.location.pathname.includes('/view-transfers/inbound')) {
            inicializarDownloader();
        }
    });

})();
