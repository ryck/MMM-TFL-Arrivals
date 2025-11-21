/* Magic Mirror Module: MMM-TFL-Arrivals
 * By Ricardo Gonzalez https://github.com/ryck/MMM-TFL-Arrivals
 * MIT Licensed.
 */
Module.register("MMM-TFL-Arrivals", {
  defaults: {
    app_id: "",
    app_key: "",
    naptanId: "", // StopPoint id
    updateInterval: 60 * 1 * 1000, // Every minute
    animationSpeed: 2000,
    fade: true,
    fadePoint: 0.25, // Start on 1/4th of the list.
    limit: 5,
    lateThreshold: 2,
    initialLoadDelay: 0, // start delay in milliseconds.
    color: true,
    debug: false,
  },
  start: function () {
    Log.log("Starting module: " + this.name);
    if (this.data.classes === "MMM-TFL-Arrivals") {
      this.data.classes = "bright medium";
    }
    // Set up the local values, here we construct the request url to use
    this.apiBase = "https://api.tfl.gov.uk/StopPoint/";
    this.loaded = false;
    this.buses = {};
    this.scheduleUpdate(this.config.initialLoadDelay);
    this.updateTimer = null;
    this.url = encodeURI(
      this.apiBase + this.config.naptanId + "/arrivals" + this.getParams()
    );
    if (this.config.debug) {
      Log.info(this.url);
    }
    this.updateBusInfo();
  },
  // updateBusInfo
  updateBusInfo: function () {
    this.sendSocketNotification("GET_TFL_ARRIVALS_DATA", { url: this.url });
  },
  getStyles: function () {
    return ["MMM-TFL-Arrivals.css", "font-awesome.css"];
  },
  // Define required scripts.
  getScripts: function () {
    return ["moment.js"];
  },
  //Define header for module.
  getHeader: function () {
    return this.config.header;
  },
  // Override dom generator.
  getDom: function () {
    const wrapper = document.createElement("div");

    if (this.config.naptanId === "") {
      wrapper.innerHTML =
        "Please set the station naptan code: " + this.atcocode + ".";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (this.config.app_id === "") {
      wrapper.innerHTML = "Please set the application ID: " + this.app_id + ".";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (this.config.app_key === "") {
      wrapper.innerHTML =
        "Please set the application key: " + this.app_key + ".";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (!this.loaded) {
      wrapper.innerHTML = "Loading bus arrival predictions...";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (this.buses.data !== null) {
      this.config.header = this.buses.data[0].stopName;
    }

    //Dump bus data
    if (this.config.debug) {
      Log.info(this.buses);
    }

    // *** Start Building Table
    const bustable = document.createElement("table");
    bustable.className = "small";

    //If we have departure info
    if (this.buses.data !== null) {
      //Figure out how long the results are
      let counter = this.buses.data.length;

      //See if there are more results than requested and limit if necessary
      if (counter > this.config.limit) {
        counter = this.config.limit;
      }

      for (let t = 0; t < counter; t++) {
        const bus = this.buses.data[t];

        const row = document.createElement("tr");
        bustable.appendChild(row);

        //Route name/Number
        const routeCell = document.createElement("td");
        routeCell.className = "route";
        let icon = "";
        switch (bus.modeName) {
          case "bus":
            routeCell.className += " bus";
            icon = '<i class="fas fa-bus"></i>';
            break;
          case "tube":
            routeCell.className += " tube";
            icon = '<i class="fas fa-subway"></i>';
            break;
        }
        routeCell.innerHTML = icon + bus.routeName + " ";
        row.appendChild(routeCell);

        //Direction Info
        const directionCell = document.createElement("td");
        directionCell.className = "dest";
        directionCell.innerHTML = bus.direction;
        row.appendChild(directionCell);

        //Time Tabled Departure
        const timeTabledCell = document.createElement("td");
        let timeToStation = "";
        timeTabledCell.className = "timeTabled";
        if (bus.timeToStation < 60) {
          timeToStation = "Due";
          if (this.config.color) {
            timeTabledCell.className += " due";
          }
        } else {
          const minutes = Math.floor(bus.timeToStation / 60);
          timeToStation = minutes + (minutes < 2 ? " min" : " mins");
          if (this.config.color && minutes < this.config.lateThreshold) {
            timeTabledCell.className += " late";
          }
        }

        timeTabledCell.innerHTML = timeToStation;
        row.appendChild(timeTabledCell);

        if (this.config.fade && this.config.fadePoint < 1) {
          if (this.config.fadePoint < 0) {
            this.config.fadePoint = 0;
          }
          const startingPoint = this.buses.data.length * this.config.fadePoint;
          const steps = this.buses.data.length - startingPoint;
          if (t >= startingPoint) {
            const currentStep = t - startingPoint;
            row.style.opacity = 1 - (1 / steps) * currentStep;
          }
        }
      }
    } else {
      const row1 = document.createElement("tr");
      bustable.appendChild(row1);

      const messageCell = document.createElement("td");
      messageCell.innerHTML = " " + this.buses.message + " ";
      messageCell.className = "bright";
      row1.appendChild(messageCell);

      const row2 = document.createElement("tr");
      bustable.appendChild(row2);

      const timeCell = document.createElement("td");
      timeCell.innerHTML = " " + this.buses.timestamp + " ";
      timeCell.className = "bright";
      row2.appendChild(timeCell);
    }

    wrapper.appendChild(bustable);
    // *** End building results table

    return wrapper;
  },
  /* processBuses(data)
   * Uses the received data to set the various values into a new array.
   */
  processBuses: function (data) {
    //Check we have data back from API
    if (typeof data !== "undefined" && data !== null && data.length !== 0) {
      if (this.config.debug) {
        Log.info(data);
      }
      //Define object to hold bus data
      this.buses = {};
      //Define array of departure info
      this.buses.data = [];
      //Define timestamp of current data
      this.buses.timestamp = moment().format("LLL");
      //Define message holder
      this.buses.message = null;

      //Figure out how long the results are
      const counter = data.length;

      for (let i = 0; i < counter; i++) {
        const bus = data[i];

        if (this.config.debug) {
          Log.info(
            bus.stationName +
              ", " +
              bus.lineName +
              ", " +
              bus.towards +
              ", " +
              bus.expectedArrival +
              ", " +
              bus.timeToStation +
              ", " +
              bus.modeName
          );
        }
        this.buses.data.push({
          stopName: bus.stationName,
          routeName: bus.lineName,
          direction: bus.destinationName,
          expectedDeparture: bus.expectedArrival,
          timeToStation: bus.timeToStation,
          modeName: bus.modeName,
        });
      }

      this.buses.data.sort(function (a, b) {
        return a.timeToStation - b.timeToStation;
      });
    } else {
      //No data returned - set error message
      this.buses.message = "No data returned";
      this.buses.data = null;
      this.buses.timestamp = moment().format("LLL");
      if (this.config.debug) {
        Log.error("No data returned");
        Log.error(this.buses);
      }
    }

    this.loaded = true;

    this.updateDom(this.config.animationSpeed);
  },
  getParams: function () {
    let params = "?";
    params += "app_id=" + this.config.app_id;
    params += "&app_key=" + this.config.app_key;
    if (this.config.debug) {
      Log.info(params);
    }
    return params;
  },
  /* scheduleUpdate()
   * Schedule next update.
   * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
   */
  scheduleUpdate: function (delay) {
    let nextLoad = this.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      this.updateBusInfo();
    }, nextLoad);
  },
  // Process data returned
  socketNotificationReceived: function (notification, payload) {
    if (notification === "TFL_ARRIVALS_DATA" && payload.url === this.url) {
      this.processBuses(payload.data);
      this.scheduleUpdate(this.config.updateInterval);
    }
  },
});
