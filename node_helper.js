/* TfL Bus Atrival Predictions */

/* Magic Mirror
 * Module: MMM-TFL-Arrivals
 * By Ricardo Gonzalez
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start: function () {
    console.log("MMM-TFL-Arrivals helper started ...");
  },
  /* getTimetable()
   * Requests new data from TfL API.
   * Sends data back via socket on succesfull response.
   */
  getTimetable: async function (url) {
    var self = this;

    const { data, status, statusText } = await axios.get(url);
    if (status === 200) {
      if (statusText === "error") {
        self.sendSocketNotification("TFL_ARRIVALS_DATA", { data: null, url });
      } else {
        self.sendSocketNotification("TFL_ARRIVALS_DATA", {
          data,
          url,
        });
      }
    } else {
      self.sendSocketNotification("TFL_ARRIVALS_DATA", { data: null, url });
    }
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function (notification, payload) {
    if (notification === "GET_TFL_ARRIVALS_DATA") {
      this.getTimetable(payload.url);
    }
  },
});
