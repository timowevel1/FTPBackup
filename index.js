require("dotenv").config();
const cron = require('node-cron');
const triggerBackup = require("./lib/FTPService");
const writeLog = require("./lib/LogService");
const { envVal } = require('env-bool');


(() => {
    if(envVal(process.env.CRON_ENABLED)){
        writeLog("Recurring backups enabled.");
        if(envVal(process.env.RUN_EVERY_DAY)){
            cron.schedule("0 1 * * *", () => {
                triggerBackup();
            });
        } else if(envVal(process.env.RUN_EVERY_WEEK)){
            cron.schedule("0 1 * * SUN", () => {
                triggerBackup();
            });
        }

    } else {
        writeLog("Recurring backups disabled, so executing one time and then aborting.")
        triggerBackup();
    }
})();