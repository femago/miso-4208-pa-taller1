(function () {
    'use strict';
    const DB_NAME = "ratp-pwa-db";
    const DB_STORE_NAME = "timetable-os";
    const DB_VERSION = 1;

    var app = {
        isLoading: true,
        visibleCards: {},
        selectedLines: [],
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container')
    };


    /*****************************************************************************
     *
     * Event listeners for UI elements
     *
     ****************************************************************************/

    document.getElementById('butRefresh').addEventListener('click', function () {
        // Refresh all of the forecasts
        app.updateSchedules();
    });

    document.getElementById('butAdd').addEventListener('click', function () {
        // Open/show the add new city dialog
        app.toggleAddDialog(true);
    });

    document.getElementById('butAddCity').addEventListener('click', function () {


        var select = document.getElementById('selectTimetableToAdd');
        var selected = select.options[select.selectedIndex];
        var key = selected.value;
        var label = selected.textContent;
        if (!app.selectedLines) {
            app.selectedLines = [];
        }
        app.getSchedule(key, label);
        app.selectedLines.push({key: key, label: label});
        app.toggleAddDialog(false);
        app.saveSelectedLine({key: key, label: label});
    });

    document.getElementById('butAddCancel').addEventListener('click', function () {
        // Close the add new city dialog
        app.toggleAddDialog(false);
    });


    /*****************************************************************************
     *
     * Methods to update/refresh the UI
     *
     ****************************************************************************/

    // Toggles the visibility of the add new city dialog.
    app.toggleAddDialog = function (visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        } else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };

    // Updates a weather card with the latest weather forecast. If the card
    // doesn't already exist, it's cloned from the template.

    app.updateTimetableCard = function (data) {
        var key = data.key;
        var dataLastUpdated = new Date(data.created);
        var schedules = data.schedules;
        var card = app.visibleCards[key];

        if (!card) {
            var label = data.label.split(', ');
            var title = label[0];
            var subtitle = label[1];
            card = app.cardTemplate.cloneNode(true);
            card.classList.remove('cardTemplate');
            card.querySelector('.label').textContent = title;
            card.querySelector('.subtitle').textContent = subtitle;
            card.removeAttribute('hidden');
            app.container.appendChild(card);
            app.visibleCards[key] = card;
        }
        card.querySelector('.card-last-updated').textContent = data.created;

        var scheduleUIs = card.querySelectorAll('.schedule');
        for (var i = 0; i < 4; i++) {
            var schedule = schedules[i];
            var scheduleUI = scheduleUIs[i];
            if (schedule && scheduleUI) {
                scheduleUI.querySelector('.message').textContent = schedule.message;
            }
        }

        if (app.isLoading) {
            app.spinner.setAttribute('hidden', true);
            app.container.removeAttribute('hidden');
            app.isLoading = false;
        }
    };

    /*****************************************************************************
     *
     * Methods for dealing with the model
     *
     ****************************************************************************/
    app.mapResponseToModel = function (key, label, json) {
        var result = {};
        result.key = key;
        result.label = label;
        result.created = json._metadata.date;
        result.schedules = json.result.schedules;
        return result;
    }

    app.getSchedule = function (key, label) {
        var url = 'https://api-ratp.pierre-grimaud.fr/v3/schedules/' + key;

        if ('caches' in window) {
            /*
             * Check if the service worker has already cached this city's weather
             * data. If the service worker has the data, then display the cached
             * data while the app fetches the latest data.
             */
            caches.match(url).then(function(response) {
                console.log("Match in cache for: "+url);
                if (response) {
                    response.json().then(function updateFromCache(json) {
                        app.updateTimetableCard(app.mapResponseToModel(key,label,json));
                    });
                }
            });
        }

        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    app.updateTimetableCard(app.mapResponseToModel(key,label,response));
                }
            }
        };
        request.open('GET', url);
        request.send();
    };

    var initialStationTimetable = {
        key: 'metros/1/bastille/A',
        label: 'Bastille, Direction La Défense',
        created: '2017-07-18T17:08:42+02:00',
        schedules: [
            {
                message: '0 mn'
            },
            {
                message: '2 mn'
            },
            {
                message: '5 mn'
            }
        ]
    };

    // Iterate all of the cards and attempt to get the latest forecast data
    app.updateSchedules = function () {
        var keys = Object.keys(app.visibleCards);
        keys.forEach(function (key) {
            app.getSchedule(key);
        });
    };

    app.saveSelectedLine = function (timetable) {
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return;
        }

        var request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = function (event) {
            console.log("error " + event);
        };
        request.onsuccess = function (event) {
            var customerObjectStore = event.target.result.transaction(DB_STORE_NAME, "readwrite").objectStore(DB_STORE_NAME);
            customerObjectStore.add(timetable);
        };
    };

    app.listSavedLines = function () {
        var db;

        var request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function () {
            request.result.createObjectStore(DB_STORE_NAME, {keyPath: "key"});
            console.log("db onupgrade");
        };
        request.onsuccess = function () {
            db = request.result;
            console.log("db onsuccess");
            var transaction = db.transaction(DB_STORE_NAME, IDBTransaction.READ_ONLY);
            var objectStore = transaction.objectStore(DB_STORE_NAME);
            var items = [];

            transaction.oncomplete = function (evt) {
                app.initData(items);
            };

            var cursorRequest = objectStore.openCursor();

            cursorRequest.onerror = function (error) {
                console.log(error);
            };

            cursorRequest.onsuccess = function (evt) {
                var cursor = evt.target.result;
                if (cursor) {
                    items.push(cursor.value);
                    cursor.continue();
                }
            };

        };
    }

    var initialWeatherForecast = {
        key: 'metros/1/bastille/A',
        label: 'Bastille, Direction La Défense',
    };

    /************************************************************************
     *
     * Code required to start the app
     *
     * NOTE: To simplify this codelab, we've used localStorage.
     *   localStorage is a synchronous API and has serious performance
     *   implications. It should not be used in production applications!
     *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
     *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
     ************************************************************************/

    app.initData = function (lines) {
        console.log("Loaded Lines: " + lines);
        app.selectedLines = lines;
        if (app.selectedLines.length > 0) {
            console.log('Found Time Tables');
            app.selectedLines.forEach(function (timetable) {
                app.getSchedule(timetable.key, timetable.label);
            });
        } else {
            // The user is using the app for the first time, or the user has not
            // saved any cities
            console.log('No Lines Saved');
            app.getSchedule(initialWeatherForecast.key, initialWeatherForecast.label);
            app.selectedLines = [
                {key: initialWeatherForecast.key, label: initialWeatherForecast.label}
            ];
        }
    }

    app.listSavedLines();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/service-worker.js')
                .then(function() { console.log('Service Worker Registered'); });
        });
    }

})();
