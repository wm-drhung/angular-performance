'use strict';

var Rickshaw = require('rickshaw');
var $ = require('jquery');
var _ = require('lodash');

require('jquery-ui');

var
  _UPDATE_INTERVAL = 1000,
  _COLOR_PALETTE = new Rickshaw.Color.Palette( { scheme: 'classic9' }),

  _registry = null,
  _mainPlotsSettings = [],

  Plots = {};

/**
 * Initializes the registry reference.
 *
 * @param registry
 */
Plots.initRegistry = function(registry){
  _registry = registry;
};

/**
 * Sets the different plots of the panel
 *
 * @param {Object[]} settingsArray - Array of settings
 */
Plots.setMainPlotsSettings = function(settingsArray){
  _mainPlotsSettings = settingsArray;
};

/**
 * Builds the plots on the main page
 */
Plots.buildMainPlots = function(){

  _.forEach(_mainPlotsSettings, function(plot){

    // Controls of the start en end date
    if (plot.pauseButton && plot.liveButton) {
      $(plot.liveButton).click(function () {
        plot.live = true;
        $(plot.pauseButton).removeClass('active');
        $(plot.liveButton).addClass('active');
        plot.updateFunction();
      });

      $(plot.pauseButton).click(function () {
        plot.live = false;
        $(plot.liveButton).removeClass('active');
        $(plot.pauseButton).addClass('active');
      });
    }

    // Graph instantiation
    plot.instance = new Rickshaw.Graph({
      element: document.getElementById(plot.id),
      renderer: (plot.renderer) ? plot.renderer : 'line',
      stroke: true,
      preserve: true,
      series: [
        {
          color: _COLOR_PALETTE.color(),
          data:  plot.dataFunction(),
          name: plot.plotName
        }
      ]
    });

    plot.slider = new Rickshaw.Graph.RangeSlider.Preview({
      graph: plot.instance,
      element: document.getElementById(plot.rangeSliderId)
    });

    plot.instance.render();

    if (plot.eventTimelineId) {
      plot.annotator = new Rickshaw.Graph.Annotate({
        graph: plot.instance,
        element: document.getElementById(plot.eventTimelineId)
      });
    }

    if (!plot.xAxis) {
      plot.xAxis = new Rickshaw.Graph.Axis.Time({
        graph: plot.instance,
        timeFixture: new Rickshaw.Fixtures.Time.Local()
      });
    } else {
      plot.xAxis = new Rickshaw.Graph.Axis.X( {
        graph: plot.instance
      });
    }

    plot.xAxis.render();

    plot.yAxis = new Rickshaw.Graph.Axis.Y( {
      graph: plot.instance,
      tickFormat: Rickshaw.Fixtures.Number.formatKMBT
    });

    plot.yAxis.render();

    plot.updateFunction = function(){

      if (plot.eventTimelineId) {
        _.forEach(_registry.getLastEventAnnotatorData(plot.id), function (event) {
          plot.annotator.add(event.timestamp, event.message);
        });
        plot.annotator.update();
      }
      plot.dataFunction();
      plot.instance.update();

      if (plot.callback){
        plot.callback();
      }

      if (plot.live) {
        setTimeout(plot.updateFunction, _UPDATE_INTERVAL);
      }
    };

    plot.updateFunction();
  });
};

module.exports = Plots;
