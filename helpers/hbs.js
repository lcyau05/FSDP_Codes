const Handlebars = require('handlebars');
const moment = require('moment');
Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

// Register an additional helper for inequality
Handlebars.registerHelper('ifNotEquals', function (arg1, arg2, options) {
  return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
});

const formatDate = function (date, targetFormat) {
  return moment(date).utc(true).format(targetFormat);
};

Handlebars.registerHelper('json', function (context) {
  return JSON.stringify(context);
});

module.exports = {
  formatDate,
  customHandlebars: Handlebars
};