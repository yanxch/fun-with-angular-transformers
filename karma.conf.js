module.exports = function(config) {
  config.set({

      frameworks: ["jasmine", "karma-typescript"],

      files: [
          { pattern: "unsubscribe*.ts" }
      ],

      preprocessors: {
          "unsubscribe*.ts": ["karma-typescript"]
      },

      reporters: ["dots", "karma-typescript"],

      browsers: ["ChromeHeadless"],

      singleRun: true
  });
};