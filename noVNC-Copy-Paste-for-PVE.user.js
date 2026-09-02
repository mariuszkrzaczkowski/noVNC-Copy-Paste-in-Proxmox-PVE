// ==UserScript==
// @name         Copy/paste for noVNC console
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Copy/paste clipboard text into a noVNC console viewer window (for use with Proxmox specifically)
// @author       Mariusz Krzaczkowski
// @license      MIT
// @match        https://*
// @include      /^.*novnc.*/
// @require      http://code.jquery.com/jquery-3.3.1.min.js
// @grant        none
// ==/UserScript==
/* eslint-env jquery */

// Odstęp (ms) między kolejnymi znakami. 1ms bywa zbyt szybkie i część
// zdarzeń jest gubiona/duplikowana - 15-20ms jest zwykle bezpieczniejsze.
const delay = 15

;(function () {
    'use strict'

    // Znaki, które nie mają swojej dosłownej reprezentacji jako "key"
    // w standardzie KeyboardEvent - trzeba je zmapować na nazwę klawisza.
    const specialKeys = {
        "\n": "Enter",
        "\r": "Enter",
        "\t": "Tab",
        "\b": "Backspace"
    }

    // Znaki wymagające Shift (US layout). Wielkie litery + typowe znaki
    // spod Shift na klawiaturze amerykańskiej.
    const shiftChars = /[A-Z!@#$%^&*()_+{}:"<>?~|]/

    function sendKey(el, char) {
        const key = specialKeys[char] || char
        const needsShift = shiftChars.test(char)

        if (needsShift) {
            el.dispatchEvent(new KeyboardEvent("keydown", {
                key: "Shift", code: "ShiftLeft", keyCode: 16, shiftKey: true
            }))
        }

        // keydown i keyup dla właściwego znaku - bez keyup część aplikacji
        // (i sam noVNC bywa) gubi lub "zapamiętuje" klawisz jako wciśnięty.
        el.dispatchEvent(new KeyboardEvent("keydown", { key: key, shiftKey: needsShift }))
        el.dispatchEvent(new KeyboardEvent("keyup",   { key: key, shiftKey: needsShift }))

        if (needsShift) {
            el.dispatchEvent(new KeyboardEvent("keyup", {
                key: "Shift", code: "ShiftLeft", keyCode: 16, shiftKey: false
            }))
        }
    }

    window.sendString = function (text) {
        var el = document.getElementById("canvas-id")
        if (!el) {
            console.warn("noVNC canvas not found - is the page ready?")
            return
        }

        // Normalizacja Windowsowych końców linii (\r\n), żeby Enter nie
        // został wysłany podwójnie dla każdej nowej linii.
        const chars = text.replace(/\r\n/g, "\n").split("")

        // Każdy znak dostaje swój WŁASNY, rosnący opóźnienie - dzięki temu
        // znaki są wysyłane po kolei, a nie wszystkie naraz.
        chars.forEach((x, i) => {
            setTimeout(() => sendKey(el, x), delay * (i + 1))
        })
    }

    console.log("Starting.  ")
    $(document).ready(function () {
        console.log("Starting...... ")
        setTimeout(() => {
            console.log("Starting up noVNC Copy/Paste (for Proxmox)")
            $("canvas").attr("id", "canvas-id")
            $("canvas").on("mousedown", (e) => {
                console.log(e.button)
                if (e.button == 2) { // Right Click
                    e.preventDefault() // nie pokazuj menu kontekstowego przeglądarki
                    navigator.clipboard.readText().then(text => {
                        window.sendString(text)
                    })
                }
            })
            // wyłącz natywne menu kontekstowe na canvasie, żeby prawy klik działał czysto jako "wklej"
            $("canvas").on("contextmenu", (e) => e.preventDefault())
        }, 1000)
    })
})()
