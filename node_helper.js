/* TfL Bus Atrival Predictions */

/* Magic Mirror
 * Module: MMM-TFL-Arrivals
 * By Ricardo Gonzalez
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start: function () {
    console.log("MMM-TFL-Arrivals helper started ...");
  },
  /* getTimetable()
   * Requests new data from TfL API.
   * Sends data back via socket on succesfull response.
   */
  getTimetable: async function (url) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        this.sendSocketNotification("TFL_ARRIVALS_DATA", {
          data,
          url,
        });
      } else {
        console.error("MMM-TFL-Arrivals: API returned non-200 status", response.status);
        this.sendSocketNotification("TFL_ARRIVALS_DATA", { data: null, url });
      }
    } catch (error) {
      console.error("MMM-TFL-Arrivals: Error fetching data", error.message);
      this.sendSocketNotification("TFL_ARRIVALS_DATA", { data: null, url });
    }
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function (notification, payload) {
    if (notification === "GET_TFL_ARRIVALS_DATA") {
      this.getTimetable(payload.url);
    }
  },
});
