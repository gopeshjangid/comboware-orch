var Colors = require('colors');
var Config = require('./config');
var Fs = require('fs');
var Tracer = require('tracer');
const {DB} = require("./database/connection");
const moment = require('moment');

module.exports = {
  logged: function(logName) {
    logDir = (Config.logPath != undefined) ? Config.logPath : 'log',
      timeStamp = (new Date()).toLocaleTimeString();

    if (!Fs.existsSync(logDir)) {
      // Create the directory if it does not exist
      Fs.mkdirSync(logDir);
      Fs.chmodSync(logDir, 0777);
    }

    var logObj = Tracer.console({
      level: (Config.logLevel != undefined) ? Config.logLevel : 'log',
      format: [
        "{{timestamp}} <{{title}}> {{message}} (in {{file}} {{method}}:{{line}})", //default format
        {
          error: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})\nCall Stack:\n{{stack}}" // error format
        }
      ],
      dateformat: "yyyy-mm-dd HH:MM:ss",
      transport: [
        function(data) {
        //   if (Config.Environment == 'prod') {
        //     var d = new Date();
        //     var curr_date = d.getDate();
        //     var curr_month = d.getMonth() + 1; //Months are zero based
        //     var curr_year = d.getFullYear();
        //     var currentDate = curr_month + "-" + curr_date + "-" +
        //       curr_year;
        //     var logToFile = (logName != null && logName !=
        //         'undefined' && logName != "") ?
        //       logName :
        //       currentDate;
        //     Fs.appendFile(logDir + '/' + logToFile + '.log', data.output + '\n', (err) => {
        //       if (err) throw err;
        //     });
        //   } else {
            var logMessage = "";
            var errLocation = '\nPath: ' + data.path + '(Line: ' +
              data.line + ' Pos: ' + data.pos + ')';
            switch (data.title) {
              case 'debug':
                  logMessage = Colors.blue('Debug:', data.message);
              	break;
              case 'error':
                  logMessage = Colors.red('Error:' + data.message, errLocation);
                break;
              case 'trace':
                  logMessage = Colors.white('ConsoleLog:',data.message, errLocation);
                break;
              case 'info':
              default:
                 logMessage = Colors.green('Info:', data.message);
                break;
            }
            console.log(logMessage);
        //   }
        },
        function(data) {
            if (data.title == 'info' || data.title == 'error' || data.title == 'debug') {
              var message = data.message;
              var errLocation = '\nPath: ' + data.path + '(Line: ' +
                data.line + ' Pos: ' + data.pos + ')';

              if (data.title == 'error') {
                message = message + " " + errLocation;
              } else if (data.title == 'debug') {
                message = message + " " + errLocation;
              } else {
                message = message;
              }

              DB.query(`insert into logs (log_message, log_level) values ('${message}','${data?.title}')`, async function (error, results) {
                if (error) throw error;

                return true;
            })	
            }
        }	
      ]	
    });	
    return logObj;	
  }
}
